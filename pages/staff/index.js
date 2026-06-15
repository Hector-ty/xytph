const data = require('../../utils/data')
const store = require('../../utils/store')

const staffActions = [
  { id: 'student', title: '扫描学生码', note: '核验脱敏身份与积分概况', icon: '码', color: '#2C9365' },
  { id: 'recycle', title: '循环登记', note: '选择物品后扫描学生码', icon: '循', color: '#E06E50' },
  { id: 'task', title: '现场任务核验', note: '选择授权任务并登记', icon: '核', color: '#2E8EA8' },
  { id: 'reward', title: '兑换核销', note: '扫描二维码或输入数字码', icon: '兑', color: '#D99A22' },
  { id: 'records', title: '操作记录', note: '查看本人今日登记核销', icon: '录', color: '#6C77C8' }
]

const adminActions = [
  { id: 'activityConfig', title: '活动配置', note: '状态、时间与功能开关', icon: '活', color: '#2C9365' },
  { id: 'taskRules', title: '任务与积分规则', note: '发布任务、规则和上限', icon: '规', color: '#2E8EA8' },
  { id: 'qrPoints', title: '二维码点位', note: '点位、类型和有效期配置', icon: '码', color: '#477BC0' },
  { id: 'audit', title: '审核中心', note: '复审图片凭证与驳回原因', icon: '审', color: '#D99A22' },
  { id: 'rewardInventory', title: '奖品与库存', note: '库存、上架和兑换规则', icon: '奖', color: '#E06E50' },
  { id: 'staffPermissions', title: '人员与权限', note: '工作人员与管理员授权', icon: '权', color: '#6C77C8' },
  { id: 'inviteCodes', title: '生成邀请码', note: '生成工作人员或管理员码', icon: '邀', color: '#5B8E55' },
  { id: 'exceptions', title: '异常与补录', note: '重复、驳回和库存异常', icon: '异', color: '#A35F9B' },
  { id: 'dataExport', title: '数据导出', note: '汇总、榜单和日志口径', icon: '导', color: '#2C8FA8' },
  { id: 'operationLogs', title: '操作日志', note: '查看后台与现场审计', icon: '志', color: '#6B7C93' },
  { id: 'stats', title: '数据统计', note: '参与、积分和兑换概览', icon: '数', color: '#24966B' }
]

const recycleOptions = [
  { label: '旧书 1 本', taskId: 'recycle_books', quantity: 1, unit: '本' },
  { label: '旧衣 1 kg', taskId: 'recycle_clothes', quantity: 1, unit: 'kg' },
  { label: '纸箱 3 个', taskId: 'recycle_boxes', quantity: 3, unit: '个' }
]

const fieldTaskOptions = [
  { label: '校园健步走', taskId: 'green_walk' },
  { label: '拒绝一次性餐具', taskId: 'plastic_cutlery' },
  { label: '低碳餐选择', taskId: 'plastic_meal' },
  { label: '宿舍低碳承诺', taskId: 'dorm_promise' },
  { label: '节水节电报修', taskId: 'dorm_report' }
]

const actionLabels = {
  student: '学生码核验',
  recycle: '循环登记',
  task: '现场核验',
  reward: '兑换核销'
}

function todayStartMs() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

function compactJson(value) {
  if (!value || (typeof value === 'object' && !Object.keys(value).length)) return '暂无已发布配置'
  return JSON.stringify(value, null, 2).slice(0, 520)
}

