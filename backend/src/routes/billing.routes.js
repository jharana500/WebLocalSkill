const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const { requireRole } = require('../middleware/role')
const companyController = require('../controllers/company.controller')

router.use(authenticate)
router.use(requireRole('company', 'employer'))

router.get('/subscription', companyController.getSubscription)
router.get('/history', companyController.getBillingHistory)
router.get('/plans', (req, res) => {
  res.json({
    message: 'Billing plans fetched successfully',
    plans: [
      { id: 'FREE', name: 'Free', amount: 0, currency: 'NPR' },
      { id: 'STARTER', name: 'Starter', amount: 2999, currency: 'NPR' },
      { id: 'GROWTH', name: 'Growth', amount: 7999, currency: 'NPR' },
      { id: 'ENTERPRISE', name: 'Enterprise', amount: 19999, currency: 'NPR' },
    ],
  })
})

module.exports = router
