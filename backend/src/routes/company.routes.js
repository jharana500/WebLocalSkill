const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const { requireRole } = require('../middleware/role')
const { uploadLogo, uploadDocuments } = require('../middleware/upload')
const ctrl = require('../controllers/company.controller')

router.use(authenticate)
router.use(requireRole('company'))

router.get('/profile', ctrl.getProfile)
router.put('/profile', ctrl.updateProfile)
router.post('/logo', uploadLogo.single('logo'), ctrl.uploadLogo)
router.post('/verification', uploadDocuments.fields([
  { name: 'panDoc', maxCount: 1 },
  { name: 'registrationCert', maxCount: 1 },
]), ctrl.submitVerification)
router.get('/verification/status', ctrl.getVerificationStatus)
router.get('/dashboard', ctrl.getDashboardStats)
router.get('/analytics', ctrl.getAnalytics)
router.get('/billing/history', ctrl.getBillingHistory)
router.get('/subscription', ctrl.getSubscription)
router.post('/subscription', ctrl.updateSubscription)

module.exports = router
