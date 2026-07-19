const prisma = require('../lib/prisma')
const { sendError, sendSuccess } = require('../utils/response')

function normalizeResumePayload(body = {}) {
  const personalData = body.personalData || body.personal_data || {
    name: body.name || '',
    title: body.title || '',
    email: body.email || '',
    phone: body.phone || '',
    location: body.location || '',
    portfolio: body.portfolio || '',
  }

  return {
    title: body.title || personalData.title || null,
    summary: body.summary || null,
    personalData,
    experience: Array.isArray(body.experience) ? body.experience : [],
    education: Array.isArray(body.education) ? body.education : [],
    skills: Array.isArray(body.skills)
      ? body.skills
      : typeof body.skills === 'string'
        ? body.skills.split(',').map((skill) => skill.trim()).filter(Boolean)
        : [],
    projects: Array.isArray(body.projects) ? body.projects : [],
    certifications: Array.isArray(body.certifications) ? body.certifications : [],
  }
}

async function getMyResume(req, res, next) {
  try {
    const resume = await prisma.resume.findUnique({ where: { userId: req.user.id } })
    sendSuccess(res, 'Resume loaded', { resume })
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

    sendSuccess(res, 'Resume draft saved', { resume })
  } catch (error) {
    next(error)
  }
}

module.exports = { getMyResume, saveMyResume, updateMyResume: saveMyResume }
