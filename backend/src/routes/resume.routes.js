const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const ctrl = require('../controllers/resume.controller')

router.use(authenticate)

router.get('/me', ctrl.getMyResume)
router.post('/me', ctrl.saveMyResume)
router.patch('/me', ctrl.updateMyResume)

module.exports = router
