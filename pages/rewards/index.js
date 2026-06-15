const data = require('../../utils/data')
const store = require('../../utils/store')
const qrcode = require('../../utils/qrcode')

const rewardImageById = {
  reward_beautiful_china_cup: '/assets/rewards/reward-1.jpg',
  reward_mountain_water_cup: '/assets/rewards/reward-2.jpg',
  reward_low_carbon_day_cup: '/assets/rewards/reward-3.jpg',
  reward_ceramic_cup: '/assets/rewards/reward-4.jpg',
  reward_canvas_bag: '/assets/rewards/reward-5.jpg',
  reward_mouse_pad: '/assets/rewards/reward-6.jpg',
  reward_ticket: '/assets/rewards/reward-ticket.png'
}

const rewardImageRules = [
  { pattern: /美丽中国/, image: '/assets/rewards/reward-1.jpg' },
  { pattern: /小山小水/, image: '/assets/rewards/reward-2.jpg' },
  { pattern: /低碳日.*杯|全国低碳日.*杯/, image: '/assets/rewards/reward-3.jpg' },
  { pattern: /陶瓷杯|马克杯/, image: '/assets/rewards/reward-4.jpg' },
  { pattern: /帆布袋|环保袋|手提袋/, image: '/assets/rewards/reward-5.jpg' },
  { pattern: /徽章|纪念章|鼠标垫/, image: '/assets/rewards/reward-6.jpg' },
  { pattern: /蒙超|门票|球票/, image: '/assets/rewards/reward-ticket.png' },
  { pattern: /花种|种子|盲盒|绿植/, image: '/assets/weather/seedling.png' }
]

const rewardColors = ['#dff4e9', '#fff1bf', '#dff0f7', '#f4e2ea', '#e7f3d5', '#e9ecff']

function normalizeImagePath(image) {
  const value = String(image || '').trim()
  if (!value) return ''
  if (/^(https?:\/\/|cloud:\/\/|\/)/.test(value)) return value
  return `/${value.replace(/^\.?\//, '')}`
}

function getFallbackImage(reward) {
  const id = String(reward.id || '')
  if (rewardImageById[id]) return rewardImageById[id]

  const text = `${reward.name || ''} ${reward.note || ''}`
  const rule = rewardImageRules.find(item => item.pattern.test(text))
  return rule ? rule.image : '/assets/brand/xiaoshui.png'
}

function buildInventoryMap(inventory) {
  return (Array.isArray(inventory) ? inventory : []).reduce((map, item) => {
    const id = String((item && item.id) || '').trim()
    if (id) map[id] = item
    return map
  }, {})
}

function getRewardStockInfo(reward, inventoryMap) {
  const source = reward || {}
  const id = String(source.id || '').trim()
  const inventory = id && inventoryMap ? inventoryMap[id] : null
  const stock = Number(
    inventory && inventory.stock !== undefined ? inventory.stock : source.stock || 0
  )
  const remainingStock = Math.max(0, Number(
    inventory && inventory.remainingStock !== undefined ? inventory.remainingStock : stock
  ))
  return {
    stock,
    remainingStock,
    stockText: `剩余库存：${remainingStock}`
  }
}

function normalizeReward(reward, index, inventoryMap) {
  const item = Object.assign({}, reward && typeof reward === 'object' ? reward : {})
  const stockInfo = getRewardStockInfo(item, inventoryMap)
  item.image = normalizeImagePath(item.image) || getFallbackImage(item)
  item.color = item.color || rewardColors[index % rewardColors.length]
  item.isWide = item.id === 'reward_ticket'
  item.stock = stockInfo.stock
  item.remainingStock = stockInfo.remainingStock
  item.stockText = stockInfo.stockText
  item.outOfStock = item.remainingStock <= 0
  return item
}

function normalizeRewards(rewards, inventoryMap) {
  const normalized = (Array.isArray(rewards) ? rewards : [])
    .map((reward, index) => normalizeReward(reward, index, inventoryMap))
  return normalized
    .filter(item => item.id === 'reward_ticket')
    .concat(normalized.filter(item => item.id !== 'reward_ticket'))
}

function normalizeExchangeLocation(value) {
  return Object.assign({}, data.exchangeLocation)
}

function getTicketSpotlight(rewards, inventoryMap) {
  return normalizeRewards(rewards, inventoryMap).find(item => item.id === 'reward_ticket') || {}
}

function getRedemptionCode(item) {
  return String(item.verifyCode || item.code || '').trim()
}

function getRedemptionPayload(item) {
  return String(item.qrPayload || (getRedemptionCode(item) ? `IMU-RDM:${getRedemptionCode(item)}` : '')).trim()
}

function createQrGrid(payload) {
  if (!payload) return null
  try {
    return qrcode.createGrid(payload)
  } catch (error) {
    return null
  }
}

function getRedemptionStatusText(status) {
  if (status === 'REDEEMED') return '已核销'
  if (status === 'EXPIRED') return '已过期'
  if (status === 'CANCELLED') return '已取消'
  return status || ''
}

function normalizeRedemption(item) {
  const source = Object.assign({}, item || {})
  const qrPayload = getRedemptionPayload(source)
  source.verifyCode = getRedemptionCode(source)
  source.qrPayload = qrPayload
  source.isPending = source.status === '待核销'
  source.statusText = getRedemptionStatusText(source.status)
  source.qrGrid = source.isPending ? createQrGrid(qrPayload) : null
  return source
}

