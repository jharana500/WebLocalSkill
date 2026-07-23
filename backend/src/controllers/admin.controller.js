const prisma = require('../lib/prisma')
const { analyzeDuplicateRisk } = require('../services/companyDuplicateService')
const { buildAuditLog } = require('../services/auditLogService')
const { buildNotification } = require('../services/notificationService')

const REASON_MIN_LENGTH = 5
const REASON_MAX_LENGTH = 1000

const VERIFICATION_TRANSITIONS = {
  PENDING: ['UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'DUPLICATE'],
  UNDER_REVIEW: ['VERIFIED', 'REJECTED', 'DUPLICATE'],
  REJECTED: ['UNDER_REVIEW', 'VERIFIED'],
  DUPLICATE: ['UNDER_REVIEW', 'PENDING', 'VERIFIED'],
  VERIFIED: ['UNDER_REVIEW'],
}

const COMPANY_SORT_WHITELIST = new Set(['createdAt', 'name', 'updatedAt'])

function readableStatus(status) {
  return String(status || '').replace(/_/g, ' ').toLowerCase()
}

function validateReason(reason) {
  const trimmed = String(reason || '').trim()
  if (trimmed.length < REASON_MIN_LENGTH) {
    return { valid: false, message: `Reason must be at least ${REASON_MIN_LENGTH} characters` }
  }
  if (trimmed.length > REASON_MAX_LENGTH) {
    return { valid: false, message: `Reason must be under ${REASON_MAX_LENGTH} characters` }
  }
  return { valid: true, reason: trimmed }
}

// Every verification decision moves CompanyVerification.status, flips
// Company.isVerified, writes an audit log entry, and notifies the owner —
// all inside one transaction so a status change can never persist without
// its audit trail (Phase 4.31).
async function transitionCompanyVerification(req, res, { targetStatus, reason, duplicateOfCompanyId, auditAction, notificationTitle, notificationMessage }) {
  const company = await prisma.company.findUnique({
    where: { id: req.params.id },
    include: { verification: true },
  })
  if (!company) {
    return res.status(404).json({ success: false, message: 'Company not found' })
  }

  const currentStatus = company.verification?.status || 'PENDING'

  if (currentStatus === targetStatus) {
    return res.status(400).json({
      success: false,
      message: `Company is already ${readableStatus(targetStatus)}`,
      errors: [],
    })
  }

  const allowed = VERIFICATION_TRANSITIONS[currentStatus] || []
  if (!allowed.includes(targetStatus)) {
    return res.status(400).json({
      success: false,
      message: `Cannot move a company from ${readableStatus(currentStatus)} to ${readableStatus(targetStatus)}`,
      errors: [],
    })
  }

  const verificationData = {
    status: targetStatus,
    reviewedById: req.user.id,
    reviewedAt: new Date(),
    // Only DUPLICATE ever keeps a duplicateOfCompanyId — every other
    // transition (including restore) clears a stale link automatically.
    duplicateOfCompanyId: targetStatus === 'DUPLICATE' ? duplicateOfCompanyId : null,
    ...(reason !== undefined ? { reviewNotes: reason || null } : {}),
  }

  const isVerified = targetStatus === 'VERIFIED'
  const oldValue = { status: currentStatus, isVerified: company.isVerified }
  const newValue = { status: targetStatus, isVerified }

  await prisma.$transaction([
    prisma.companyVerification.upsert({
      where: { companyId: company.id },
      update: verificationData,
      create: { companyId: company.id, ...verificationData },
    }),
    prisma.company.update({ where: { id: company.id }, data: { isVerified } }),
    buildAuditLog({
      adminId: req.user.id,
      action: auditAction,
      entityType: 'Company',
      entityId: company.id,
      oldValue,
      newValue,
      reason: reason || null,
    }),
    buildNotification({
      userId: company.userId,
      type: 'COMPANY_VERIFICATION',
      title: notificationTitle,
      message: notificationMessage,
      data: { companyId: company.id, status: targetStatus, reason: reason || null },
    }),
  ])

  const updatedCompany = await prisma.company.findUnique({
    where: { id: company.id },
    include: {
      user: { select: { email: true } },
      verification: {
        include: {
          reviewedBy: { select: { id: true, email: true } },
          duplicateOfCompany: { select: { id: true, name: true, isVerified: true } },
        },
      },
    },
  })

  return res.json({
    success: true,
    message: `Company ${readableStatus(targetStatus)} successfully`,
    data: { company: updatedCompany },
  })
}

async function getDashboardStats(req, res) {
  const [
    totalUsers, totalCompanies, totalJobs, totalApplications,
    pendingVerifications, newUsersThisMonth, newJobsThisMonth,
  ] = await Promise.all([
    prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
    prisma.company.count(),
    prisma.job.count(),
    prisma.application.count(),
    prisma.companyVerification.count({ where: { status: 'PENDING' } }),
    prisma.user.count({
      where: {
        role: { not: 'ADMIN' },
        createdAt: { gte: startOfMonth() },
      },
    }),
    prisma.job.count({ where: { createdAt: { gte: startOfMonth() } } }),
  ])

  const recentActivity = await prisma.user.findMany({
    where: { role: { not: 'ADMIN' } },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, email: true, role: true, createdAt: true },
  })

  const pendingVerificationsList = await prisma.companyVerification.findMany({
    where: { status: 'PENDING' },
    take: 5,
    orderBy: { submittedAt: 'desc' },
    include: {
      company: { select: { id: true, name: true, industry: true, district: true } },
    },
  })

  const registrationTrend = await buildMonthlyUserTrend()
  const revenueTrend = buildRevenuePlaceholder()

  res.json({
    stats: {
      totalUsers,
      totalCompanies,
      totalJobs,
      totalApplications,
      pendingVerifications,
      newUsersThisMonth,
      newJobsThisMonth,
    },
    registrationTrend,
    revenueTrend,
    recentActivity: recentActivity.map((u) => ({
      type: 'new_user',
      message: `New ${u.role.toLowerCase().replace('_', ' ')} registered: ${u.email}`,
      time: u.createdAt,
    })),
    pendingVerifications: pendingVerificationsList,
  })
}

