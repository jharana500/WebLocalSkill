const bcrypt = require('bcrypt')
const prisma = require('../lib/prisma')
const { getFileUrl } = require('../middleware/upload')
const { isValidPassword, PASSWORD_REQUIREMENTS } = require('../utils/validation')

async function getProfile(req, res) {
  const profile = await prisma.jobSeekerProfile.findUnique({
    where: { userId: req.user.id },
    include: { education: true, experience: true, certifications: true },
  })
  if (!profile) return res.status(404).json({ message: 'Profile not found' })
  res.json({ profile })
}

async function updateProfile(req, res) {
  const { firstName, lastName, title, phone, district, address, bio, linkedin, github, website } = req.body
  const profile = await prisma.jobSeekerProfile.upsert({
    where: { userId: req.user.id },
    update: { firstName, lastName, title, phone, district, address, bio, linkedin, github, website },
    create: {
      userId: req.user.id,
      firstName: firstName || '',
      lastName: lastName || '',
      title, phone, district, address, bio, linkedin, github, website,
      skills: [],
    },
  })
  res.json({ profile })
}

async function uploadAvatar(req, res) {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' })
  const avatarUrl = getFileUrl(req, req.file.path)
  const profile = await prisma.jobSeekerProfile.update({
    where: { userId: req.user.id },
    data: { avatarUrl },
  })
  res.json({ avatarUrl: profile.avatarUrl })
}

async function uploadResume(req, res) {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' })
  const resumeUrl = getFileUrl(req, req.file.path)
  const profile = await prisma.jobSeekerProfile.update({
    where: { userId: req.user.id },
    data: { resumeUrl },
  })
  res.json({ resumeUrl: profile.resumeUrl })
}

async function getResume(req, res) {
  const profile = await prisma.jobSeekerProfile.findUnique({
    where: { userId: req.user.id },
    select: { resumeUrl: true },
  })
  if (!profile) return res.status(404).json({ message: 'Profile not found' })
  res.json({ resumeUrl: profile.resumeUrl })
}

async function addSkill(req, res) {
  const { skill } = req.body
  if (!skill) return res.status(400).json({ message: 'Skill is required' })
  const profile = await prisma.jobSeekerProfile.update({
    where: { userId: req.user.id },
    data: { skills: { push: skill } },
  })
  res.json({ skills: profile.skills })
}

async function removeSkill(req, res) {
  const { skill } = req.params
  const profile = await prisma.jobSeekerProfile.findUnique({
    where: { userId: req.user.id },
    select: { skills: true },
  })
  if (!profile) return res.status(404).json({ message: 'Profile not found' })
  const updated = await prisma.jobSeekerProfile.update({
    where: { userId: req.user.id },
    data: { skills: profile.skills.filter((s) => s !== skill) },
  })
  res.json({ skills: updated.skills })
}

const CURRENT_YEAR = new Date().getFullYear()
const EDUCATION_MIN_YEAR = 1950

function validateEducationPayload(body) {
  if (!body.institution || !String(body.institution).trim()) return 'Institution is required'
  if (!body.degree || !String(body.degree).trim()) return 'Degree is required'
  if (body.startYear === undefined || body.startYear === null || body.startYear === '') {
    return 'Start year is required'
  }
  const startYear = Number.parseInt(body.startYear, 10)
  if (!Number.isFinite(startYear) || startYear < EDUCATION_MIN_YEAR || startYear > CURRENT_YEAR) {
    return `Start year must be between ${EDUCATION_MIN_YEAR} and ${CURRENT_YEAR}`
  }
  const isCurrent = !!body.isCurrent
  if (!isCurrent && body.endYear !== undefined && body.endYear !== null && body.endYear !== '') {
    const endYear = Number.parseInt(body.endYear, 10)
    if (!Number.isFinite(endYear) || endYear < startYear || endYear > CURRENT_YEAR + 10) {
      return 'End year cannot be earlier than start year'
    }
  }
  return null
}

function readEducationPayload(body) {
  const isCurrent = !!body.isCurrent
  return {
    institution: String(body.institution).trim(),
    degree: String(body.degree).trim(),
    field: body.field ? String(body.field).trim() : undefined,
    startYear: Number.parseInt(body.startYear, 10),
    endYear: isCurrent ? null : body.endYear ? Number.parseInt(body.endYear, 10) : null,
    isCurrent,
  }
}

async function addEducation(req, res) {
  const profile = await prisma.jobSeekerProfile.findUnique({ where: { userId: req.user.id } })
  if (!profile) return res.status(404).json({ message: 'Profile not found' })

  const validationError = validateEducationPayload(req.body)
  if (validationError) return res.status(400).json({ message: validationError })

  const education = await prisma.education.create({
    data: { ...readEducationPayload(req.body), profileId: profile.id },
  })
  res.status(201).json({ education })
}

