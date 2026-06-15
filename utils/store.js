const cloudApi = require('./cloud-api')
const appData = require('./data')

const STORAGE_KEY = 'carbonCampusStateV1'
const WECHAT_ACCOUNT_KEY = 'carbonCampusWechatAccountKey'
const AUTH_PAGE = '/pages/auth/index'
const HOME_PAGE = '/pages/home/index'

const ROLE_LABELS = {
  student: '学生用户',
  teacher: '老师用户',
  staff: '工作人员',
  admin: '管理员'
}

const STAFF_INVITE_CODES = {}

const defaultState = {
  currentRole: '',
  identities: {},
  auth: {
    registered: false,
    role: '',
    roleLabel: '',
    phone: '',
    studentNo: '',
    staffNo: '',
    inviteCode: '',
    registeredAt: ''
  },
  user: {
    name: '',
    college: '',
    studentNo: '',
    badge: '',
    phone: '',
    role: '',
    points: 0,
    rankTotal: 0,
    airIndex: 0,
    streak: 0,
    checkedIn: false
  },
  taskStates: {},
  taskPoints: {},
  taskEvidence: {},
  weRun: {},
  redemptions: [],
  cards: [],
  quizCompleted: false,
  lastCheckInDate: '',
  lastTaskDate: ''
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function todayKey() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function timestampToDateKey(timestamp) {
  if (timestamp instanceof Date) {
    return new Date(timestamp.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
  }
  if (typeof timestamp === 'string') {
    const parsed = Date.parse(timestamp)
    if (Number.isFinite(parsed)) {
      return new Date(parsed + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
    }
  }
  const value = Number(timestamp || 0)
  if (!value) return ''
  const milliseconds = value < 10000000000 ? value * 1000 : value
  return new Date(milliseconds + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function hasDailyTaskActivity(state) {
  return Boolean(
    Object.keys(state.taskStates || {}).length
    || Object.keys(state.taskPoints || {}).length
    || Object.keys(state.taskEvidence || {}).length
    || Object.keys(state.taskProgress || {}).length
    || Object.keys(state.weRun || {}).length
  )
}

function getLatestTaskEvidenceDate(state) {
  const dates = []
  Object.keys(state.taskEvidence || {}).forEach(taskId => {
    const evidence = state.taskEvidence[taskId] || {}
    ;['submittedAt', 'claimedAt', 'reviewedAt'].forEach(key => {
      const dateKey = timestampToDateKey(evidence[key])
      if (dateKey) dates.push(dateKey)
    })
    const adminReviewDate = timestampToDateKey(evidence.adminReview && evidence.adminReview.reviewedAt)
    if (adminReviewDate) dates.push(adminReviewDate)
  })
  return dates.sort().pop() || ''
}

function getDailyTaskDate(state) {
  if (state.lastTaskDate) return state.lastTaskDate
  const weRun = state.weRun || {}
  const weRunDate = timestampToDateKey(weRun.syncedAt) || timestampToDateKey(weRun.timestamp)
  const stateUpdatedDate = timestampToDateKey(state.updatedAt)
  return getLatestTaskEvidenceDate(state) || weRunDate || (hasDailyTaskActivity(state) ? (stateUpdatedDate || state.lastCheckInDate) : '')
}

function resetDailyTasks(state, dateKey) {
  state.taskStates = {}
  state.taskPoints = {}
  state.taskEvidence = {}
  state.weRun = {}
  if (state.taskProgress) state.taskProgress = {}
  state.lastTaskDate = dateKey
  return state
}

function normalizeDailyTasks(state) {
  const today = todayKey()
  const taskDate = getDailyTaskDate(state)
  if (taskDate && taskDate !== today) {
    return resetDailyTasks(state, today)
  }
  state.lastTaskDate = taskDate || today
  return state
}

function isKnownRole(role) {
  return Object.prototype.hasOwnProperty.call(ROLE_LABELS, role)
}

function normalizeRole(role) {
  const value = String(role || '').trim()
  return isKnownRole(value) ? value : ''
}

function cloneAuthProfile(auth) {
  const source = auth || {}
  return Object.assign({}, defaultState.auth, source, {
    registered: Boolean(source.registered),
    role: normalizeRole(source.role),
    roleLabel: source.role ? (ROLE_LABELS[source.role] || source.roleLabel || '') : '',
    phone: String(source.phone || ''),
    studentNo: String(source.studentNo || ''),
    staffNo: String(source.staffNo || ''),
    inviteCode: String(source.inviteCode || ''),
    registeredAt: source.registeredAt || ''
  })
}

function cloneUserProfile(user, role) {
  const source = user || {}
  return Object.assign({}, defaultState.user, source, {
    role: normalizeRole(role || source.role),
    name: String(source.name || ''),
    college: String(source.college || ''),
    studentNo: String(source.studentNo || ''),
    badge: String(source.badge || ''),
    phone: String(source.phone || ''),
    points: Number(source.points || 0),
    rankTotal: Number(source.rankTotal || 0),
    airIndex: Number(source.airIndex || 0),
    streak: Number(source.streak || 0),
    checkedIn: Boolean(source.checkedIn)
  })
}

function normalizeIdentity(identity, role) {
  const normalizedRole = normalizeRole(role || (identity && identity.auth && identity.auth.role) || (identity && identity.user && identity.user.role))
  if (!normalizedRole) return null
  const source = identity || {}
  const auth = cloneAuthProfile(Object.assign({}, source.auth || source, { role: normalizedRole }))
  const user = cloneUserProfile(Object.assign({}, source.user || {}, { role: normalizedRole }), normalizedRole)
  auth.registered = Boolean(auth.registered)
  auth.role = normalizedRole
  auth.roleLabel = ROLE_LABELS[normalizedRole] || ''
  user.role = normalizedRole
  if (!user.name && auth.name) user.name = auth.name
  if (!user.college && auth.college) user.college = auth.college
  if (!user.phone && auth.phone) user.phone = auth.phone
  if (!user.studentNo) user.studentNo = auth.studentNo || auth.staffNo || ''
  return { auth, user }
}

function buildIdentityFromState(state, role) {
  const auth = cloneAuthProfile(Object.assign({}, state.auth || {}, { role }))
  const user = cloneUserProfile(Object.assign({}, state.user || {}, { role }), role)
  auth.registered = Boolean(auth.registered || role)
  auth.role = role
  auth.roleLabel = ROLE_LABELS[role] || ''
  user.role = role
  return { auth, user }
}

function normalizeIdentities(input, fallbackState) {
  const identities = {}
  const source = input && typeof input === 'object' ? input : {}
  Object.keys(source).forEach(role => {
    const normalizedRole = normalizeRole(role)
    const identity = normalizeIdentity(source[role], normalizedRole)
    if (identity && identity.auth.registered) identities[normalizedRole] = identity
  })

  const fallbackRole = normalizeRole(fallbackState && fallbackState.auth && fallbackState.auth.role)
  if (!Object.keys(identities).length && fallbackRole && fallbackState.auth && fallbackState.auth.registered) {
    identities[fallbackRole] = buildIdentityFromState(fallbackState, fallbackRole)
  }

  return identities
}

function getRegisteredRoles(state) {
  return Object.keys((state && state.identities) || {})
    .filter(role => state.identities[role] && state.identities[role].auth && state.identities[role].auth.registered)
}

function projectCurrentIdentity(state, role) {
  const currentRole = normalizeRole(role) || normalizeRole(state.currentRole) || getRegisteredRoles(state)[0] || ''
  const identity = currentRole ? state.identities[currentRole] : null
  state.currentRole = identity ? currentRole : ''
  if (identity) {
    state.auth = cloneAuthProfile(identity.auth)
    state.user = cloneUserProfile(identity.user, currentRole)
  } else {
    state.auth = clone(defaultState.auth)
    state.user = clone(defaultState.user)
  }
  state.auth.roleLabel = state.auth.role ? (ROLE_LABELS[state.auth.role] || state.auth.roleLabel) : ''
  state.user.role = state.auth.role || ''
  return state
}

function normalizeState(input) {
  const state = Object.assign(clone(defaultState), input || {})
  state.auth = cloneAuthProfile(state.auth)
  state.user = cloneUserProfile(state.user, state.auth.role)
  state.identities = normalizeIdentities(state.identities, state)
  state.currentRole = normalizeRole(state.currentRole || state.auth.role)
  if (state.auth.registered && state.auth.role) {
    state.identities[state.auth.role] = {
      auth: cloneAuthProfile(state.auth),
      user: cloneUserProfile(state.user, state.auth.role)
    }
  }
  projectCurrentIdentity(state, state.currentRole)
  state.taskStates = Object.assign({}, defaultState.taskStates, state.taskStates || {})
  state.taskPoints = Object.assign({}, defaultState.taskPoints, state.taskPoints || {})
  state.taskEvidence = Object.assign({}, defaultState.taskEvidence, state.taskEvidence || {})
  state.redemptions = Array.isArray(state.redemptions) ? state.redemptions : []
  state.cards = Array.isArray(state.cards) ? state.cards : []
  state.quizCompleted = Boolean(state.quizCompleted)
  state.lastCheckInDate = state.lastCheckInDate || ''
  state.lastTaskDate = state.lastTaskDate || ''
  state.auth.roleLabel = state.auth.role ? (ROLE_LABELS[state.auth.role] || state.auth.roleLabel) : ''
  state.user.role = state.auth.role || state.user.role || ''

  if (state.lastCheckInDate !== todayKey()) {
    state.user.checkedIn = false
  }

  normalizeDailyTasks(state)

  return state
}

function ensureState() {
  const stored = wx.getStorageSync(STORAGE_KEY)
  const state = normalizeState(stored && stored.user ? stored : defaultState)
  wx.setStorageSync(STORAGE_KEY, state)
  return state
}

function getState() {
  return ensureState()
}

function saveState(state) {
  const nextState = normalizeState(state)
  wx.setStorageSync(STORAGE_KEY, nextState)
  return nextState
}

function getRoleLabel(role) {
  return ROLE_LABELS[role] || '未注册'
}

function validateInvite() {
  return true
}

function getAccountNo(profile) {
  if (!profile) return ''
  if (profile.role === 'student') return String(profile.studentNo || '').trim()
  return String(profile.staffNo || profile.studentNo || '').trim()
}

function getAccountKey(profile) {
  const role = profile && profile.role
  const accountNo = getAccountNo(profile)
  if (!role || !accountNo) return ''
  return `${role}:${accountNo}`.toLowerCase()
}

function bindCurrentWechat(profile) {
  const key = getAccountKey(profile)
  if (key) {
    wx.setStorageSync(WECHAT_ACCOUNT_KEY, key)
  } else {
    wx.removeStorageSync(WECHAT_ACCOUNT_KEY)
  }
  return key
}

function isRegistered() {
  return Boolean(getState().auth && getState().auth.registered)
}

function hasRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles]
  const role = getState().auth.role
  if (role === 'teacher' && allowed.indexOf('student') >= 0) return true
  return allowed.indexOf(role) >= 0
}

function getCurrentUrl() {
  const pages = getCurrentPages()
  if (!pages.length) return HOME_PAGE
  const current = pages[pages.length - 1]
  return `/${current.route}`
}

function requireRegistered() {
  if (isRegistered()) return true
  const current = getCurrentUrl()
  const url = current === AUTH_PAGE ? AUTH_PAGE : `${AUTH_PAGE}?redirect=${encodeURIComponent(current)}`
  wx.redirectTo({ url })
  return false
}

function requireRole(roles) {
  if (!requireRegistered()) return false
  if (hasRole(roles)) return true

  wx.showModal({
    title: '暂无权限',
    content: '当前账号没有访问该功能的权限。',
    showCancel: false,
    success: () => {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        wx.navigateBack()
        return
      }
      wx.reLaunch({ url: HOME_PAGE })
    }
  })
  return false
}

function logout() {
  return saveState(clone(defaultState))
}

function clearWechatBinding() {
  wx.removeStorageSync(WECHAT_ACCOUNT_KEY)
}

function applyCloudState(result) {
  if (!result || !result.state) return result
  const state = saveState(result.state)
  if (state.auth && state.auth.registered) bindCurrentWechat(state.auth)
  return Object.assign({}, result, { state })
}

function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: resolve,
      fail: reject
    })
  })
}

