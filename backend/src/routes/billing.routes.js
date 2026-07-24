const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const { requireRole } = require('../middleware/role')
const companyController = require('../controllers/company.controller')
const { PLANS } = require('../config/plans')

router.use(authenticate)
router.use(requireRole('company', 'employer'))

router.get('/subscription', companyController.getSubscription)
router.get('/history', companyController.getBillingHistory)
router.get('/plans', (req, res) => {
  res.json({
    message: 'Billing plans fetched successfully',
    plans: PLANS,
  })
})

module.exports = router
