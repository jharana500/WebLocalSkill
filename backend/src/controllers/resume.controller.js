const prisma = require('../lib/prisma')
const { sendError, sendSuccess } = require('../utils/response')

const MAX_ARRAY_ITEMS = 50
const MAX_STRING_LENGTH = 5000

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function trimmed(value) {
  return typeof value === 'string' ? value.trim().slice(0, MAX_STRING_LENGTH) : value
}

function trimObjectStrings(obj) {
  if (!isPlainObject(obj)) return obj
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, trimmed(value)]),
  )
}

function safeArray(value) {
  if (!Array.isArray(value)) return []
  return value.slice(0, MAX_ARRAY_ITEMS).map((item) => (isPlainObject(item) ? trimObjectStrings(item) : item))
}

function normalizeResumePayload(body = {}) {
  const rawPersonalData = body.personalData || body.personal_data
  const personalData = trimObjectStrings(
    isPlainObject(rawPersonalData)
      ? rawPersonalData
      : {
          name: body.name || '',
          title: body.title || '',
          email: body.email || '',
          phone: body.phone || '',
          location: body.location || '',
          portfolio: body.portfolio || '',
        },
  )

  return {
    title: trimmed(body.title) || trimmed(personalData.title) || null,
    summary: trimmed(body.summary) || null,
    personalData,
    experience: safeArray(body.experience),
    education: safeArray(body.education),
    skills: Array.isArray(body.skills)
      ? safeArray(body.skills.map(trimmed))
      : typeof body.skills === 'string'
        ? body.skills.split(',').map((skill) => skill.trim()).filter(Boolean).slice(0, MAX_ARRAY_ITEMS)
        : [],
    projects: safeArray(body.projects),
    certifications: safeArray(body.certifications),
  }
}

async function getMyResume(req, res, next) {
  try {
    const resume = await prisma.resume.findUnique({ where: { userId: req.user.id } })
    sendSuccess(res, 'Resume fetched successfully', { resume })
  } catch (error) {
    next(error)
  }
}

async function saveMyResume(req, res, next) {
  try {
    const payload = normalizeResumePayload(req.body)
    if (payload.personalData.email && !/^\S+@\S+\.\S+$/.test(payload.personalData.email)) {
      return sendError(res, 400, 'Enter a valid email address')
    }

    const resume = await prisma.resume.upsert({
      where: { userId: req.user.id },
      update: payload,
      create: { userId: req.user.id, ...payload },
    })

    sendSuccess(res, 'Resume draft saved successfully', { resume })
  } catch (error) {
    next(error)
  }
}

async function deleteMyResume(req, res, next) {
  try {
    await prisma.resume.deleteMany({ where: { userId: req.user.id } })
    sendSuccess(res, 'Resume deleted successfully', {})
  } catch (error) {
    next(error)
  }
}

module.exports = { getMyResume, saveMyResume, updateMyResume: saveMyResume, deleteMyResume }