function syncState() {
  return cloudApi.call('getState')
    .then(result => applyCloudState(result).state)
}

function switchIdentityAsync(role) {
  return cloudApi.call('switchIdentity', { role })
    .then(result => {
      if (result.state) {
        const state = saveState(result.state)
        return Object.assign({}, result, { state })
      }
      return result
    })
}

function cloudAction(action, payload) {
  return cloudApi.call(action, payload)
    .then(result => applyCloudState(result))
}

function loginWithWeChatAsync(role) {
  return wxLogin()
    .then(loginResult => {
      const selectedRole = normalizeRole(role)
      if (selectedRole) {
        return switchIdentityAsync(selectedRole).then(result => ({
          ok: Boolean(result.ok),
          code: result.ok ? 'OK' : (result.code || 'UNREGISTERED'),
          message: result.message || '',
          state: result.state,
          loginCode: loginResult.code
        }))
      }

      return syncState().then(state => {
        const registered = Boolean(getRegisteredRoles(state).length)
        return {
          ok: registered,
          code: registered ? 'OK' : 'UNREGISTERED',
          state,
          loginCode: loginResult.code
        }
      })
    })
}

function updateUserAsync(patch) {
  return cloudAction('updateUser', { patch })
}

function registerProfileAsync(profile) {
  return cloudAction('registerProfile', { profile })
}

