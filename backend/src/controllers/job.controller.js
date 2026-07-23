const prisma = require('../lib/prisma')

const JOB_CONTENT_FIELDS = [
  'title', 'description', 'requirements', 'benefits', 'jobType', 'experience',
  'category', 'salary', 'salaryMin', 'salaryMax', 'openings', 'district', 'address',
]

function readJobContent(body) {
  const data = {}
  for (const field of JOB_CONTENT_FIELDS) {
    if (body[field] === undefined) continue
    if (field === 'jobType') data.jobType = body.jobType?.toUpperCase()
    else if (field === 'salaryMin' || field === 'salaryMax' || field === 'openings') {
      const parsed = Number.parseInt(body[field], 10)
      data[field] = Number.isFinite(parsed) ? parsed : null
    } else {
      data[field] = body[field]
    }
  }
  if (body.deadline !== undefined) {
    data.deadline = body.deadline ? new Date(body.deadline) : null
  }
  return data
}

function validateJobContent(data) {
  if (
    data.salaryMin !== undefined && data.salaryMin !== null &&
    data.salaryMax !== undefined && data.salaryMax !== null &&
    data.salaryMin > data.salaryMax
  ) {
    return 'Minimum salary cannot be greater than maximum salary'
  }
  if (data.deadline !== undefined && data.deadline !== null) {
    if (Number.isNaN(data.deadline.getTime())) return 'Invalid deadline date'
  }
  return null
}

async function getJobs(req, res) {
  const {
    page = 1, limit = 10, q, category, jobType, district,
    minSalary, maxSalary, sort = 'latest',
  } = req.query

  const skip = (Number(page) - 1) * Number(limit)
  const where = { isActive: true }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { company: { name: { contains: q, mode: 'insensitive' } } },
    ]
  }
  if (category) where.category = category
  if (jobType) where.jobType = jobType.toUpperCase()
  if (district) where.district = district

  const orderBy = sort === 'latest' ? { createdAt: 'desc' }
    : sort === 'featured' ? [{ isFeatured: 'desc' }, { createdAt: 'desc' }]
    : { createdAt: 'asc' }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy,
      skip,
      take: Number(limit),
      include: {
        company: { select: { id: true, name: true, logoUrl: true, isVerified: true, district: true } },
        _count: { select: { applications: true } },
      },
    }),
    prisma.job.count({ where }),
  ])

  res.json({
    jobs,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  })
}

async function getJobById(req, res) {
  const job = await prisma.job.findUnique({
    where: { id: req.params.id },
    include: {
      company: {
        select: { id: true, name: true, logoUrl: true, isVerified: true, district: true, website: true, description: true, size: true },
      },
      _count: { select: { applications: true } },
    },
  })
  if (!job) return res.status(404).json({ message: 'Job not found' })
  res.json({ job })
}

async function createJob(req, res) {
  const company = await prisma.company.findUnique({ where: { userId: req.user.id } })
  if (!company) return res.status(404).json({ message: 'Company not found' })

  const content = readJobContent(req.body)
  const validationError = validateJobContent(content)
  if (validationError) return res.status(400).json({ message: validationError })

  // A job is published by default (matches how job boards normally behave) —
  // callers must explicitly ask for status: 'DRAFT' to save one without
  // publishing. Unverified companies may still save drafts, but any request
  // that would result in ACTIVE is blocked server-side; the frontend is never
  // trusted for this restriction.
  const requestedStatus = req.body.status === 'DRAFT' ? 'DRAFT' : 'ACTIVE'
  if (requestedStatus === 'ACTIVE' && !company.isVerified) {
    return res.status(403).json({ message: 'Your company must be verified before publishing jobs.' })
  }
  const status = requestedStatus

  const job = await prisma.job.create({
    data: {
      companyId: company.id,
      ...content,
      status,
      isActive: status === 'ACTIVE',
    },
    include: {
      company: { select: { name: true, logoUrl: true } },
    },
  })
  res.status(201).json({ job })
}

async function updateJob(req, res) {
  const company = await prisma.company.findUnique({ where: { userId: req.user.id } })
  if (!company) return res.status(404).json({ message: 'Company not found' })
  const job = await prisma.job.findFirst({ where: { id: req.params.id, companyId: company.id } })
  if (!job) return res.status(404).json({ message: 'Job not found' })

  const content = readJobContent(req.body)
  const validationError = validateJobContent(content)
  if (validationError) return res.status(400).json({ message: validationError })

  const updated = await prisma.job.update({
    where: { id: req.params.id },
    data: content,
  })
  res.json({ job: updated })
}