Page({
  data: {
    role: '',
    roleLabel: '',
    homeTitle: '工作人员工作台',
    homeSubtitle: '仅显示当前身份可执行功能',
    scopeLabel: '今日授权点位',
    scopeValue: '卓越楼服务点',
    countLabel: '今日操作',
    operationCount: 0,
    actions: staffActions,
    summaryCards: [],
    noticeText: '',
    auditItems: [],
    auditLoading: false,
    adminStats: null,
    operationLogs: [],
    logLoading: false,
    loadingAction: ''
  },

  onLoad(options) {
    this.pendingActionId = options && options.action ? options.action : ''
  },

  onShow() {
    if (!store.requireRole(['staff', 'admin'])) return
    this.refresh()
    this.consumePendingAction()
    store.syncCatalog().then(() => this.refresh()).catch(() => this.refresh())
    store.syncState().then(() => this.refresh()).catch(() => this.refresh())
  },

  refresh() {
    const state = store.getState()
    const role = state.auth.role
    const isAdmin = role === 'admin'
    const roleLabel = state.auth.roleLabel || store.getRoleLabel(role)
    const scopeValue = isAdmin
      ? '全校活动管理后台'
      : (state.auth.authorizedPoint || '卓越楼服务点')

    this.setData({
      role,
      roleLabel,
      homeTitle: isAdmin ? '管理员工作台' : '工作人员工作台',
      homeSubtitle: isAdmin ? '活动配置、审核、库存和审计' : '现场登记、核验、核销和本人记录',
      scopeLabel: isAdmin ? '管理范围' : '今日授权点位',
      scopeValue,
      actions: isAdmin ? adminActions : staffActions,
      noticeText: isAdmin
        ? '管理员首页只保留后台管理能力；现场扫码登记请使用工作人员身份执行。'
        : '工作人员不能手填最终积分，登记后由云端按任务规则、上限和幂等约束计算。'
    })

    this.loadOperationLogs(isAdmin)
    if (isAdmin) {
      this.loadAdminStats()
      this.loadAuditItems()
    } else {
      this.setStaffSummary()
    }
  },

  consumePendingAction() {
    const actionId = this.pendingActionId
    if (!actionId) return
    const action = this.data.actions.find(item => item.id === actionId)
    this.pendingActionId = ''
    if (!action) return

    setTimeout(() => {
      this.runAction({ currentTarget: { dataset: { id: actionId } } })
    }, 80)
  },

  setStaffSummary() {
    this.setData({
      summaryCards: [
        { label: '授权能力', value: '4 项' },
        { label: '本人记录', value: String(this.data.operationLogs.length) },
        { label: '审计日志', value: '已开启' }
      ]
    })
  },

  setAdminSummary(stats) {
    const roleCounts = (stats && stats.roleCounts) || {}
    this.setData({
      summaryCards: [
        { label: '参与账号', value: String((stats && stats.registeredUsers) || 0) },
        { label: '待审凭证', value: String((stats && stats.pendingEvidence) || 0) },
        { label: '工作人员', value: String((roleCounts.staff || 0) + (roleCounts.admin || 0)) }
      ]
    })
  },

  loadAdminStats() {
    return store.getAdminStatsAsync()
      .then(result => {
        const stats = result.stats || {}
        this.setData({ adminStats: stats })
        this.setAdminSummary(stats)
        return stats
      })
      .catch(error => {
        wx.showToast({ title: error && error.message ? error.message : '统计加载失败', icon: 'none' })
        return null
      })
  },

  loadOperationLogs(all) {
    this.setData({ logLoading: true })
    return store.listStaffLogsAsync({
      scope: all ? 'all' : 'mine',
      todayStart: todayStartMs()
    }).then(result => {
      const operationLogs = (result.items || []).map(item => Object.assign({}, item, {
        actionLabel: actionLabels[item.actionId] || item.actionId || '操作',
        shortLabel: (actionLabels[item.actionId] || item.actionId || '操').slice(0, 1),
        timeText: this.formatTime(item.createdAtMs),
        resultText: this.getOperationResultText(item)
      }))
      this.setData({
        operationLogs,
        operationCount: operationLogs.length,
        logLoading: false
      })
      if (!all) this.setStaffSummary()
      return operationLogs
    }).catch(error => {
      this.setData({ logLoading: false })
      wx.showToast({ title: error && error.message ? error.message : '记录加载失败', icon: 'none' })
      return []
    })
  },

  loadAuditItems() {
    this.setData({ auditLoading: true })
    return store.listAuditEvidenceAsync()
      .then(result => {
        const auditItems = (result.items || []).map(item => this.enrichAuditItem(item))
        this.setData({ auditItems, auditLoading: false })
        return auditItems
      })
      .catch(error => {
        this.setData({ auditLoading: false })
        wx.showToast({ title: error && error.message ? error.message : '审核列表加载失败', icon: 'none' })
        return []
      })
  },

  formatTime(timestamp) {
    if (!timestamp) return '刚刚'
    const date = new Date(Number(timestamp))
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${hour}:${minute}`
  },

  getOperationResultText(item) {
    if (item.resultCode === 'OK') return item.points ? `完成 +${item.points}` : '已完成'
    if (item.resultCode === 'DUPLICATE_ACTION') return '重复操作'
    if (item.resultCode === 'LIMIT_REACHED') return '已达上限'
    if (item.resultCode === 'STUDENT_CODE_NOT_FOUND') return '学生码无效'
    if (item.resultStatus === 'REDEEMED') return '已核销'
    return item.resultStatus || item.resultCode || '已记录'
  },

  getAiMeta(aiReview) {
    if (!aiReview) return { label: '待人工复审', className: 'manual', reason: '' }
    if (aiReview.passed === true) return { label: 'AI初审通过', className: 'pass', reason: aiReview.reason || aiReview.summary || '' }
    if (aiReview.passed === false) return { label: 'AI初审未通过', className: 'reject', reason: aiReview.reason || aiReview.summary || '' }
    return { label: aiReview.label || '待人工复审', className: 'manual', reason: aiReview.reason || aiReview.summary || '' }
  },

  enrichAuditItem(item) {
    const task = data.tasks.find(taskItem => taskItem.id === item.taskId) || {}
    const zone = data.zones.find(zoneItem => zoneItem.code === (item.zone || task.zone)) || {}
    const aiMeta = this.getAiMeta(item.aiReview)
    return Object.assign({}, item, {
      taskName: item.taskName || task.name || '任务凭证',
      zoneName: zone.name || '低碳任务',
      zoneColor: zone.color || '#2C9365',
      points: Number(item.points || task.points || 0),
      imageSrc: item.imageSrc || item.tempFilePath || item.imageUrl || item.fileId,
      submittedText: this.formatTime(item.submittedAt),
      aiLabel: aiMeta.label,
      aiClass: aiMeta.className,
      aiReason: aiMeta.reason,
      statusLabel: item.status === 'COMPLETED'
        ? '已通过'
        : item.status === 'READY_TO_CLAIM'
          ? '待领取'
          : item.status === 'REJECTED'
            ? '已驳回'
            : '待复审'
    })
  },

  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.reLaunch({ url: '/pages/home/index' })
  },

  selectOption(options) {
    return new Promise((resolve, reject) => {
      wx.showActionSheet({
        itemList: options.map(item => item.label),
        success: result => resolve(options[result.tapIndex]),
        fail: reject
      })
    })
  },

  scanCode(title) {
    return new Promise((resolve, reject) => {
      wx.scanCode({
        scanType: ['qrCode', 'barCode'],
        success: result => resolve(result.result || result.path || ''),
        fail: () => {
          wx.showToast({ title: `${title}需要有效二维码`, icon: 'none' })
          reject(new Error('SCAN_CANCELLED'))
        }
      })
    })
  },

  runAction(event) {
    const actionId = event.currentTarget.dataset.id
    const action = this.data.actions.find(item => item.id === actionId)
    if (!action) return

    if (this.data.role === 'admin') {
      this.runAdminAction(action)
      return
    }

    this.runStaffAction(action)
  },

  runStaffAction(action) {
    if (action.id === 'student') return this.scanStudentCode()
    if (action.id === 'recycle') return this.handleRecycle()
    if (action.id === 'task') return this.handleFieldTask()
    if (action.id === 'reward') return this.handleRewardScan()
    if (action.id === 'records') {
      this.loadOperationLogs(false).then(() => wx.showToast({ title: '记录已刷新', icon: 'none' }))
    }
  },

  runAdminAction(action) {
    if (action.id === 'activityConfig') return this.showConfig('activity', '活动配置')
    if (action.id === 'taskRules') return this.showTaskRules()
    if (action.id === 'qrPoints') return this.showConfig('qrPoints', '二维码点位')
    if (action.id === 'audit') {
      this.loadAuditItems().then(() => wx.showToast({ title: '审核列表已刷新', icon: 'none' }))
      return
    }
    if (action.id === 'rewardInventory') return this.showRewardInventory()
    if (action.id === 'staffPermissions') return this.showStaffPermissions()
    if (action.id === 'inviteCodes') return this.showInviteGenerator()
    if (action.id === 'exceptions') return this.showExceptions()
    if (action.id === 'dataExport') return this.showExportSummary()
    if (action.id === 'operationLogs') {
      this.loadOperationLogs(true).then(() => wx.showToast({ title: '日志已刷新', icon: 'none' }))
      return
    }
    if (action.id === 'stats') return this.loadAdminStats().then(stats => this.showAdminStats(stats))
  },

  showConfig(key, title) {
    this.setData({ loadingAction: key })
    store.getConfigAsync(key).then(result => {
      this.setData({ loadingAction: '' })
      wx.showModal({
        title,
        content: compactJson(result && result.value),
        showCancel: false
      })
    }).catch(error => {
      this.setData({ loadingAction: '' })
      wx.showToast({ title: error && error.message ? error.message : `${title}加载失败`, icon: 'none' })
    })
  },

  showTaskRules() {
    this.setData({ loadingAction: 'taskRules' })
    store.getConfigAsync('catalog').then(result => {
      const catalog = result.value || {}
      const tasks = Array.isArray(catalog.tasks) ? catalog.tasks : data.tasks
      this.setData({ loadingAction: '' })
      wx.showModal({
        title: '任务与积分规则',
        content: tasks.slice(0, 8).map(item => `${item.name || item.id} · ${item.typeLabel || item.type}`).join('\n') || '暂无任务规则',
        showCancel: false
      })
    }).catch(error => {
      this.setData({ loadingAction: '' })
      wx.showToast({ title: error && error.message ? error.message : '任务规则加载失败', icon: 'none' })
    })
  },

  showRewardInventory() {
    this.setData({ loadingAction: 'rewardInventory' })
    Promise.all([
      store.getConfigAsync('catalog'),
      store.getRewardInventoryAsync()
    ]).then(results => {
      const catalog = results[0].value || {}
      const rewards = Array.isArray(catalog.rewards) ? catalog.rewards : data.rewards
      const inventoryMap = ((results[1] && results[1].inventory) || []).reduce((map, item) => {
        if (item && item.id) map[item.id] = item
        return map
      }, {})
      this.setData({ loadingAction: '' })
      wx.showModal({
        title: '奖品与库存',
        content: rewards.map(item => {
          const inventory = inventoryMap[item.id] || {}
          return `${item.name} · ${inventory.stockText || '剩余库存：' + (item.stock || 0)}`
        }).slice(0, 8).join('\n') || '暂无奖品',
        showCancel: false
      })
    }).catch(error => {
      this.setData({ loadingAction: '' })
      wx.showToast({ title: error && error.message ? error.message : '奖品库存加载失败', icon: 'none' })
    })
  },

  showStaffPermissions() {
    this.setData({ loadingAction: 'staffPermissions' })
    store.listAdminUsersAsync().then(result => {
      const staffUsers = (result.items || []).filter(item => item.role === 'staff' || item.role === 'admin')
      this.setData({ loadingAction: '' })
      wx.showModal({
        title: '人员与权限',
        content: staffUsers.slice(0, 10).map(item => `${item.name} · ${item.roleLabel} · ${item.accountNoMasked}`).join('\n') || '暂无工作人员授权',
        showCancel: false
      })
    }).catch(error => {
      this.setData({ loadingAction: '' })
      wx.showToast({ title: error && error.message ? error.message : '人员权限加载失败', icon: 'none' })
    })
  },

  showInviteGenerator() {
    wx.showActionSheet({
      itemList: ['工作人员邀请码', '管理员邀请码'],
      success: result => {
        const role = result.tapIndex === 1 ? 'admin' : 'staff'
        const roleLabel = role === 'admin' ? '管理员' : '工作人员'
        this.setData({ loadingAction: 'inviteCodes' })
        store.createInviteCodeAsync(role).then(response => {
          const invite = response.invite || {}
          const code = invite.code || ''
          this.setData({ loadingAction: '' })
          if (code) {
            wx.setClipboardData({ data: code })
          }
          wx.showModal({
            title: `${roleLabel}邀请码`,
            content: code ? `邀请码：${code}\n该邀请码为8位，注册成功后自动失效。` : '邀请码生成失败',
            showCancel: false
          })
        }).catch(error => {
          this.setData({ loadingAction: '' })
          wx.showToast({ title: error && error.message ? error.message : '邀请码生成失败', icon: 'none' })
        })
      }
    })
  },

  showExceptions() {
    const stats = this.data.adminStats || {}
    wx.showModal({
      title: '异常与补录',
      content: [
        `待审凭证：${stats.pendingEvidence || 0}`,
        `已驳回凭证：${stats.rejectedEvidence || 0}`,
        `兑换记录：${stats.redemptions || 0}`,
        '补录和回滚需通过管理员云端接口写入审计流水。'
      ].join('\n'),
      showCancel: false
    })
  },

  showExportSummary() {
    this.setData({ loadingAction: 'dataExport' })
    store.exportAdminDataAsync().then(result => {
      const summary = result.summary || {}
      this.setData({ loadingAction: '' })
      wx.showModal({
        title: '数据导出',
        content: [
          `生成时间：${this.formatTime(result.generatedAt)}`,
          `注册账号：${summary.registeredUsers || 0}`,
          `任务完成：${summary.completedTasks || 0}`,
          `操作日志：${(result.operationLogs || []).length}`
        ].join('\n'),
        showCancel: false
      })
    }).catch(error => {
      this.setData({ loadingAction: '' })
      wx.showToast({ title: error && error.message ? error.message : '导出失败', icon: 'none' })
    })
  },

  showAdminStats(stats) {
    if (!stats) return
    wx.showModal({
      title: '数据统计',
      content: [
        `注册账号：${stats.registeredUsers || 0}/${stats.totalUsers || 0}`,
        `排行积分：${stats.totalPoints || 0}`,
        `完成任务：${stats.completedTasks || 0}`,
        `待审凭证：${stats.pendingEvidence || 0}`,
        `兑换记录：${stats.redemptions || 0}`
      ].join('\n'),
      showCancel: false
    })
  },

  scanStudentCode() {
    this.scanCode('扫描学生码')
      .then(code => store.verifyStudentCodeAsync(code))
      .then(result => {
        if (!result.ok) {
          wx.showToast({ title: result.message || '学生码无效', icon: 'none' })
          return
        }
        const student = result.student || {}
        wx.showModal({
          title: '学生码已核验',
          content: [
            `${student.name || ''} · ${student.college || ''}`,
            `学号：${student.studentNoMasked || '-'}`,
            `可用积分：${student.points || 0}`,
            `排行积分：${student.rankTotal || 0}`
          ].join('\n'),
          showCancel: false
        })
        this.loadOperationLogs(false)
      })
      .catch(() => {})
  },

  handleRecycle() {
    let option = null
    this.selectOption(recycleOptions)
      .then(selected => {
        option = selected
        return this.scanCode('循环登记')
      })
      .then(code => store.recordStaffOperationAsync('recycle', Object.assign({}, option, { code })))
      .then(result => this.afterStaffOperation(result, '循环登记'))
      .catch(() => {})
  },

  handleFieldTask() {
    let option = null
    this.selectOption(fieldTaskOptions)
      .then(selected => {
        option = selected
        return this.scanCode('现场任务核验')
      })
      .then(code => store.recordStaffOperationAsync('task', Object.assign({}, option, { code })))
      .then(result => this.afterStaffOperation(result, '现场核验'))
      .catch(() => {})
  },

  handleRewardScan() {
    wx.showActionSheet({
      itemList: ['扫码核销', '输入数字码'],
      success: result => {
        const inputTask = result.tapIndex === 1 ? this.inputRedemptionCode() : this.scanCode('兑换核销')
        inputTask
          .then(code => store.verifyRedemptionAsync({ code }))
          .then(response => this.afterRewardVerification(response))
          .catch(error => this.handleRewardVerificationError(error))
      }
    })
  },

  inputRedemptionCode() {
    return new Promise((resolve, reject) => {
      wx.showModal({
        title: '输入数字核销码',
        editable: true,
        placeholderText: '请输入数字核销码',
        confirmText: '核销',
        success: result => {
          if (!result.confirm) {
            reject(new Error('INPUT_CANCELLED'))
            return
          }
          const code = String(result.content || '').replace(/\D/g, '')
          if (!code) {
            wx.showToast({ title: '请输入数字核销码', icon: 'none' })
            reject(new Error('EMPTY_CODE'))
            return
          }
          resolve(code)
        },
        fail: reject
      })
    })
  },

  afterRewardVerification(result) {
    if (result.ok) {
      const redemption = result.redemption || {}
      wx.showModal({
        title: '核销成功',
        content: [
          redemption.name || '奖品',
          `核销码：${redemption.verifyCode || redemption.code || ''}`,
          result.user && result.user.name ? `用户：${result.user.name}` : ''
        ].filter(Boolean).join('\n'),
        showCancel: false
      })
    } else {
      wx.showToast({ title: this.getBusinessMessage(result.code, result.message), icon: 'none' })
    }
    this.loadOperationLogs(false)
  },

  handleRewardVerificationError(error) {
    const result = error && error.result
    const code = (result && result.code) || (error && error.code) || ''
    const message = error && error.message
    if (['INPUT_CANCELLED', 'SCAN_CANCELLED', 'EMPTY_CODE'].indexOf(code) >= 0
      || ['INPUT_CANCELLED', 'SCAN_CANCELLED', 'EMPTY_CODE'].indexOf(message) >= 0) {
      return
    }
    if (result && result.ok === false) {
      this.afterRewardVerification(result)
      return
    }
    wx.showToast({ title: this.getBusinessMessage(code, message), icon: 'none' })
    this.loadOperationLogs(false)
  },

  afterStaffOperation(result, title) {
    const operation = (result && result.operation) || {}
    if (result && result.ok) {
      wx.showToast({ title: `${title} +${operation.points || 0}`, icon: 'success' })
    } else {
      wx.showToast({ title: this.getBusinessMessage(operation.code || (result && result.code)), icon: 'none' })
    }
    this.loadOperationLogs(false)
  },

  getBusinessMessage(code, fallback) {
    if (code === 'DUPLICATE_ACTION') return '该任务已登记'
    if (code === 'LIMIT_REACHED') return '今日积分已达上限'
    if (code === 'STUDENT_CODE_NOT_FOUND') return '学生码无效'
    if (code === 'TASK_NOT_AUTHORIZED') return '未授权该任务'
    if (code === 'ALREADY_REDEEMED') return '兑换码已核销'
    if (code === 'REDEMPTION_EXPIRED') return '兑换码已过期'
    if (code === 'REDEMPTION_NOT_FOUND') return '兑换码无效'
    if (code === 'MISSING_REDEMPTION_CODE') return '请输入或扫描兑换码'
    if (code === 'FORBIDDEN') return '当前身份无核销权限'
    if (code === 'SERVER_ERROR') return fallback || '核销服务异常'
    return fallback || '操作未完成'
  },

  previewAuditImage(event) {
    const src = event.currentTarget.dataset.src
    if (!src) return
    wx.previewImage({ urls: [src] })
  },

  reviewAudit(event) {
    const { id, status } = event.currentTarget.dataset
    const item = this.data.auditItems.find(auditItem => auditItem.id === id)
    if (!item) return

    wx.showModal({
      title: status === 'APPROVED' ? '通过复审' : '驳回凭证',
      content: status === 'APPROVED'
        ? `确认通过“${item.taskName}”？用户已到账的积分将保留。`
        : `确认驳回“${item.taskName}”？已到账积分会从对应账号扣回。`,
      confirmText: status === 'APPROVED' ? '通过' : '驳回',
      success: result => {
        if (!result.confirm) return
        this.setData({ auditLoading: true })
        store.reviewEvidenceAsync(item, status)
          .then(reviewResult => {
            const auditItems = (reviewResult.items || []).map(nextItem => this.enrichAuditItem(nextItem))
            this.setData({ auditItems, auditLoading: false })
            wx.showToast({ title: status === 'APPROVED' ? '已通过' : '已驳回', icon: 'success' })
            this.loadAdminStats()
          })
          .catch(error => {
            this.setData({ auditLoading: false })
            wx.showToast({ title: error && error.message ? error.message : '复审失败', icon: 'none' })
          })
      }
    })
  }
})
