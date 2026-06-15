const data = require('../../utils/data')
const store = require('../../utils/store')

Page({
  data: {
    achievements: [],
    unlocked: 0
  },

  onShow() {
    store.syncCatalog().then(() => {
      this.refresh()
    }).catch(() => {
      this.refresh()
    })
  },

  refresh() {
    const achievements = data.achievements
    this.setData({
      achievements,
      unlocked: achievements.filter(item => item.unlocked).length
    })
  },

  goBack() {
    wx.navigateBack()
  },

  showAchievement(event) {
    const item = this.data.achievements.find(badge => badge.id === event.currentTarget.dataset.id)
    if (!item) return
    wx.showModal({
      title: item.name,
      content: item.unlocked ? `已解锁：${item.note}` : `解锁条件：${item.note}`,
      showCancel: false
    })
  }
})