async function deleteJob(req, res) {
  const company = await prisma.company.findUnique({ where: { userId: req.user.id } })
  if (!company) return res.status(404).json({ message: 'Company not found' })
  const job = await prisma.job.findFirst({
    where: { id: req.params.id, companyId: company.id },
    include: { _count: { select: { applications: true } } },
  })
  if (!job) return res.status(404).json({ message: 'Job not found' })

  if (job._count.applications > 0) {
    return res.status(409).json({
      message: 'This job has applications and cannot be deleted. Close it instead to preserve applicant history.',
    })
  }

  await prisma.job.delete({ where: { id: req.params.id } })
  res.json({ message: 'Job deleted' })
}

async function publishJob(req, res) {
  const company = await prisma.company.findUnique({ where: { userId: req.user.id } })
  if (!company) return res.status(404).json({ message: 'Company not found' })
  const job = await prisma.job.findFirst({ where: { id: req.params.id, companyId: company.id } })
  if (!job) return res.status(404).json({ message: 'Job not found' })

  if (!company.isVerified) {
    return res.status(403).json({ message: 'Your company must be verified before publishing jobs.' })
  }
  if (job.status === 'ACTIVE') {
    return res.status(409).json({ message: 'This job is already published' })
  }
  if (job.deadline && job.deadline < new Date()) {
    return res.status(400).json({ message: 'Set a future deadline before publishing this job' })
  }
  if (!job.title || !job.description || !job.jobType || !job.category) {
    return res.status(400).json({ message: 'Complete the job title, description, type, and category before publishing' })
  }

  const updated = await prisma.job.update({
    where: { id: req.params.id },
    data: { status: 'ACTIVE', isActive: true },
  })
  res.json({ message: 'Job published successfully', job: updated })
}

async function closeJob(req, res) {
  const company = await prisma.company.findUnique({ where: { userId: req.user.id } })
  if (!company) return res.status(404).json({ message: 'Company not found' })
  const job = await prisma.job.findFirst({ where: { id: req.params.id, companyId: company.id } })
  if (!job) return res.status(404).json({ message: 'Job not found' })

  if (job.status === 'CLOSED') {
    return res.status(409).json({ message: 'This job is already closed' })
  }

  const updated = await prisma.job.update({
    where: { id: req.params.id },
    data: { status: 'CLOSED', isActive: false },
  })
  res.json({ message: 'Job closed successfully', job: updated })
}

async function reopenJob(req, res) {
  const company = await prisma.company.findUnique({ where: { userId: req.user.id } })
  if (!company) return res.status(404).json({ message: 'Company not found' })
  const job = await prisma.job.findFirst({ where: { id: req.params.id, companyId: company.id } })
  if (!job) return res.status(404).json({ message: 'Job not found' })

  if (job.status !== 'CLOSED') {
    return res.status(409).json({ message: 'Only closed jobs can be reopened' })
  }
  if (!company.isVerified) {
    return res.status(403).json({ message: 'Your company must be verified before publishing jobs.' })
  }
  if (job.deadline && job.deadline < new Date()) {
    return res.status(400).json({ message: 'This job\'s deadline has passed — update the deadline before reopening' })
  }

  const updated = await prisma.job.update({
    where: { id: req.params.id },
    data: { status: 'ACTIVE', isActive: true },
  })
  res.json({ message: 'Job reopened successfully', job: updated })
}

// Kept for backward compatibility with the existing frontend action — delegates
// to the same publish/close rules rather than duplicating the logic.
async function toggleJobStatus(req, res) {
  const company = await prisma.company.findUnique({ where: { userId: req.user.id } })
  if (!company) return res.status(404).json({ message: 'Company not found' })
  const job = await prisma.job.findFirst({ where: { id: req.params.id, companyId: company.id } })
  if (!job) return res.status(404).json({ message: 'Job not found' })

  if (job.status === 'ACTIVE') return closeJob(req, res)
  return job.status === 'CLOSED' ? reopenJob(req, res) : publishJob(req, res)
}