async function updateEducation(req, res) {
  const { id } = req.params
  const profile = await prisma.jobSeekerProfile.findUnique({ where: { userId: req.user.id } })
  if (!profile) return res.status(404).json({ message: 'Profile not found' })

  const validationError = validateEducationPayload(req.body)
  if (validationError) return res.status(400).json({ message: validationError })

  const education = await prisma.education.update({
    where: { id, profileId: profile.id },
    data: readEducationPayload(req.body),
  })
  res.json({ education })
}

async function removeEducation(req, res) {
  const { id } = req.params
  const profile = await prisma.jobSeekerProfile.findUnique({ where: { userId: req.user.id } })
  await prisma.education.delete({ where: { id, profileId: profile.id } })
  res.json({ message: 'Education removed' })
}

async function addExperience(req, res) {
  const profile = await prisma.jobSeekerProfile.findUnique({ where: { userId: req.user.id } })
  if (!profile) return res.status(404).json({ message: 'Profile not found' })
  const experience = await prisma.experience.create({
    data: { ...req.body, profileId: profile.id },
  })
  res.status(201).json({ experience })
}

async function updateExperience(req, res) {
  const { id } = req.params
  const profile = await prisma.jobSeekerProfile.findUnique({ where: { userId: req.user.id } })
  const experience = await prisma.experience.update({
    where: { id, profileId: profile.id },
    data: req.body,
  })
  res.json({ experience })
}

async function removeExperience(req, res) {
  const { id } = req.params
  const profile = await prisma.jobSeekerProfile.findUnique({ where: { userId: req.user.id } })
  await prisma.experience.delete({ where: { id, profileId: profile.id } })
  res.json({ message: 'Experience removed' })
}

async function addCertification(req, res) {
  const profile = await prisma.jobSeekerProfile.findUnique({ where: { userId: req.user.id } })
  if (!profile) return res.status(404).json({ message: 'Profile not found' })
  const cert = await prisma.certification.create({
    data: { ...req.body, profileId: profile.id },
  })
  res.status(201).json({ certification: cert })
}

async function removeCertification(req, res) {
  const { id } = req.params
  const profile = await prisma.jobSeekerProfile.findUnique({ where: { userId: req.user.id } })
  await prisma.certification.delete({ where: { id, profileId: profile.id } })
  res.json({ message: 'Certification removed' })
}

async function getDashboardData(req, res) {
  const userId = req.user.id

  const [totalApplications, savedJobs, shortlisted, profile] = await Promise.all([
    prisma.application.count({ where: { userId } }),
    prisma.savedJob.count({ where: { userId } }),
    prisma.application.count({ where: { userId, status: 'SHORTLISTED' } }),
    prisma.jobSeekerProfile.findUnique({
      where: { userId },
      include: {
        education: true,
        experience: true,
        certifications: true,
      },
    }),
  ])

  const profileCompletion = calculateProfileCompletion(profile)

  const recentApplications = await prisma.application.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      job: {
        select: {
          id: true, title: true,
          company: { select: { name: true, logoUrl: true } },
        },
      },
    },
  })

  const recommendedJobs = await prisma.job.findMany({
    where: {
      isActive: true,
      NOT: { applications: { some: { userId } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
    include: {
      company: { select: { name: true, logoUrl: true, isVerified: true } },
    },
  })

  res.json({
    stats: { totalApplications, savedJobs, shortlisted, profileCompletion },
    recentApplications,
    recommendedJobs,
  })
}

function calculateProfileCompletion(profile) {
  if (!profile) return 0
  let score = 0
  const checks = [
    profile.firstName,
    profile.lastName,
    profile.phone,
    profile.district,
    profile.bio,
    profile.avatarUrl,
    profile.resumeUrl,
    profile.skills?.length > 0,
    profile.education?.length > 0,
    profile.experience?.length > 0,
  ]
  checks.forEach((c) => { if (c) score += 10 })
  return score
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body
  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ message: PASSWORD_REQUIREMENTS })
  }
  const user = await prisma.user.findUnique({ where: { id: req.user.id } })
  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) return res.status(400).json({ message: 'Current password is incorrect' })
  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } })
  res.json({ message: 'Password changed successfully' })
}

async function getNotificationPreferences(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { notificationPreferences: true },
  })
  res.json({ settings: user?.notificationPreferences || {} })
}

async function updateNotifications(req, res) {
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { notificationPreferences: req.body },
    select: { notificationPreferences: true },
  })
  res.json({ message: 'Notification settings updated', settings: user.notificationPreferences })
}

async function deleteAccount(req, res) {
  await prisma.user.update({ where: { id: req.user.id }, data: { isActive: false } })
  res.json({ message: 'Account deactivated' })
}

module.exports = {
  getProfile, updateProfile, uploadAvatar, uploadResume, getResume,
  addSkill, removeSkill,
  addEducation, updateEducation, removeEducation,
  addExperience, updateExperience, removeExperience,
  addCertification, removeCertification,
  getDashboardData, changePassword, getNotificationPreferences, updateNotifications, deleteAccount,
}
