const router = require('express').Router()
const prisma = require('../lib/prisma')

router.get('/', async (req, res) => {
  const { page = 1, limit = 10, q, industry } = req.query
  const skip = (Number(page) - 1) * Number(limit)
  const where = { isVerified: true, status: 'ACTIVE' }

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { industry: { contains: q, mode: 'insensitive' } },
    ]
  }
  if (industry) where.industry = industry

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, industry: true, size: true, district: true,
        logoUrl: true, isVerified: true, description: true,
        _count: { select: { jobs: true } },
      },
    }),
    prisma.company.count({ where }),
  ])

  res.json({
    companies,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  })
})

router.get('/:id', async (req, res) => {
  const company = await prisma.company.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, name: true, industry: true, size: true, district: true, address: true,
      website: true, logoUrl: true, isVerified: true, description: true, createdAt: true,
      jobs: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, title: true, jobType: true, district: true, salary: true, createdAt: true },
      },
    },
  })
  if (!company) return res.status(404).json({ message: 'Company not found' })
  res.json({ company })
})

module.exports = router