async function buildMonthlyUserTrend() {
  const months = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)

    const [users, companies] = await Promise.all([
      prisma.user.count({
        where: { role: 'JOB_SEEKER', createdAt: { gte: start, lte: end } },
      }),
      prisma.user.count({
        where: { role: 'COMPANY', createdAt: { gte: start, lte: end } },
      }),
    ])

    months.push({
      month: start.toLocaleString('default', { month: 'short' }),
      users,
      companies,
    })
  }
  return months
}

function buildRevenuePlaceholder() {
  const months = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    months.push({
      month: date.toLocaleString('default', { month: 'short' }),
      revenue: 0,
    })
  }
  return months
}

function startOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

async function getUsers(req, res) {
  const { page = 1, limit = 20, q, role, status } = req.query
  const skip = (Number(page) - 1) * Number(limit)
  const where = { role: { not: 'ADMIN' } }

  if (q) {
    where.OR = [{ email: { contains: q, mode: 'insensitive' } }]
  }
  if (role && role !== 'all') where.role = role.toUpperCase()
  if (status === 'active') where.isActive = true
  if (status === 'suspended') where.isActive = false

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, role: true, isActive: true, createdAt: true,
        profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
        company: { select: { name: true, logoUrl: true } },
        _count: { select: { applications: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  res.json({
    users,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  })
}

async function getUserById(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      profile: { include: { education: true, experience: true, certifications: true } },
      company: { include: { verification: true } },
      _count: { select: { applications: true, savedJobs: true } },
    },
  })
  if (!user) return res.status(404).json({ message: 'User not found' })
  res.json({ user })
}

async function updateUser(req, res) {
  const { isActive, role } = req.body
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(isActive !== undefined && { isActive }),
      ...(role && { role: role.toUpperCase() }),
    },
  })
  res.json({ user })
}

async function deactivateUser(req, res) {
  await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } })
  res.json({ message: 'User deactivated' })
}

async function activateUser(req, res) {
  await prisma.user.update({ where: { id: req.params.id }, data: { isActive: true } })
  res.json({ message: 'User activated' })
}

