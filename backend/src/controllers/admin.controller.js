const prisma = require('../lib/prisma')

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

async function getCompanies(req, res) {
  const { page = 1, limit = 20, q, status, plan } = req.query
  const skip = (Number(page) - 1) * Number(limit)
  const where = {}

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { industry: { contains: q, mode: 'insensitive' } },
    ]
  }
  if (status && status !== 'all') where.status = status.toUpperCase()
  if (plan && plan !== 'all') where.plan = plan.toUpperCase()

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true, createdAt: true } },
        _count: { select: { jobs: true } },
        verification: { select: { status: true } },
      },
    }),
    prisma.company.count({ where }),
  ])

  res.json({
    companies,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  })
}

async function getCompanyById(req, res) {
  const company = await prisma.company.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { email: true, createdAt: true, isActive: true } },
      jobs: { orderBy: { createdAt: 'desc' }, take: 10 },
      verification: true,
      _count: { select: { jobs: true } },
    },
  })
  if (!company) return res.status(404).json({ message: 'Company not found' })
  res.json({ company })
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

async function getVerificationQueue(req, res) {
  const { page = 1, limit = 10, status = 'PENDING' } = req.query
  const skip = (Number(page) - 1) * Number(limit)
  const where = {}
  if (status && status !== 'all') where.status = status.toUpperCase()

  const [verifications, total] = await Promise.all([
    prisma.companyVerification.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { submittedAt: 'desc' },
      include: {
        company: {
          include: {
            user: { select: { email: true } },
          },
        },
      },
    }),
    prisma.companyVerification.count({ where }),
  ])

  res.json({
    verifications,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  })
}

async function reviewVerification(req, res) {
  const { decision, notes } = req.body
  if (!['APPROVED', 'REJECTED', 'UNDER_REVIEW'].includes(decision?.toUpperCase())) {
    return res.status(400).json({ message: 'Decision must be APPROVED, REJECTED, or UNDER_REVIEW' })
  }

  const verification = await prisma.companyVerification.update({
    where: { id: req.params.id },
    data: {
      status: decision.toUpperCase(),
      reviewNotes: notes,
      reviewedAt: new Date(),
    },
  })

  if (decision.toUpperCase() === 'APPROVED') {
    await prisma.company.update({
      where: { id: verification.companyId },
      data: { isVerified: true },
    })
  }

  res.json({ verification })
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
  getVerificationQueue, reviewVerification,
  getAdminJobs, updateJobStatus,
  getAnalytics, getRevenue, getReports,
}
