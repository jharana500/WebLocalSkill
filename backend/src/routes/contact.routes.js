const router = require('express').Router()
const { sendError, sendSuccess } = require('../utils/response')
const emailService = require('../services/emailService')

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/
const MAX_NAME_LENGTH = 100
const MAX_SUBJECT_LENGTH = 150
const MAX_MESSAGE_LENGTH = 5000
const MIN_MESSAGE_LENGTH = 10

function validateContactPayload(body) {
  const errors = []
  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim()
  const subject = String(body.subject || '').trim()
  const message = String(body.message || '').trim()

  if (!name) errors.push({ field: 'name', message: 'Name is required.' })
  else if (name.length > MAX_NAME_LENGTH) errors.push({ field: 'name', message: `Name must be under ${MAX_NAME_LENGTH} characters.` })

  if (!email) errors.push({ field: 'email', message: 'Email is required.' })
  else if (!EMAIL_PATTERN.test(email)) errors.push({ field: 'email', message: 'Enter a valid email address.' })

  if (!subject) errors.push({ field: 'subject', message: 'Subject is required.' })
  else if (subject.length > MAX_SUBJECT_LENGTH) errors.push({ field: 'subject', message: `Subject must be under ${MAX_SUBJECT_LENGTH} characters.` })

  if (!message) errors.push({ field: 'message', message: 'Message is required.' })
  else if (message.length < MIN_MESSAGE_LENGTH) errors.push({ field: 'message', message: `Message must be at least ${MIN_MESSAGE_LENGTH} characters.` })
  else if (message.length > MAX_MESSAGE_LENGTH) errors.push({ field: 'message', message: `Message must be under ${MAX_MESSAGE_LENGTH} characters.` })

  return { errors, values: { name, email, subject, message } }
}

router.post('/', async (req, res) => {
  const { errors, values } = validateContactPayload(req.body)
  if (errors.length > 0) {
    return sendError(res, 400, 'Please correct the highlighted fields.', errors)
  }

  const result = await emailService.sendContactEmail(values)
  if (!result.sent) {
    const message =
      result.reason === 'not_configured'
        ? 'Email delivery is not configured on this server yet. Please email us directly instead.'
        : 'Could not send your message right now. Please try again later.'
    return sendError(res, 502, message)
  }

  sendSuccess(res, 'Thanks for reaching out — we will get back to you within 24 hours.')
})

module.exports = router
