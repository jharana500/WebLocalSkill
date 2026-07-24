const router = require('express').Router()
const { PLANS } = require('../config/plans')

// Public, read-only mirror of the billing plan config so the marketing
// pricing page and the authenticated billing page always show the same
// numbers — no subscription/account data is exposed here.
router.get('/', (req, res) => {
  res.json({
    message: 'Plans fetched successfully',
    plans: PLANS,
  })
})

module.exports = router
