const store = require('../../utils/store')
const data = require('../../utils/data')

function normalizeImagePath(image) {
  const value = String(image || '').trim()
  if (!value) return data.rules.image
  if (/^(https?:\/\/|cloud:\/\/|\/)/.test(value)) return value
  return `/${value.replace(/^\.?\//, '')}`
}

Page({
  data: {
    rulesImage: ''
  },

  onLoad() {
    store.getConfigAsync('rules').then(result => {
      const value = result.value || {}
      this.setData({
        rulesImage: normalizeImagePath(typeof value === 'string' ? value : value.image)
      })
    }).catch(() => {
      this.setData({ rulesImage: data.rules.image })
    })
  },

  handleRulesImageError() {
    if (this.data.rulesImage === data.rules.image) return
    this.setData({ rulesImage: data.rules.image })
  },

  goBack() {
    wx.navigateBack()
  }
})
