const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const { requireRole } = require('../middleware/role')
const prisma = require('../lib/prisma')

router.use(authenticate)
router.use(requireRole('job_seeker'))

router.get('/', async (req, res) => {
  const saved = await prisma.savedJob.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      job: {
        include: {
          company: { select: { id: true, name: true, logoUrl: true, isVerified: true, district: true } },
        },
      },
    },
  })
  res.json({ savedJobs: saved.map((s) => s.job) })
})

router.post('/:jobId', async (req, res) => {
  const { jobId } = req.params
  const job = await prisma.job.findUnique({ where: { id: jobId } })
  if (!job) return res.status(404).json({ message: 'Job not found' })

  const existing = await prisma.savedJob.findUnique({
    where: { jobId_userId: { jobId, userId: req.user.id } },
  })
  if (existing) return res.status(409).json({ message: 'Job already saved' })

  await prisma.savedJob.create({ data: { jobId, userId: req.user.id } })
  res.status(201).json({ message: 'Job saved' })
})

router.delete('/:jobId', async (req, res) => {
  const { jobId } = req.params
  await prisma.savedJob.deleteMany({
    where: { jobId, userId: req.user.id },
  })
  res.json({ message: 'Job unsaved' })
})

router.get('/:jobId/check', async (req, res) => {
  const { jobId } = req.params
  const saved = await prisma.savedJob.findUnique({
    where: { jobId_userId: { jobId, userId: req.user.id } },
  })
  res.json({ isSaved: !!saved })
})

module.exports = router
