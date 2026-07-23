const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const { requireRole } = require('../middleware/role')
const { uploadAvatar, uploadResume } = require('../middleware/upload')
const ctrl = require('../controllers/user.controller')

router.use(authenticate)

// Account-level actions apply to any authenticated role, not just job seekers.
router.post('/change-password', ctrl.changePassword)
router.get('/notifications', ctrl.getNotificationPreferences)
router.put('/notifications', ctrl.updateNotifications)
router.delete('/account', ctrl.deleteAccount)

// Job-seeker profile management
router.use(requireRole('job_seeker'))

router.get('/profile', ctrl.getProfile)
router.put('/profile', ctrl.updateProfile)
router.post('/avatar', uploadAvatar.single('avatar'), ctrl.uploadAvatar)
router.post('/resume', uploadResume.single('resume'), ctrl.uploadResume)
router.get('/resume', ctrl.getResume)
router.get('/dashboard', ctrl.getDashboardData)
router.post('/skills', ctrl.addSkill)
router.delete('/skills/:skill', ctrl.removeSkill)
router.post('/education', ctrl.addEducation)
router.put('/education/:id', ctrl.updateEducation)
router.delete('/education/:id', ctrl.removeEducation)
router.post('/experience', ctrl.addExperience)
router.put('/experience/:id', ctrl.updateExperience)
router.delete('/experience/:id', ctrl.removeExperience)
router.post('/certifications', ctrl.addCertification)
router.delete('/certifications/:id', ctrl.removeCertification)

module.exports = router
