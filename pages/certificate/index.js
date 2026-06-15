const store = require('../../utils/store')

Page({
  data: {
    user: {}
  },

  onLoad() {
    if (!store.requireRole('student')) return
    this.setData({ user: store.getState().user })
    store.syncState().then(state => this.setData({ user: state.user })).catch(() => {})
  },

  goBack() {
    wx.navigateBack()
  },

  saveCertificate() {
    wx.showToast({ title: '证书图片生成中', icon: 'none' })
  }
})
