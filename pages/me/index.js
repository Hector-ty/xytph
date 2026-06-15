const store = require('../../utils/store')

const baseMenus = [
  { title: '身份资料', note: '学院与校园身份', icon: '身', color: '#2D9868', route: '/pages/profile/index' },
  { title: '我的成就', note: '已获得的低碳徽章', icon: '奖', color: '#E0A020', route: '/pages/achievements/index' },
  { title: '校园集卡', note: '解锁校园地标', icon: '卡', color: '#7B6BB8', route: '/pages/cards/index' },
  { title: '活动证书', note: '查看低碳日证书', icon: '证', color: '#2C8FA8', route: '/pages/certificate/index' }
]

const roleMenus = {
  staff: { title: '工作人员工作台', note: '现场登记、核验与核销', icon: '工', color: '#E26F51', route: '/pages/staff/index' },
  admin: { title: '管理员工作台', note: '配置、审核、库存与日志', icon: '管', color: '#E26F51', route: '/pages/staff/index' }
}

const commonMenus = [
  { title: '切换身份', note: '重新选择学生、老师、工作人员或管理员', icon: '切', color: '#24966B', action: 'switchIdentity' },
  { title: '帮助与规则', note: '积分与任务说明', icon: '问', color: '#6480A8', route: '/pages/rules/index' }
]

Page({
  data: {
    user: {},
    roleLabel: '',
    doneCount: 0,
    pendingCount: 0,
    cardCount: 0,
    menus: []
  },

  onShow() {
    if (!store.requireRegistered()) return
    this.refresh()
    store.syncState().then(() => this.refresh()).catch(() => this.refresh())
  },

  refresh() {
    const state = store.getState()
    const statuses = Object.values(state.taskStates || {})
    const role = state.auth.role
    const menus = baseMenus
      .concat(roleMenus[role] ? [roleMenus[role]] : [])
      .concat(commonMenus)
    this.setData({
      user: state.user,
      roleLabel: state.auth.roleLabel || store.getRoleLabel(role),
      doneCount: statuses.filter(status => status === 'COMPLETED').length,
      pendingCount: statuses.filter(status => status === 'PENDING_REVIEW').length,
      cardCount: (state.cards || []).length,
      menus
    })
  },

  go(event) {
    const { route, action } = event.currentTarget.dataset
    if (action === 'switchIdentity') {
      wx.showModal({
        title: '切换身份',
        content: '将返回身份选择页，已绑定身份可直接切换；未绑定身份需先注册。',
        confirmText: '去切换',
        success: result => {
          if (!result.confirm) return
          wx.reLaunch({ url: '/pages/auth/index?mode=identity' })
        }
      })
      return
    }
    if (route === '/pages/staff/index' && !store.requireRole(['staff', 'admin'])) return
    wx.navigateTo({ url: route })
  },

  showStudentCode() {
    store.getStudentCodeAsync().then(result => {
      const user = result.user || this.data.user
      wx.showModal({
        title: '学生码',
        content: `${user.name || ''} · ${user.college || ''}\nCode: ${result.code}`,
        showCancel: false
      })
    }).catch(error => {
      wx.showToast({ title: error && error.message ? error.message : '学生码获取失败', icon: 'none' })
    })
  }
})
