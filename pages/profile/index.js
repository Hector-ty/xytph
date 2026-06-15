const store = require('../../utils/store')
const data = require('../../utils/data')

Page({
  data: {
    user: {},
    name: '',
    collegeIndex: 0,
    colleges: []
  },

  onLoad() {
    if (!store.requireRegistered()) return
    this.loadColleges()
    this.refreshFromState(store.getState())
    store.syncState().then(state => this.refreshFromState(state)).catch(() => {})
  },

  loadColleges() {
    store.getConfigAsync('colleges').then(result => {
      const user = store.getState().user
      const college = data.normalizeCollegeName(user.college)
      const colleges = data.getColleges(result.value, college)
      this.setData({
        colleges,
        collegeIndex: data.getDefaultCollegeIndex(colleges, college)
      })
    }).catch(() => {
      const user = store.getState().user
      const college = data.normalizeCollegeName(user.college)
      const colleges = data.getColleges(null, college)
      this.setData({
        colleges,
        collegeIndex: data.getDefaultCollegeIndex(colleges, college)
      })
    })
  },

  refreshFromState(state) {
    const user = state.user || {}
    const college = data.normalizeCollegeName(user.college)
    const colleges = data.getColleges(this.data.colleges, college)
    const collegeIndex = data.getDefaultCollegeIndex(colleges, college)
    this.setData({ user, name: user.name, colleges, collegeIndex })
  },

  goBack() {
    wx.navigateBack()
  },

  onNameInput(event) {
    this.setData({ name: event.detail.value })
  },

  onCollegeChange(event) {
    this.setData({ collegeIndex: Number(event.detail.value) })
  },

  save() {
    const name = this.data.name.trim()
    const college = this.data.colleges[this.data.collegeIndex]
    if (!name) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    if (!college) {
      wx.showToast({ title: '学院未配置', icon: 'none' })
      return
    }
    store.updateUserAsync({ name, college }).then(() => {
      wx.showToast({ title: '资料已保存', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 500)
    }).catch(error => {
      wx.showToast({ title: error && error.message ? error.message : '保存失败', icon: 'none' })
    })
  }
})
