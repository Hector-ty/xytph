const data = require('../../utils/data')
const store = require('../../utils/store')

const statusLabels = {
  NOT_STARTED: '去完成',
  IN_PROGRESS: '进行中',
  PENDING_REVIEW: '待复审',
  READY_TO_CLAIM: '待领取',
  COMPLETED: '已领取',
  REJECTED: '需重提',
  LIMIT_REACHED: '已达上限',
  EXPIRED: '已过期'
}

const progressByStatus = {
  NOT_STARTED: 0,
  IN_PROGRESS: 50,
  PENDING_REVIEW: 100,
  READY_TO_CLAIM: 100,
  COMPLETED: 100,
  REJECTED: 0,
  LIMIT_REACHED: 0,
  EXPIRED: 0
}

function normalizeProgress(value) {
  const progress = Number(value)
  if (!Number.isFinite(progress)) return 0
  return Math.max(0, Math.min(100, Math.round(progress)))
}

function getTaskProgress(task, status, state) {
  const taskId = task && task.id
  const stateProgress = taskId && state.taskProgress && state.taskProgress[taskId]
  if (stateProgress !== undefined && stateProgress !== null) {
    return normalizeProgress(stateProgress)
  }
  return normalizeProgress(progressByStatus[status])
}

Page({
  data: {
    zones: data.zones,
    selectedZone: 'GREEN_TRAVEL',
    selectedZoneInfo: {},
    tasks: [],
    summary: { done: 0, pending: 0, claimable: 0, points: 0 },
    claimingTaskId: ''
  },

  onShow() {
    if (!store.requireRole('student')) return
    const selected = wx.getStorageSync('selectedZone')
    if (selected) {
      wx.removeStorageSync('selectedZone')
      this.setData({ selectedZone: selected })
    }
    this.refresh()
    store.syncCatalog().then(() => this.refresh()).catch(() => this.refresh())
    store.syncState().then(() => this.refresh()).catch(() => this.refresh())
  },

  refresh() {
    const state = store.getState()
    const selectedZoneInfo = data.zones.find(zone => zone.code === this.data.selectedZone) || data.zones[0] || {}
    const tasks = data.tasks
      .filter(task => selectedZoneInfo.code && task.zone === selectedZoneInfo.code)
      .map(task => {
        const status = state.taskStates[task.id] || 'NOT_STARTED'
        const claimedPoints = Number((state.taskPoints || {})[task.id] || 0)
        const canClaim = status === 'READY_TO_CLAIM' || (status === 'COMPLETED' && !claimedPoints)
        const progress = getTaskProgress(task, status, state)
        return Object.assign({}, task, {
          status,
          statusLabel: statusLabels[status] || statusLabels.NOT_STARTED,
          pointsLabel: task.pointsLabel || `+${task.points}`,
          zoneColor: selectedZoneInfo.color,
          zonePale: selectedZoneInfo.pale,
          claimedPoints,
          progress,
          canClaim,
          claimButtonLabel: this.getClaimButtonLabel(status, claimedPoints, canClaim)
        })
      })
    const allStates = data.tasks.map(task => state.taskStates[task.id] || 'NOT_STARTED')
    const summary = {
      done: allStates.filter(status => status === 'COMPLETED' || status === 'READY_TO_CLAIM').length,
      pending: allStates.filter(status => status === 'PENDING_REVIEW').length,
      claimable: allStates.filter(status => status === 'READY_TO_CLAIM').length,
      points: Object.keys(state.taskPoints || {}).reduce((sum, key) => sum + state.taskPoints[key], 0)
    }
    this.setData({ zones: data.zones, selectedZoneInfo, tasks, summary })
  },

  getClaimButtonLabel(status, claimedPoints, canClaim) {
    if (claimedPoints) return '已领取'
    if (canClaim) return '领取积分'
    if (status === 'PENDING_REVIEW') return '复审中'
    if (status === 'REJECTED') return '重新完成后领'
    return '做完后领取'
  },

  selectZone(event) {
    this.setData({ selectedZone: event.currentTarget.dataset.zone }, () => this.refresh())
  },

  openTask(event) {
    wx.navigateTo({ url: `/pages/task-detail/index?id=${event.currentTarget.dataset.id}` })
  },

  claimTask(event) {
    const taskId = event.currentTarget.dataset.id
    const task = this.data.tasks.find(item => item.id === taskId)
    if (!task) return
    if (!task.canClaim) {
      wx.showToast({ title: task.claimButtonLabel, icon: 'none' })
      return
    }

    this.setData({ claimingTaskId: taskId })
    store.claimTaskPointsAsync(task).then(result => {
      this.setData({ claimingTaskId: '' })
      if (result.code === 'LIMIT_REACHED') {
        wx.showToast({ title: '今日专区积分已达上限', icon: 'none' })
        this.refresh()
        return
      }
      wx.showToast({
        title: result.changed ? `领取成功 +${result.points || task.points}` : '已经领取过啦',
        icon: result.changed ? 'success' : 'none'
      })
      this.refresh()
    }).catch(() => {
      this.setData({ claimingTaskId: '' })
      wx.showToast({ title: '领取失败，请稍后重试', icon: 'none' })
    })
  },

  goRules() {
    wx.navigateTo({ url: '/pages/rules/index' })
  }
})
