const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const { requireRole } = require('../middleware/role')
const ctrl = require('../controllers/job.controller')

// Public routes
router.get('/', ctrl.getJobs)
router.get('/featured', ctrl.getFeaturedJobs)
router.get('/search', ctrl.searchJobs)
router.get('/categories', ctrl.getCategories)
router.get('/nearby', ctrl.getNearbyJobs)

// Auth-required routes (optional auth for recommended)
router.get('/recommended', (req, res, next) => {
  const authHeader = req.headers.authorization
  if (authHeader) {
    authenticate(req, res, next)
  } else {
    next()
  }
}, ctrl.getRecommendedJobs)

// Company: manage own jobs
router.get('/my', authenticate, requireRole('company'), ctrl.getCompanyJobs)
router.post('/', authenticate, requireRole('company'), ctrl.createJob)
router.get('/:id', ctrl.getJobById)
router.put('/:id', authenticate, requireRole('company'), ctrl.updateJob)
router.delete('/:id', authenticate, requireRole('company'), ctrl.deleteJob)
router.patch('/:id/publish', authenticate, requireRole('company'), ctrl.publishJob)
router.patch('/:id/close', authenticate, requireRole('company'), ctrl.closeJob)
router.patch('/:id/reopen', authenticate, requireRole('company'), ctrl.reopenJob)
router.patch('/:id/toggle-status', authenticate, requireRole('company'), ctrl.toggleJobStatus)
router.get('/:id/analytics', authenticate, requireRole('company'), ctrl.getJobAnalytics)
router.get('/:jobId/applications', authenticate, requireRole('company'), require('../controllers/application.controller').getJobApplications)

module.exports = router
