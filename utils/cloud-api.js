const config = require('./cloud-config')

let initialized = false

function initCloud() {
  if (!wx.cloud) return false
  if (initialized) return true

  const options = { traceUser: true }
  if (config.CLOUD_ENV_ID) {
    options.env = config.CLOUD_ENV_ID
  }

  try {
    wx.cloud.init(options)
    initialized = true
    return true
  } catch (error) {
    if (typeof console !== 'undefined') {
      console.warn('[cloud init failed]', error && (error.message || error))
    }
    return false
  }
}

function call(action, payload) {
  if (!initCloud()) {
    return Promise.reject(new Error('微信云开发未启用'))
  }

  return wx.cloud.callFunction({
    name: config.CLOUD_FUNCTION_NAME,
    data: {
      action,
      payload: payload || {}
    }
  }).then(response => {
    const result = response.result || {}
    if (result.ok === false && !result.state) {
      const error = new Error(result.message || result.code || '云函数调用失败')
      error.code = result.code
      error.result = result
      throw error
    }
    return result
  })
}

function callWithOpenData(action, payload, openData) {
  if (!initCloud()) {
    return Promise.reject(new Error('微信云开发未启用'))
  }

  return wx.cloud.callFunction({
    name: config.CLOUD_FUNCTION_NAME,
    data: Object.assign({
      action,
      payload: payload || {}
    }, openData || {})
  }).then(response => {
    const result = response.result || {}
    if (result.ok === false && !result.state) {
      const error = new Error(result.message || result.code || '云函数调用失败')
      error.code = result.code
      error.result = result
      throw error
    }
    return result
  })
}

function uploadFile(tempFilePath, prefix) {
  if (!initCloud()) {
    return Promise.reject(new Error('微信云开发未启用'))
  }

  const ext = (tempFilePath.match(/\.[a-zA-Z0-9]+$/) || ['.jpg'])[0]
  const cloudPath = `${prefix || 'evidence'}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
  return wx.cloud.uploadFile({ cloudPath, filePath: tempFilePath })
}

module.exports = {
  initCloud,
  call,
  callWithOpenData,
  uploadFile
}
