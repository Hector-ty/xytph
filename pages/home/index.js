const data = require('../../utils/data')
const store = require('../../utils/store')
const weatherService = require('../../utils/weather')

const participantQuickLinks = [
  { title: '个人中心', icon: '我', color: '#F07858', tab: '/pages/me/index' },
  { title: '我的成就', icon: '奖', color: '#E2A31E', route: '/pages/achievements/index' },
  { title: '资讯中心', icon: '讯', color: '#2B9DB5', route: '/pages/news/index' },
  { title: '积分规则', icon: '则', color: '#6D71C9', route: '/pages/rules/index' }
]

const operatorQuickLinks = [
  { title: '个人中心', icon: '我', color: '#F07858', tab: '/pages/me/index' },
  { title: '天气服务', icon: '天', color: '#2B91B9', route: '/pages/weather/index' },
  { title: '积分规则', icon: '则', color: '#6D71C9', route: '/pages/rules/index' },
  { title: '资讯中心', icon: '讯', color: '#2B9DB5', route: '/pages/news/index' }
]

const staffHomeActions = [
  { id: 'student', title: '扫描学生码', note: '核验学生身份与积分概况', icon: '码', color: '#2C9365' },
  { id: 'recycle', title: '循环登记', note: '按规则登记回收行为', icon: '循', color: '#E06E50' },
  { id: 'task', title: '现场任务核验', note: '登记授权现场任务', icon: '核', color: '#2E8EA8' },
  { id: 'reward', title: '兑换核销', note: '扫描二维码或输入数字码', icon: '兑', color: '#D99A22' },
  { id: 'records', title: '操作记录', note: '查看本人登记核销记录', icon: '录', color: '#6C77C8' }
].map(item => Object.assign({}, item, { route: `/pages/staff/index?action=${item.id}` }))

const adminHomeActions = [
  { id: 'activityConfig', title: '活动配置', note: '活动状态、时间和开关', icon: '活', color: '#2C9365' },
  { id: 'taskRules', title: '任务与积分规则', note: '查看任务规则与上限', icon: '规', color: '#2E8EA8' },
  { id: 'qrPoints', title: '二维码点位', note: '点位与二维码配置', icon: '码', color: '#477BC0' },
  { id: 'audit', title: '审核中心', note: '复审图片凭证', icon: '审', color: '#D99A22' },
  { id: 'rewardInventory', title: '奖品与库存', note: '库存与兑换状态', icon: '奖', color: '#E06E50' },
  { id: 'staffPermissions', title: '人员与权限', note: '工作人员授权清单', icon: '权', color: '#6C77C8' },
  { id: 'inviteCodes', title: '生成邀请码', note: '生成工作人员或管理员码', icon: '邀', color: '#5B8E55' },
  { id: 'exceptions', title: '异常与补录', note: '异常记录与待处理项', icon: '异', color: '#A35D9A' },
  { id: 'dataExport', title: '数据导出', note: '导出运营统计数据', icon: '出', color: '#218A68' },
  { id: 'operationLogs', title: '操作日志', note: '查看后台审计记录', icon: '志', color: '#7B6A47' },
  { id: 'stats', title: '数据统计', note: '查看参与与审核概览', icon: '统', color: '#2B91B9' }
].map(item => Object.assign({}, item, { route: `/pages/staff/index?action=${item.id}` }))

function getAccountMeta(auth) {
  const accountNo = auth.staffNo || auth.studentNo || ''
  return [auth.roleLabel, accountNo].filter(Boolean).join(' · ')
}

function todayStartMs() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

function getStaffSummaryCards(scopeValue, operationCount) {
  return [
    { label: '授权点位', value: scopeValue },
    { label: '今日操作', value: String(operationCount || 0) },
    { label: '可执行操作', value: `${staffHomeActions.length} 项` }
  ]
}

function getAdminSummaryCards(stats) {
  return [
    { label: '参与账号', value: String((stats && stats.registeredUsers) || 0) },
    { label: '待审凭证', value: String((stats && stats.pendingEvidence) || 0) },
    { label: '后台功能', value: `${adminHomeActions.length} 项` }
  ]
}

