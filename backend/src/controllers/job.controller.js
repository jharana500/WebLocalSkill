const prisma = require('../lib/prisma')

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

  const { title, description, requirements, jobType, category, salary, district, address, expiresAt, isActive } = req.body

  // Unverified companies may still save draft jobs, they just can't publish
  // one as active — the request can ask for isActive, but it's forced to
  // false unless the company is verified. This is enforced server-side;
  // the frontend must never be trusted for this restriction.
  const requestedActive = isActive === undefined ? true : Boolean(isActive)
  if (requestedActive && !company.isVerified) {
    return res.status(403).json({ message: 'Your company must be verified before publishing jobs.' })
  }

  const job = await prisma.job.create({
    data: {
      companyId: company.id,
      title,
      description,
      requirements,
      jobType: jobType?.toUpperCase(),
      category,
      salary,
      district,
      address,
      isActive: company.isVerified ? requestedActive : false,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    include: {
      company: { select: { name: true, logoUrl: true } },
    },
  })
  res.status(201).json({ job })
}

async function updateJob(req, res) {
  const company = await prisma.company.findUnique({ where: { userId: req.user.id } })
  const job = await prisma.job.findFirst({ where: { id: req.params.id, companyId: company.id } })
  if (!job) return res.status(404).json({ message: 'Job not found' })

  const { title, description, requirements, jobType, category, salary, district, address, expiresAt } = req.body
  const updated = await prisma.job.update({
    where: { id: req.params.id },
    data: {
      title, description, requirements,
      jobType: jobType?.toUpperCase(),
      category, salary, district, address,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    },
  })
  res.json({ job: updated })
}

async function deleteJob(req, res) {
  const company = await prisma.company.findUnique({ where: { userId: req.user.id } })
  const job = await prisma.job.findFirst({ where: { id: req.params.id, companyId: company.id } })
  if (!job) return res.status(404).json({ message: 'Job not found' })
  await prisma.job.delete({ where: { id: req.params.id } })
  res.json({ message: 'Job deleted' })
}

async function toggleJobStatus(req, res) {
  const company = await prisma.company.findUnique({ where: { userId: req.user.id } })
  const job = await prisma.job.findFirst({ where: { id: req.params.id, companyId: company.id } })
  if (!job) return res.status(404).json({ message: 'Job not found' })

  const activating = !job.isActive
  if (activating && !company.isVerified) {
    return res.status(403).json({ message: 'Your company must be verified before publishing jobs.' })
  }

  const updated = await prisma.job.update({
    where: { id: req.params.id },
    data: { isActive: activating },
  })
  res.json({ job: updated })
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
  const { page = 1, limit = 10, status } = req.query
  const company = await prisma.company.findUnique({ where: { userId: req.user.id } })
  if (!company) return res.status(404).json({ message: 'Company not found' })

  const where = { companyId: company.id }
  if (status === 'active') where.isActive = true
  if (status === 'inactive') where.isActive = false

  const skip = (Number(page) - 1) * Number(limit)
  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { applications: true } } },
    }),
    prisma.job.count({ where }),
  ])

  res.json({
    jobs,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  })
}

module.exports = {
  getJobs, getJobById, createJob, updateJob, deleteJob,
  toggleJobStatus, getJobAnalytics,
  getFeaturedJobs, getRecommendedJobs, getNearbyJobs,
  getCategories, searchJobs, getCompanyJobs,
}