function checkInAsync() {
  return cloudAction('checkIn', {})
}

function completeTaskAsync(task, status, evidenceFileId) {
  return cloudAction('completeTask', { task, status, evidenceFileId })
}

function claimTaskPointsAsync(task) {
  return cloudAction('claimTaskPoints', { task })
}

function submitEvidenceAsync(task, evidence) {
  return cloudAction('submitEvidence', { task, evidence })
}

function deleteEvidenceAsync(task) {
  return cloudAction('deleteEvidence', { task })
}

function redeemAsync(reward) {
  return cloudAction('redeem', { reward })
}

function getRewardInventoryAsync() {
  return cloudApi.call('getRewardInventory')
}

function addCardAsync(id) {
  return cloudAction('addCard', { id })
}

function finishQuizAsync(points) {
  return cloudAction('finishQuiz', { points })
}

function getQuizQuestionsAsync(count) {
  return cloudApi.call('getQuizQuestions', { count })
}

function uploadEvidence(tempFilePath, taskId) {
  return cloudApi.uploadFile(tempFilePath, `task-evidence/${taskId}`)
}

function listAuditEvidenceAsync() {
  return cloudApi.call('listEvidence')
}

function reviewEvidenceAsync(item, reviewStatus) {
  return cloudApi.call('reviewEvidence', { item, reviewStatus })
}