Page({
  data: {
    user: {},
    rewards: normalizeRewards(data.rewards),
    redemptions: [],
    exchangeLocation: null,
    selectedTab: 'rewards',
    showTicketSpotlight: false,
    showCodePreview: false,
    codePreview: null,
    ticketSpotlight: getTicketSpotlight(data.rewards)
  },

  onShow() {
    if (!store.requireRole('student')) return
    this.loadExchangeLocation()
    this.refresh()
    this.loadRewardInventory()
    this.showTicketSpotlightOnce()
    store.syncCatalog().then(() => {
      this.refresh()
      this.loadRewardInventory()
    }).catch(() => this.refresh())
    store.syncState().then(() => this.refresh()).catch(() => this.refresh())
  },

  onHide() {
    this.clearTicketSpotlightTimer()
  },

  onUnload() {
    this.clearTicketSpotlightTimer()
  },

  loadExchangeLocation() {
    store.getConfigAsync('exchangeLocation').then(result => {
      const exchangeLocation = normalizeExchangeLocation(result && result.value)
      this.exchangeLocation = exchangeLocation
      this.setData({ exchangeLocation })
    }).catch(() => {
      const exchangeLocation = normalizeExchangeLocation(data.exchangeLocation)
      this.exchangeLocation = exchangeLocation
      this.setData({ exchangeLocation })
    })
  },

  loadRewardInventory() {
    return store.getRewardInventoryAsync().then(result => {
      this.rewardInventoryMap = buildInventoryMap(result && result.inventory)
      this.refresh()
    }).catch(() => {})
  },

  refresh() {
    const state = store.getState()
    const rewards = normalizeRewards(data.rewards, this.rewardInventoryMap)
    this.setData({
      user: state.user,
      rewards,
      redemptions: (state.redemptions || []).map(normalizeRedemption),
      ticketSpotlight: rewards.find(item => item.id === 'reward_ticket') || {}
    })
  },

  selectTab(event) {
    this.setData({ selectedTab: event.currentTarget.dataset.tab })
  },

  handleRewardImageError(event) {
    const index = Number(event.currentTarget.dataset.index)
    const reward = this.data.rewards[index]
    if (!reward) return

    const fallbackImage = getFallbackImage(reward)
    if (!fallbackImage || reward.image === fallbackImage) return

    this.setData({
      [`rewards[${index}].image`]: fallbackImage
    })
  },

  showTicketSpotlightOnce() {
    if (this.ticketSpotlightShown || this.data.showTicketSpotlight) return
    this.clearTicketSpotlightTimer()
    this.ticketSpotlightTimer = setTimeout(() => {
      this.ticketSpotlightShown = true
      this.setData({ showTicketSpotlight: true })
    }, 360)
  },

  clearTicketSpotlightTimer() {
    if (!this.ticketSpotlightTimer) return
    clearTimeout(this.ticketSpotlightTimer)
    this.ticketSpotlightTimer = null
  },

  dismissTicketSpotlight() {
    this.clearTicketSpotlightTimer()
    this.setData({ showTicketSpotlight: false })
  },

  noop() {},

  redeem(event) {
    const rewardId = event.currentTarget.dataset.id
    const reward = this.data.rewards.find(item => item.id === rewardId)
      || data.rewards.find(item => item.id === rewardId)
    if (!reward) {
      wx.showToast({ title: '奖品未配置', icon: 'none' })
      return
    }
    if (Number(reward.remainingStock || 0) <= 0) {
      wx.showToast({ title: '库存不足', icon: 'none' })
      this.loadRewardInventory()
      return
    }

    wx.showModal({
      title: '确认兑换',
      content: `使用 ${reward.points} 积分兑换「${reward.name}」？兑换后请在活动服务点出示兑换码。`,
      confirmText: '确认兑换',
      success: result => {
        if (!result.confirm) return
        store.redeemAsync(reward).then(response => {
          if (response.ok) {
            wx.showToast({ title: '兑换成功', icon: 'success' })
            this.refresh()
            this.loadRewardInventory()
            return
          }
          const title = response.code === 'INSUFFICIENT_POINTS'
            ? '积分不足'
            : (response.code === 'OUT_OF_STOCK' ? '库存不足' : '兑换失败')
          wx.showToast({ title, icon: 'none' })
          if (response.code === 'OUT_OF_STOCK') this.loadRewardInventory()
        }).catch(error => {
          wx.showToast({ title: error && error.message ? error.message : '兑换失败', icon: 'none' })
        })
      }
    })
  },

  showCode(event) {
    const item = this.data.redemptions.find(record => record.id === event.currentTarget.dataset.id)
    if (!item) return
    const code = getRedemptionCode(item)
    if (!item.isPending) {
      wx.showModal({
        title: '兑换记录',
        content: `${item.name || '奖品'}\n${item.statusText || ''}${code ? `\n核销码：${code}` : ''}`,
        showCancel: false
      })
      return
    }

    this.setData({
      showCodePreview: true,
      codePreview: Object.assign({}, item, {
        verifyCode: code,
        qrPayload: getRedemptionPayload(item),
        qrGrid: createQrGrid(getRedemptionPayload(item))
      })
    })
  },

  hideCodePreview() {
    this.setData({
      showCodePreview: false,
      codePreview: null
    })
  },

  navigateExchangePoint() {
    const exchangeLocation = this.exchangeLocation
    if (!exchangeLocation || !exchangeLocation.latitude || !exchangeLocation.longitude) {
      wx.showToast({ title: '兑换点未配置', icon: 'none' })
      return
    }

    wx.openLocation({
      latitude: exchangeLocation.latitude,
      longitude: exchangeLocation.longitude,
      name: exchangeLocation.name || '',
      address: exchangeLocation.address || '',
      scale: 18,
      fail: () => {
        wx.showToast({ title: '暂时无法打开导航', icon: 'none' })
      }
    })
  },

  goRules() {
    wx.navigateTo({ url: '/pages/rules/index' })
  }
})