async function getCompanies(req, res, next) {
  try {
    const rawPage = Number.parseInt(req.query.page, 10)
    const rawLimit = Number.parseInt(req.query.limit, 10)
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 10
    const { q, status, plan, verificationStatus, duplicateRisk } = req.query
    const sortBy = COMPANY_SORT_WHITELIST.has(req.query.sortBy) ? req.query.sortBy : 'createdAt'
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc'

    const where = {}
    if (q) {
      const term = String(q).trim()
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { industry: { contains: term, mode: 'insensitive' } },
        { district: { contains: term, mode: 'insensitive' } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
        { verification: { registrationNumber: { contains: term, mode: 'insensitive' } } },
        { verification: { panNumber: { contains: term, mode: 'insensitive' } } },
      ]
    }
    if (status && status !== 'all') where.status = status.toUpperCase()
    if (plan && plan !== 'all') where.plan = plan.toUpperCase()
    if (verificationStatus && verificationStatus !== 'all') {
      where.verification = { ...where.verification, status: verificationStatus.toUpperCase() }
    }

    const baseInclude = {
      user: { select: { email: true, createdAt: true } },
      _count: { select: { jobs: true } },
      verification: { select: { status: true, reviewedAt: true } },
    }

    if (!duplicateRisk || duplicateRisk === 'all') {
      const [companies, total] = await Promise.all([
        prisma.company.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: baseInclude,
        }),
        prisma.company.count({ where }),
      ])

      return res.json({
        success: true,
        message: 'Companies fetched successfully',
        data: {
          companies,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      })
    }

    // Risk filtering requires computing a score per candidate — bounded to a
    // sane pool size rather than the whole table, since this is an
    // admin-only, moderate-scale review tool, not a public search endpoint.
    const candidates = await prisma.company.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      include: baseInclude,
      take: 500,
    })

    const annotated = await Promise.all(
      candidates.map(async (company) => {
        const analysis = await analyzeDuplicateRisk(company.id)
        return { ...company, duplicateRiskLevel: analysis?.riskLevel || 'LOW', duplicateRiskScore: analysis?.riskScore || 0 }
      }),
    )

    const filtered = annotated.filter((c) => c.duplicateRiskLevel === duplicateRisk.toUpperCase())
    const total = filtered.length
    const paged = filtered.slice((page - 1) * limit, (page - 1) * limit + limit)

    res.json({
      success: true,
      message: 'Companies fetched successfully',
      data: {
        companies: paged,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (error) {
    next(error)
  }
}

async function getCompanyById(req, res, next) {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { email: true, createdAt: true, isActive: true } },
        jobs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { _count: { select: { applications: true } } },
        },
        verification: {
          include: {
            reviewedBy: { select: { id: true, email: true } },
            duplicateOfCompany: { select: { id: true, name: true, isVerified: true } },
          },
        },
        duplicateFlaggedBy: { select: { id: true, companyId: true } },
        _count: { select: { jobs: true } },
      },
    })
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' })
    }

    const [applicationCount, auditLog] = await Promise.all([
      prisma.application.count({ where: { job: { companyId: company.id } } }),
      prisma.adminAuditLog.findMany({
        where: { entityType: 'Company', entityId: company.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { admin: { select: { id: true, email: true } } },
      }),
    ])

    res.json({
      success: true,
      message: 'Company fetched successfully',
      data: { company, applicationCount, auditLog },
    })
  } catch (error) {
    next(error)
  }
}

async function getCompanyDuplicateCheck(req, res, next) {
  try {
    const analysis = await analyzeDuplicateRisk(req.params.id)
    if (!analysis) {
      return res.status(404).json({ success: false, message: 'Company not found' })
    }
    res.json({ success: true, message: 'Duplicate analysis completed', data: analysis })
  } catch (error) {
    next(error)
  }
}