Page({
  data: {
    user: {},
    zones: [],
    completedCount: 0,
    roleHomeMode: 'participant',
    isParticipantHome: true,
    roleHomeTitle: '',
    roleHomeSubtitle: '',
    roleHomeNotice: '',
    roleSummaryCards: [],
    roleHomeActions: [],
    staffHomeOperationCount: 0,
    adminHomeStats: null,
    userMetaText: '',
    checkInWordArt: '/assets/brand/home-word-art/checkin.png',
    weatherCard: {
      aqi: '--',
      grade: '天气',
      note: '点击查看天气',
      icon: weatherService.WEATHER_ICONS.cloud
    },
    features: [
      { title: '低碳课堂', note: '答题赚积分', icon: '知', color: '#2B91B9', route: '/pages/quiz/index' },
      { title: '校园地图', note: '低碳点位', icon: '图', color: '#477BC0', route: '/pages/campus-map/index' },
      { title: '校园集卡', note: '解锁地标', icon: '卡', color: '#8A67B2', route: '/pages/cards/index' },
      { title: '普惠商城', note: '积分换好礼', icon: '商', color: '#E8912A', tab: '/pages/rewards/index' },
      { title: '减碳排行榜', note: '看看我的名次', icon: '榜', color: '#218A68', tab: '/pages/rankings/index' }
    ],
    quickLinks: participantQuickLinks
  },

  onShow() {
    if (!store.requireRegistered()) return
    this.refresh()
    this.loadWeatherCard(false)
    store.syncCatalog().then(() => this.refresh()).catch(() => this.refresh())
    store.syncState().then(() => this.refresh()).catch(() => this.refresh())
  },

  refresh() {
    const state = store.getState()
    const role = state.auth.role
    const isAdmin = role === 'admin'
    const isStaff = role === 'staff'
    const roleHomeMode = isAdmin ? 'admin' : (isStaff ? 'staff' : 'participant')
    const roleLabel = state.auth.roleLabel || store.getRoleLabel(role)
    const scopeValue = isAdmin
      ? '全校活动管理后台'
      : (state.auth.authorizedPoint || '卓越楼服务点')
    const userMetaText = (isAdmin || isStaff)
      ? getAccountMeta(Object.assign({}, state.auth, { roleLabel }))
      : `${state.user.badge || roleLabel || '低碳用户'} · ${state.user.points || 0} 积分`
    const roleSummaryCards = isAdmin
      ? getAdminSummaryCards(this.data.adminHomeStats)
      : getStaffSummaryCards(scopeValue, this.data.staffHomeOperationCount)
    const zones = data.zones.map(zone => {
      const zoneTasks = data.tasks.filter(task => task.zone === zone.code)
      const done = zoneTasks.filter(task => {
        const status = state.taskStates[task.id]
        return status === 'COMPLETED' || status === 'READY_TO_CLAIM' || status === 'PENDING_REVIEW'
      }).length
      return Object.assign({}, zone, {
        done,
        total: zoneTasks.length,
        wordArt: zone.wordArt || ''
      })
    })
    const completedCount = zones.filter(zone => zone.done > 0).length
    this.setData({
      user: state.user,
      zones,
      completedCount,
      roleHomeMode,
      isParticipantHome: roleHomeMode === 'participant',
      roleHomeTitle: isAdmin ? '管理员首页' : '工作人员首页',
      roleHomeSubtitle: isAdmin ? '仅保留后台配置、审核、库存、权限、导出和审计' : '仅保留现场扫码、登记、核验、核销和本人记录',
      roleHomeNotice: isAdmin
        ? '管理员首页不展示签到、学生任务、商城、排行榜等参与者功能。'
        : '工作人员首页不展示后台管理、学生成就、商城、排行榜等无权限功能。',
      roleSummaryCards: roleHomeMode === 'participant' ? [] : roleSummaryCards,
      roleHomeActions: isAdmin ? adminHomeActions : (isStaff ? staffHomeActions : []),
      quickLinks: roleHomeMode === 'participant' ? participantQuickLinks : operatorQuickLinks,
      userMetaText
    })

    this.refreshRoleHomeMetrics(roleHomeMode, scopeValue)
  },

  refreshRoleHomeMetrics(roleHomeMode, scopeValue) {
    if (roleHomeMode === 'participant') return

    const now = Date.now()
    const metricsKey = `${roleHomeMode}:${scopeValue}`
    if (this.roleHomeMetricsKey === metricsKey && now - (this.roleHomeMetricsAt || 0) < 5000) return
    this.roleHomeMetricsKey = metricsKey
    this.roleHomeMetricsAt = now

    if (roleHomeMode === 'admin') {
      store.getAdminStatsAsync().then(result => {
        if (this.data.roleHomeMode !== 'admin') return
        const stats = result.stats || {}
        this.setData({
          adminHomeStats: stats,
          roleSummaryCards: getAdminSummaryCards(stats)
        })
      }).catch(() => {})
      return
    }

    store.listStaffLogsAsync({ scope: 'mine', todayStart: todayStartMs() }).then(result => {
      if (this.data.roleHomeMode !== 'staff') return
      const operationCount = (result.items || []).length
      this.setData({
        staffHomeOperationCount: operationCount,
        roleSummaryCards: getStaffSummaryCards(scopeValue, operationCount)
      })
    }).catch(() => {})
  },

  goTarget(event) {
    const { route, tab } = event.currentTarget.dataset
    if (tab) {
      wx.navigateTo({ url: tab })
      return
    }
    wx.navigateTo({ url: route })
  },

  goWeather() {
    wx.navigateTo({ url: '/pages/weather/index' })
  },

  loadWeatherCard(force) {
    return weatherService.loadWeatherBundle({ force }).then(bundle => {
      this.setData({
        weatherCard: {
          aqi: bundle.summary.aqi,
          grade: bundle.summary.aqiBadge,
          note: bundle.summary.conditionNote,
          icon: bundle.summary.icon
        }
      })
    }).catch(() => {
      this.setData({
        weatherCard: {
          aqi: '--',
          grade: '天气',
          note: '点击查看天气',
          icon: weatherService.WEATHER_ICONS.cloud
        }
      })
    })
  },

  goZone(event) {
    if (!store.requireRole('student')) return
    wx.setStorageSync('selectedZone', event.currentTarget.dataset.zone)
    wx.navigateTo({ url: '/pages/tasks/index' })
  },

  handleCheckIn() {
    if (!store.requireRole('student')) return
    store.checkInAsync().then(result => {
    if (result.changed) {
      wx.showToast({ title: '签到成功，积分 +3', icon: 'success' })
      this.refresh()
      return
    }
    wx.showToast({ title: '今天已经签到啦', icon: 'none' })
    })
  }
})