function getRankingsAsync() {
  return cloudApi.call('getRankings')
}

function getAdminStatsAsync() {
  return cloudApi.call('getAdminStats')
}

function getConfigAsync(key) {
  return cloudApi.call('getConfig', { key })
    .then(result => Object.assign({}, result, {
      value: result ? result.value : undefined
    }))
}

function setConfigAsync(key, value) {
  return cloudApi.call('setConfig', { key, value })
}

function syncCatalog() {
  return getConfigAsync('catalog')
    .then(result => appData.mergeCatalog(result && result.value ? result.value : {}))
}

function getStudentCodeAsync() {
  return cloudApi.call('getStudentCode')
}

function verifyStudentCodeAsync(code) {
  return cloudApi.call('verifyStudentCode', { code })
}

function recordStaffOperationAsync(actionId, detail) {
  return cloudApi.call('recordStaffOperation', { actionId, detail: detail || {} })
}

function listStaffLogsAsync(options) {
  return cloudApi.call('listStaffLogs', options || {})
}

function verifyRedemptionAsync(input) {
  const payload = input && typeof input === 'object' ? input : { code: input }
  return cloudApi.call('verifyRedemption', payload)
}

function completeScannedTaskAsync(task, code) {
  return cloudAction('completeScannedTask', { task, code })
}

function listAdminUsersAsync() {
  return cloudApi.call('listAdminUsers')
}

function exportAdminDataAsync() {
  return cloudApi.call('exportAdminData')
}

function createInviteCodeAsync(role) {
  return cloudApi.call('createInviteCode', { role })
}

function rejectLocalMutation() {
  throw new Error('云端数据已启用，禁止使用小程序本地静态/离线写入')
}

module.exports = {
  defaultState,
  initCloud: cloudApi.initCloud,
  ensureState,
  getState,
  saveState,
  syncState,
  switchIdentityAsync,
  loginWithWeChatAsync,
  ROLE_LABELS,
  STAFF_INVITE_CODES,
  validateInvite,
  getRoleLabel,
  loginProfile: rejectLocalMutation,
  registerProfile: rejectLocalMutation,
  registerProfileAsync,
  isRegistered,
  hasRole,
  requireRegistered,
  requireRole,
  logout,
  clearWechatBinding,
  updateUser: rejectLocalMutation,
  updateUserAsync,
  checkIn: rejectLocalMutation,
  checkInAsync,
  completeTask: rejectLocalMutation,
  completeTaskAsync,
  claimTaskPointsAsync,
  redeem: rejectLocalMutation,
  redeemAsync,
  getRewardInventoryAsync,
  addCard: rejectLocalMutation,
  addCardAsync,
  finishQuiz: rejectLocalMutation,
  finishQuizAsync,
  getQuizQuestionsAsync,
  uploadEvidence,
  submitEvidence: rejectLocalMutation,
  submitEvidenceAsync,
  deleteEvidence: rejectLocalMutation,
  deleteEvidenceAsync,
  listAuditEvidence: rejectLocalMutation,
  listAuditEvidenceAsync,
  reviewEvidence: rejectLocalMutation,
  reviewEvidenceAsync,
  getRankingsAsync,
  getAdminStatsAsync,
  getConfigAsync,
  setConfigAsync,
  syncCatalog,
  getStudentCodeAsync,
  verifyStudentCodeAsync,
  recordStaffOperationAsync,
  listStaffLogsAsync,
  verifyRedemptionAsync,
  completeScannedTaskAsync,
  listAdminUsersAsync,
  exportAdminDataAsync,
  createInviteCodeAsync
}