async function getCompanyAuditLog(req, res, next) {
  try {
    const company = await prisma.company.findUnique({ where: { id: req.params.id }, select: { id: true } })
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' })
    }
    const auditLog = await prisma.adminAuditLog.findMany({
      where: { entityType: 'Company', entityId: company.id },
      orderBy: { createdAt: 'desc' },
      include: { admin: { select: { id: true, email: true } } },
    })
    res.json({ success: true, message: 'Audit log fetched successfully', data: { auditLog } })
  } catch (error) {
    next(error)
  }
}

async function markCompanyUnderReview(req, res, next) {
  try {
    const reason = req.body?.reason ? String(req.body.reason).trim() : undefined
    await transitionCompanyVerification(req, res, {
      targetStatus: 'UNDER_REVIEW',
      reason,
      auditAction: 'UNDER_REVIEW',
      notificationTitle: 'Verification under review',
      notificationMessage: 'Your company verification is now under review.',
    })
  } catch (error) {
    next(error)
  }
}

async function verifyCompany(req, res, next) {
  try {
    const reason = req.body?.reason ? String(req.body.reason).trim() : undefined
    await transitionCompanyVerification(req, res, {
      targetStatus: 'VERIFIED',
      reason,
      auditAction: 'VERIFIED',
      notificationTitle: 'Company verified',
      notificationMessage: 'Your company has been successfully verified.',
    })
  } catch (error) {
    next(error)
  }
}

async function rejectCompany(req, res, next) {
  try {
    const validation = validateReason(req.body?.reason)
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message, errors: [] })
    }
    await transitionCompanyVerification(req, res, {
      targetStatus: 'REJECTED',
      reason: validation.reason,
      auditAction: 'REJECTED',
      notificationTitle: 'Verification rejected',
      notificationMessage: 'Your company verification was rejected. Please review the provided reason.',
    })
  } catch (error) {
    next(error)
  }
}

async function markCompanyDuplicate(req, res, next) {
  try {
    const { duplicateOfCompanyId } = req.body || {}
    const validation = validateReason(req.body?.reason)

    if (!duplicateOfCompanyId) {
      return res.status(400).json({ success: false, message: 'A matched company is required', errors: [] })
    }
    if (duplicateOfCompanyId === req.params.id) {
      return res.status(400).json({ success: false, message: 'A company cannot be marked as a duplicate of itself', errors: [] })
    }
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message, errors: [] })
    }

    const target = await prisma.company.findUnique({
      where: { id: duplicateOfCompanyId },
      include: { verification: { select: { duplicateOfCompanyId: true } } },
    })
    if (!target) {
      return res.status(400).json({ success: false, message: 'The selected matched company does not exist', errors: [] })
    }
    if (target.verification?.duplicateOfCompanyId === req.params.id) {
      return res.status(400).json({ success: false, message: 'This would create a circular duplicate relationship', errors: [] })
    }

    await transitionCompanyVerification(req, res, {
      targetStatus: 'DUPLICATE',
      reason: validation.reason,
      duplicateOfCompanyId,
      auditAction: 'DUPLICATE',
      notificationTitle: 'Possible duplicate company',
      notificationMessage: 'Your company was marked as a possible duplicate of an existing company.',
    })
  } catch (error) {
    next(error)
  }
}

async function restoreCompany(req, res, next) {
  try {
    const requestedStatus = String(req.body?.status || 'PENDING').toUpperCase()
    if (!['PENDING', 'UNDER_REVIEW'].includes(requestedStatus)) {
      return res.status(400).json({ success: false, message: 'Restored status must be PENDING or UNDER_REVIEW', errors: [] })
    }
    const reason = req.body?.reason ? String(req.body.reason).trim() : undefined
    await transitionCompanyVerification(req, res, {
      targetStatus: requestedStatus,
      reason,
      auditAction: 'RESTORED',
      notificationTitle: 'Verification reopened',
      notificationMessage: 'Your company verification request has been reopened.',
    })
  } catch (error) {
    next(error)
  }
}

async function updateCompanyStatus(req, res) {
  const { status } = req.body
  const validStatuses = ['ACTIVE', 'SUSPENDED', 'PENDING']
  if (!validStatuses.includes(status?.toUpperCase())) {
    return res.status(400).json({ message: 'Invalid status' })
  }
  const company = await prisma.company.update({
    where: { id: req.params.id },
    data: { status: status.toUpperCase() },
  })
  res.json({ company })
}

