const multer = require('multer')
const path = require('path')
const fs = require('fs')

function createStorage(folder) {
  const dir = path.join(__dirname, '../../uploads', folder)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
      cb(null, `${unique}${path.extname(file.originalname)}`)
    },
  })
}

function fileFilter(allowedTypes) {
  return (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`File type not allowed. Allowed: ${allowedTypes.join(', ')}`), false)
    }
  }
}

const uploadAvatar = multer({
  storage: createStorage('avatars'),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/webp']),
})

const uploadResume = multer({
  storage: createStorage('resumes'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter(['application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
})

const uploadLogo = multer({
  storage: createStorage('logos'),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
})

const uploadDocuments = multer({
  storage: createStorage('documents'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter(['application/pdf', 'image/jpeg', 'image/png']),
})

function getFileUrl(req, filePath) {
  const relative = filePath.replace(/\\/g, '/').split('uploads/')[1]
  return `${req.protocol}://${req.get('host')}/uploads/${relative}`
}

module.exports = { uploadAvatar, uploadResume, uploadLogo, uploadDocuments, getFileUrl }
