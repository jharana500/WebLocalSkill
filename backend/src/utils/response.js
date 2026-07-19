function normalizeData(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload
  const { success, message, errors, ...data } = payload
  return data
}

function sendSuccess(res, message = 'Request successful', data = {}, status = 200) {
  return res.status(status).json({ success: true, message, data })
}

function sendError(res, status = 500, message = 'Internal server error', errors = []) {
  return res.status(status).json({ success: false, message, errors })
}

function standardizeResponses(req, res, next) {
  const originalJson = res.json.bind(res)

  res.json = (payload = {}) => {
    if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'success')) {
      return originalJson(payload)
    }

    const statusCode = res.statusCode || 200
    if (statusCode >= 400) {
      return originalJson({
        success: false,
        message: payload?.message || 'Request failed',
        errors: payload?.errors || [],
      })
    }

    return originalJson({
      success: true,
      message: payload?.message || 'Request successful',
      data: normalizeData(payload),
    })
  }

  next()
}

module.exports = { sendSuccess, sendError, standardizeResponses }