async function getAdminJobs(req, res) {
  const { page = 1, limit = 20, q, status, jobType } = req.query
  const skip = (Number(page) - 1) * Number(limit)
  const where = {}

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { company: { name: { contains: q, mode: 'insensitive' } } },
    ]
  }
  if (status === 'active') where.isActive = true
  if (status === 'inactive') where.isActive = false
  if (jobType && jobType !== 'all') where.jobType = jobType.toUpperCase()

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { name: true, logoUrl: true } },
        _count: { select: { applications: true } },
      },
    }),
    prisma.job.count({ where }),
  ])

  res.json({
    jobs,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  })
}

async function updateJobStatus(req, res) {
  const { status } = req.body
  const job = await prisma.job.update({
    where: { id: req.params.id },
    data: { isActive: status === 'active' },
  })
  res.json({ job })
}

async function getAnalytics(req, res) {
  const { range = '30d' } = req.query
  const days = range === '7d' ? 7 : range === '90d' ? 90 : range === '12m' ? 365 : 30
  const since = new Date()
  since.setDate(since.getDate() - days)

  const userGrowth = await buildMonthlyUserTrend()

  const jobActivity = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
    const [posted, closed] = await Promise.all([
      prisma.job.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.job.count({ where: { isActive: false, updatedAt: { gte: start, lte: end } } }),
    ])
    jobActivity.push({ month: start.toLocaleString('default', { month: 'short' }), posted, closed })
  }

  const applicationTrend = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
    const count = await prisma.application.count({ where: { createdAt: { gte: start, lte: end } } })
    applicationTrend.push({ month: start.toLocaleString('default', { month: 'short' }), applications: count })
  }

  const [total, shortlisted, hired] = await Promise.all([
    prisma.application.count(),
    prisma.application.count({ where: { status: 'SHORTLISTED' } }),
    prisma.application.count({ where: { status: 'HIRED' } }),
  ])

  const platformFunnel = [
    { stage: 'Applications', count: total },
    { stage: 'Reviewed', count: await prisma.application.count({ where: { status: 'REVIEWING' } }) },
    { stage: 'Shortlisted', count: shortlisted },
    { stage: 'Hired', count: hired },
  ]

  const topCategories = await prisma.job.groupBy({
    by: ['category'],
    _count: { category: true },
    orderBy: { _count: { category: 'desc' } },
    take: 5,
  })

  res.json({ userGrowth, jobActivity, applicationTrend, platformFunnel, topCategories })
}

async function getRevenue(req, res) {
  const { range = '30d' } = req.query

  const planCounts = await prisma.company.groupBy({
    by: ['plan'],
    _count: { plan: true },
  })

  const PLAN_PRICES = { FREE: 0, STARTER: 2999, GROWTH: 7999, ENTERPRISE: 19999 }

  const planBreakdown = planCounts.map((p) => ({
    plan: p.plan,
    companies: p._count.plan,
    revenue: p._count.plan * (PLAN_PRICES[p.plan] || 0),
  }))

  const totalMRR = planBreakdown.reduce((sum, p) => sum + p.revenue, 0)

  const revenueTrend = buildRevenuePlaceholder()

  res.json({
    summary: {
      mrr: totalMRR,
      arr: totalMRR * 12,
      totalPayingCompanies: planCounts.filter((p) => p.plan !== 'FREE').reduce((s, p) => s + p._count.plan, 0),
    },
    planBreakdown,
    revenueTrend,
    recentTransactions: [],
  })
}

async function getReports(req, res) {
  const { type, range } = req.query
  res.json({ reports: [], message: 'Reports module not yet implemented' })
}

module.exports = {
  getDashboardStats, getUsers, getUserById, updateUser, deactivateUser, activateUser,
  getCompanies, getCompanyById, updateCompanyStatus,
  getCompanyDuplicateCheck, getCompanyAuditLog,
  markCompanyUnderReview, verifyCompany, rejectCompany, markCompanyDuplicate, restoreCompany,
  getAdminJobs, updateJobStatus,
  getAnalytics, getRevenue, getReports,
}
