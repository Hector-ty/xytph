const store = require('../../utils/store')
const data = require('../../utils/data')

function normalizeCardCatalog(value) {
  if (!Array.isArray(value) || !value.length) return data.cards

  const defaultCards = data.cards.reduce((result, item) => {
    result[item.id] = item
    return result
  }, {})

  return value.map(item => {
    const safeItem = item && typeof item === 'object' ? item : {}
    if (!safeItem.id) return null
    return Object.assign({}, defaultCards[safeItem.id] || {}, safeItem)
  }).filter(Boolean)
}

Page({
  data: {
    cards: [],
    unlocked: 0
  },

  onShow() {
    if (!store.requireRole('student')) return
    this.loadCardCatalog()
    this.refresh()
    store.syncState().then(() => this.refresh()).catch(() => this.refresh())
  },

  refresh() {
    const unlockedIds = store.getState().cards || []
    const catalog = this.catalogCards || []
    this.setData({
      cards: catalog.map(item => Object.assign({}, item, { unlocked: unlockedIds.indexOf(item.id) >= 0 })),
      unlocked: unlockedIds.length
    })
  },

  loadCardCatalog() {
    store.getConfigAsync('cards').then(result => {
      this.catalogCards = normalizeCardCatalog(result.value)
      this.refresh()
    }).catch(() => {
      this.catalogCards = data.cards
      this.refresh()
    })
  },

  goBack() {
    wx.navigateBack()
  },

  drawCard() {
    const locked = this.data.cards.filter(item => !item.unlocked)
    if (!locked.length) {
      wx.showToast({ title: '暂无可抽取卡片', icon: 'none' })
      return
    }
    const item = locked[Math.floor(Math.random() * locked.length)]
    store.addCardAsync(item.id).then(() => {
      wx.showModal({
        title: '解锁新卡片',
        content: `恭喜获得「${item.name}」校园卡片！`,
        confirmText: '收下卡片',
        showCancel: false,
        success: () => this.refresh()
      })
    }).catch(error => {
      wx.showToast({ title: error && error.message ? error.message : '抽卡失败', icon: 'none' })
    })
  },

  showCard(event) {
    const item = this.data.cards.find(card => card.id === event.currentTarget.dataset.id)
    if (!item) return
    wx.showModal({
      title: item.unlocked ? item.name : '尚未解锁',
      content: item.unlocked ? item.note : '完成任务或参与每日抽卡后可解锁。',
      showCancel: false
    })
  }
})
