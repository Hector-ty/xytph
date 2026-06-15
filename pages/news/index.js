const data = require('../../utils/data')
const store = require('../../utils/store')

Page({
  data: {
    news: []
  },

  onShow() {
    store.syncCatalog().then(() => {
      this.setData({ news: data.news })
    }).catch(() => {
      this.setData({ news: data.news })
    })
  },

  goBack() {
    wx.navigateBack()
  },

  openArticle(event) {
    const article = this.data.news.find(item => String(item.id) === String(event.currentTarget.dataset.id))
    if (!article) return
    wx.showModal({
      title: article.title,
      content: article.summary || '',
      confirmText: '知道了',
      showCancel: false
    })
  }
})