async function getJobAnalytics(req, res) {
  const company = await prisma.company.findUnique({ where: { userId: req.user.id } })
  const job = await prisma.job.findFirst({ where: { id: req.params.id, companyId: company?.id } })
  if (!job) return res.status(404).json({ message: 'Job not found' })

  const applications = await prisma.application.findMany({
    where: { jobId: job.id },
    select: { status: true, createdAt: true },
  })

  const byStatus = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1
    return acc
  }, {})

  res.json({ job, totalApplications: applications.length, byStatus })
}

async function getFeaturedJobs(req, res) {
  const jobs = await prisma.job.findMany({
    where: { isActive: true, isFeatured: true },
    take: 6,
    orderBy: { createdAt: 'desc' },
    include: {
      company: { select: { id: true, name: true, logoUrl: true, isVerified: true, district: true } },
    },
  })

  if (jobs.length < 3) {
    const extra = await prisma.job.findMany({
      where: { isActive: true, isFeatured: false },
      take: 6 - jobs.length,
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true, logoUrl: true, isVerified: true, district: true } },
      },
    })
    jobs.push(...extra)
  }

  res.json({ jobs })
}

async function getRecommendedJobs(req, res) {
  const userId = req.user?.id
  let skills = []

  if (userId) {
    const profile = await prisma.jobSeekerProfile.findUnique({
      where: { userId },
      select: { skills: true, district: true },
    })
    skills = profile?.skills || []
  }

  const jobs = await prisma.job.findMany({
    where: {
      isActive: true,
      ...(userId && { NOT: { applications: { some: { userId } } } }),
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
    include: {
      company: { select: { id: true, name: true, logoUrl: true, isVerified: true, district: true } },
    },
  })
  res.json({ jobs })
}

async function getNearbyJobs(req, res) {
  const { district } = req.query
  if (!district) return res.status(400).json({ message: 'District is required' })

  const jobs = await prisma.job.findMany({
    where: { isActive: true, district: { contains: district, mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      company: { select: { id: true, name: true, logoUrl: true, isVerified: true } },
    },
  })
  res.json({ jobs })
}

async function getCategories(req, res) {
  const categories = await prisma.job.groupBy({
    by: ['category'],
    where: { isActive: true },
    _count: { category: true },
    orderBy: { _count: { category: 'desc' } },
  })
  res.json({
    categories: categories.map((c) => ({ name: c.category, count: c._count.category })),
  })
}

async function searchJobs(req, res) {
  return getJobs(req, res)
}

async function getCompanyJobs(req, res) {
  const rawPage = Number.parseInt(req.query.page, 10)
  const rawLimit = Number.parseInt(req.query.limit, 10)
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 10
  const { status, q } = req.query

  const company = await prisma.company.findUnique({ where: { userId: req.user.id } })
  if (!company) return res.status(404).json({ message: 'Company not found' })

  const where = { companyId: company.id }
  if (status && status !== 'all') where.status = status.toUpperCase()
  if (q) where.title = { contains: q, mode: 'insensitive' }

  const skip = (page - 1) * limit
  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            applications: true,
          },
        },
      },
    }),
    prisma.job.count({ where }),
  ])

  const jobIds = jobs.map((j) => j.id)
  const statusCounts = jobIds.length
    ? await prisma.application.groupBy({
      by: ['jobId', 'status'],
      where: { jobId: { in: jobIds } },
      _count: true,
    })
    : []

  const countsByJob = {}
  for (const row of statusCounts) {
    countsByJob[row.jobId] = countsByJob[row.jobId] || {}
    countsByJob[row.jobId][row.status] = row._count
  }

  const enrichedJobs = jobs.map((job) => {
    const counts = countsByJob[job.id] || {}
    return {
      ...job,
      applicationCount: job._count.applications,
      pendingCount: counts.PENDING || 0,
      shortlistedCount: counts.SHORTLISTED || 0,
      acceptedCount: counts.HIRED || 0,
    }
  })

  res.json({
    success: true,
    message: 'Company jobs fetched successfully',
    data: {
      jobs: enrichedJobs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  })
}

module.exports = {
  getJobs, getJobById, createJob, updateJob, deleteJob,
  publishJob, closeJob, reopenJob, toggleJobStatus, getJobAnalytics,
  getFeaturedJobs, getRecommendedJobs, getNearbyJobs,
  getCategories, searchJobs, getCompanyJobs,
}
