const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const https = require('https')
const bundledQuizConfig = require('./quiz-config-200.json')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const users = db.collection('carbon_users')
const configs = db.collection('carbon_config')
const staffLogs = db.collection('carbon_staff_logs')
let usersCollectionReady = false
let configCollectionReady = false
let staffLogsCollectionReady = false

const ROLE_LABELS = {
  student: '学生用户',
  teacher: '老师用户',
  staff: '工作人员',
  admin: '管理员'
}

const INITIAL_INVITE_CODES = [
  { code: 'S7K4Q9MN', role: 'staff', roleLabel: '工作人员', source: 'initial' },
  { code: 'A3D8R2ZX', role: 'admin', roleLabel: '管理员', source: 'initial' }
]

const INVITE_CODE_LENGTH = 8
const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const REDEMPTION_CODE_LENGTH = 10

const PHOTO_TASK_IDS = [
  'green_bus',
  'plastic_cup',
  'plastic_bag',
  'plate_breakfast',
  'plate_lunch',
  'plate_dinner',
  'dorm_energy',
  'dorm_report'
]

const TASK_ZONE_MAP = {
  green_steps: 'GREEN_TRAVEL',
  green_bus: 'GREEN_TRAVEL',
  green_walk: 'GREEN_TRAVEL',
  plastic_cup: 'FOOD_PLASTIC',
  plastic_cutlery: 'FOOD_PLASTIC',
  plastic_bag: 'FOOD_PLASTIC',
  plastic_meal: 'FOOD_PLASTIC',
  plate_breakfast: 'CLEAN_PLATE',
  plate_lunch: 'CLEAN_PLATE',
  plate_dinner: 'CLEAN_PLATE',
  recycle_books: 'RECYCLE',
  recycle_clothes: 'RECYCLE',
  recycle_boxes: 'RECYCLE',
  dorm_promise: 'DORM',
  dorm_energy: 'DORM',
  dorm_report: 'DORM'
}

const ZONE_DAILY_CAPS = {
  GREEN_TRAVEL: 15,
  FOOD_PLASTIC: 12,
  CLEAN_PLATE: 20,
  RECYCLE: 20,
  DORM: 15
}

const STEP_LEVELS = [
  { steps: 8000, points: 8 },
  { steps: 5000, points: 5 },
  { steps: 3000, points: 3 }
]
const STEP_TASK_ID = 'green_steps'
const CARBON_REDUCTION_GRAMS_PER_STEP = 0.142

const TASK_POINT_RULES = {
  green_bus: 5,
  green_walk: 8,
  plastic_cup: 3,
  plastic_cutlery: 3,
  plastic_bag: 2,
  plastic_meal: 5,
  plate_breakfast: 10,
  plate_lunch: 10,
  plate_dinner: 10,
  recycle_books: 10,
  recycle_clothes: 15,
  recycle_boxes: 8,
  dorm_promise: 3,
  dorm_energy: 5,
  dorm_report: 3
}

const TASK_NAMES = {
  green_bus: '公交/校车低碳出行',
  green_walk: '校园健步走',
  plastic_cup: '自带水杯打卡',
  plastic_cutlery: '拒绝一次性餐具',
  plastic_bag: '环保袋随身带',
  plastic_meal: '低碳餐选择',
  plate_breakfast: '早餐光盘',
  plate_lunch: '午餐光盘',
  plate_dinner: '晚餐光盘',
  recycle_books: '旧书流转登记',
  recycle_clothes: '旧衣回收登记',
  recycle_boxes: '纸箱回收登记',
  dorm_promise: '宿舍低碳承诺',
  dorm_energy: '离寝断电随手拍',
  dorm_report: '节水节电报修'
}

const STAFF_ACTION_TASKS = {
  recycle: ['recycle_books', 'recycle_clothes', 'recycle_boxes'],
  task: ['green_walk', 'plastic_cutlery', 'plastic_meal', 'dorm_promise', 'dorm_report']
}

const QUIZ_DRAW_COUNT = 5
const QUIZ_REQUIRED_BANK_SIZE = 200

const CATALOG_SEED_VERSION = '2026-06-13-carbon-store-v3'
const RULES_CONFIG = {
  image: '/assets/rules/points-rules.png'
}
const REWARD_CATALOG_ITEMS = [
  {
    id: 'reward_ticket',
    name: '蒙超门票',
    note: '蒙超决赛球票',
    points: 4500,
    stock: 500,
    stockText: '剩余库存：500',
    image: '/assets/rewards/reward-ticket.png',
    color: '#EAF5E8'
  },
  {
    id: 'reward_beautiful_china_cup',
    name: '美丽中国随行杯',
    note: '316不锈钢瑞星杯，白红色，450ml',
    points: 3500,
    stock: 100,
    stockGroup: 'travel_cups',
    stockText: '剩余库存：100',
    image: '/assets/rewards/reward-1.jpg',
    color: '#DFF4E9'
  },
  {
    id: 'reward_mountain_water_cup',
    name: '小山小水随行杯',
    note: '316不锈钢瑞星杯，白红色，450ml',
    points: 3500,
    stock: 100,
    stockGroup: 'travel_cups',
    stockText: '剩余库存：100',
    image: '/assets/rewards/reward-2.jpg',
    color: '#FFF1BF'
  },
  {
    id: 'reward_low_carbon_day_cup',
    name: '全国低碳日随行杯',
    note: '316不锈钢瑞星杯，白红色，450ml',
    points: 3500,
    stock: 100,
    stockGroup: 'travel_cups',
    stockText: '剩余库存：100',
    image: '/assets/rewards/reward-3.jpg',
    color: '#DFF0F7'
  },
  {
    id: 'reward_ceramic_cup',
    name: '纯色陶瓷杯',
    note: '象牙白',
    points: 3000,
    stock: 100,
    stockText: '剩余库存：100',
    image: '/assets/rewards/reward-4.jpg',
    color: '#F4E2EA'
  },
  {
    id: 'reward_canvas_bag',
    name: '手提帆布袋',
    note: '手提彩色',
    points: 2400,
    stock: 200,
    stockText: '剩余库存：200',
    image: '/assets/rewards/reward-5.jpg',
    color: '#E7F3D5'
  },
  {
    id: 'reward_mouse_pad',
    name: '鼠标垫',
    note: '250 * 300 * 3 mm',
    points: 900,
    stock: 200,
    stockText: '剩余库存：200',
    image: '/assets/rewards/reward-6.jpg',
    color: '#E9ECFF'
  }
]
const REWARD_CATALOG = REWARD_CATALOG_ITEMS.reduce((catalog, item) => {
  catalog[item.id] = {
    name: item.name,
    points: item.points,
    stock: item.stock
  }
  if (item.stockGroup) catalog[item.id].stockGroup = item.stockGroup
  return catalog
}, {})

const DEFAULT_WEATHER_LOCATION = {
  name: '赛罕区',
  region: '呼和浩特市',
  label: '呼和浩特市 · 赛罕区',
  latitude: 40.8183,
  longitude: 111.6971,
  timezone: 'Asia/Shanghai'
}

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

async function ensureUsersCollection() {
  if (usersCollectionReady) return
  usersCollectionReady = true

  if (!db || typeof db.createCollection !== 'function') return

  try {
    await db.createCollection('carbon_users')
  } catch (error) {
    const message = String((error && (error.message || error.errMsg || error.code)) || '')
    if (!/exist|already/i.test(message)) {
      console.warn('[carbon_users collection init skipped]', message)
    }
  }
}

async function ensureCollection(collectionName, flagSetter) {
  flagSetter()

  if (!db || typeof db.createCollection !== 'function') return

  try {
    await db.createCollection(collectionName)
  } catch (error) {
    const message = String((error && (error.message || error.errMsg || error.code)) || '')
    if (!/exist|already/i.test(message)) {
      console.warn(`[${collectionName} collection init skipped]`, message)
    }
  }
}

async function ensureConfigCollection() {
  if (configCollectionReady) return
  await ensureCollection('carbon_config', () => {
    configCollectionReady = true
  })
}

async function ensureStaffLogsCollection() {
  if (staffLogsCollectionReady) return
  await ensureCollection('carbon_staff_logs', () => {
    staffLogsCollectionReady = true
  })
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

function touchDailyTasks(state) {
  state.lastTaskDate = todayKey()
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

function getStepPoints(steps) {
  const normalizedSteps = Number(steps || 0)
  const matchedLevel = STEP_LEVELS.find(item => normalizedSteps >= item.steps)
  return matchedLevel ? matchedLevel.points : 0
}

function getTaskAwardedPoints(state, taskId) {
  return Number((state.taskPoints || {})[taskId] || 0)
}

function getCappedStepTotalPoints(state, task) {
  const rulePoints = getStepPoints(task && task.steps)
  if (!rulePoints) return 0
  const zone = getTaskZone(STEP_TASK_ID)
  const zoneCap = Number(ZONE_DAILY_CAPS[zone] || 0)
  if (!zoneCap) return rulePoints
  const remaining = Math.max(0, zoneCap - getZoneAwardedPoints(state, zone, STEP_TASK_ID))
  return Math.min(rulePoints, remaining)
}

function getClaimableStepPoints(state, task) {
  const targetPoints = getCappedStepTotalPoints(state, task)
  const awardedPoints = getTaskAwardedPoints(state, STEP_TASK_ID)
  return Math.max(0, targetPoints - awardedPoints)
}

function getTaskRulePoints(task) {
  const source = task || {}
  if (source.id === STEP_TASK_ID) {
    return getStepPoints(source.steps)
  }
  return Number(TASK_POINT_RULES[source.id] || 0)
}

function getTaskZone(taskId) {
  return TASK_ZONE_MAP[taskId] || ''
}

function getServerTask(taskId) {
  const id = String(taskId || '').trim()
  if (!id || !TASK_POINT_RULES[id] && id !== STEP_TASK_ID) return null
  return {
    id,
    name: TASK_NAMES[id] || id,
    zone: getTaskZone(id)
  }
}

function isAllowedStaffTask(actionId, taskId) {
  const allowed = STAFF_ACTION_TASKS[actionId] || []
  return allowed.indexOf(taskId) >= 0
}

function maskAccountNo(accountNo) {
  const value = String(accountNo || '').trim()
  if (!value) return ''
  if (value.length <= 4) return `${value.slice(0, 1)}***`
  return `${value.slice(0, 2)}***${value.slice(-2)}`
}

function getZoneAwardedPoints(state, zone, exceptTaskId) {
  if (!zone) return 0
  return Object.keys(state.taskPoints || {}).reduce((sum, taskId) => {
    if (taskId === exceptTaskId) return sum
    return getTaskZone(taskId) === zone ? sum + Number(state.taskPoints[taskId] || 0) : sum
  }, 0)
}

function getCappedTaskPoints(state, task) {
  const rulePoints = getTaskRulePoints(task)
  const taskId = task && task.id
  const zone = getTaskZone(taskId)
  const zoneCap = Number(ZONE_DAILY_CAPS[zone] || 0)
  if (!zoneCap) return rulePoints
  const remaining = Math.max(0, zoneCap - getZoneAwardedPoints(state, zone, taskId))
  return Math.min(rulePoints, remaining)
}

function normalizeRewardRule(reward, stockIds) {
  const source = reward || {}
  const id = String(source.id || '').trim()
  const name = String(source.name || '').trim()
  const points = Number(source.points || 0)
  if (!id || !name || !points) return null

  const stock = Number(source.stock || 0)
  const rule = {
    id,
    name,
    points
  }
  if (stock > 0) rule.stock = stock
  if (source.stockGroup) rule.stockGroup = String(source.stockGroup)
  if (Array.isArray(stockIds) && stockIds.length) rule.stockIds = stockIds
  return rule
}

async function getRewardRule(reward) {
  const rewardId = String((reward && reward.id) || '').trim()
  if (!rewardId) return null

  const catalog = await getConfigValue('catalog')
  const rewards = Array.isArray(catalog.rewards) ? catalog.rewards : []
  const catalogReward = rewards.find(item => String(item.id || '').trim() === rewardId)
  if (catalogReward) {
    const stockGroup = catalogReward.stockGroup
    const stockIds = stockGroup
      ? rewards
        .filter(item => item.stockGroup === stockGroup)
        .map(item => String(item.id || '').trim())
        .filter(Boolean)
      : []
    return normalizeRewardRule(catalogReward, stockIds)
  }

  if (!REWARD_CATALOG[rewardId]) return null
  return normalizeRewardRule(Object.assign({ id: rewardId }, REWARD_CATALOG[rewardId]), getRewardStockIds({
    id: rewardId,
    stockGroup: REWARD_CATALOG[rewardId].stockGroup
  }))
}

function getRewardStockIds(rewardRule) {
  if (!rewardRule) return []
  if (Array.isArray(rewardRule.stockIds) && rewardRule.stockIds.length) return rewardRule.stockIds
  if (!rewardRule.stockGroup) return [rewardRule.id]
  return Object.keys(REWARD_CATALOG)
    .filter(id => REWARD_CATALOG[id].stockGroup === rewardRule.stockGroup)
}

function isActiveRewardRedemption(redemption) {
  const item = redemption || {}
  if (['CANCELLED', 'EXPIRED'].indexOf(item.status) >= 0) return false
  if (item.status === 'REDEEMED') return true
  const expiresAt = Number(item.expiresAt || 0)
  return !expiresAt || Date.now() <= expiresAt
}

async function countRewardRedemptions(rewardRule) {
  const rewardIds = new Set(getRewardStockIds(rewardRule))
  const records = await listUserRecords(10000)
  return records.reduce((sum, record) => {
    const state = normalizeState(record)
    const redemptions = state.redemptions || []
    return sum + redemptions.filter(item => rewardIds.has(item.rewardId) && isActiveRewardRedemption(item)).length
  }, 0)
}

function countActiveRedemptionsByRewardId(records) {
  return (records || []).reduce((counts, record) => {
    const state = normalizeState(record)
    ;(state.redemptions || []).forEach(item => {
      const rewardId = String(item.rewardId || '').trim()
      if (!rewardId || !isActiveRewardRedemption(item)) return
      counts[rewardId] = Number(counts[rewardId] || 0) + 1
    })
    return counts
  }, {})
}

function getRewardStockScopeIds(reward, rewards) {
  const rewardId = String((reward && reward.id) || '').trim()
  const stockGroup = String((reward && reward.stockGroup) || '').trim()
  if (!stockGroup) return rewardId ? [rewardId] : []
  return (rewards || [])
    .filter(item => String(item.stockGroup || '').trim() === stockGroup)
    .map(item => String(item.id || '').trim())
    .filter(Boolean)
}

function buildRewardInventoryItem(reward, rewards, activeCounts) {
  const item = reward || {}
  const stock = Number(item.stock || 0)
  const stockIds = getRewardStockScopeIds(item, rewards)
  const usedStock = stockIds.reduce((sum, rewardId) => sum + Number(activeCounts[rewardId] || 0), 0)
  const remainingStock = Math.max(0, stock - usedStock)
  return {
    id: String(item.id || ''),
    stock,
    usedStock,
    remainingStock,
    stockText: `剩余库存：${remainingStock}`,
    stockGroup: item.stockGroup || ''
  }
}

async function buildRewardInventory() {
  const catalog = await getConfigValue('catalog')
  const rewards = Array.isArray(catalog.rewards) ? catalog.rewards : []
  const records = await listUserRecords(10000)
  const activeCounts = countActiveRedemptionsByRewardId(records)
  return rewards.map(item => buildRewardInventoryItem(item, rewards, activeCounts))
}

async function getRewardInventory() {
  return { ok: true, inventory: await buildRewardInventory() }
}

async function getRewardRemainingStock(rewardRule) {
  const stock = Number((rewardRule && rewardRule.stock) || 0)
  if (!stock) return Infinity
  return Math.max(0, stock - await countRewardRedemptions(rewardRule))
}

function getTaskEvidenceSource(evidence) {
  if (!evidence) return ''
  return evidence.tempFilePath || evidence.imageUrl || evidence.fileId || evidence.fileID || ''
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

function buildIdentityFromState(state, role) {
  const auth = cloneAuthProfile(Object.assign({}, state.auth || {}, { role }))
  const user = cloneUserProfile(Object.assign({}, state.user || {}, { role }), role)
  auth.registered = Boolean(auth.registered || role)
  auth.role = role
  auth.roleLabel = getRoleLabel(role)
  user.role = role
  return { auth, user }
}

function normalizeIdentity(identity, role) {
  const normalizedRole = normalizeRole(role || (identity && identity.auth && identity.auth.role) || (identity && identity.user && identity.user.role))
  if (!normalizedRole) return null
  const source = identity || {}
  const auth = cloneAuthProfile(Object.assign({}, source.auth || source, { role: normalizedRole }))
  const user = cloneUserProfile(Object.assign({}, source.user || {}, { role: normalizedRole }), normalizedRole)
  auth.registered = Boolean(auth.registered)
  auth.role = normalizedRole
  auth.roleLabel = getRoleLabel(normalizedRole)
  user.role = normalizedRole
  if (!user.name && auth.name) user.name = auth.name
  if (!user.college && auth.college) user.college = auth.college
  if (!user.phone && auth.phone) user.phone = auth.phone
  if (!user.studentNo) user.studentNo = auth.studentNo || auth.staffNo || ''
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

function hasStudentTeacherConflict(roles, role) {
  return (role === 'student' && roles.indexOf('teacher') >= 0)
    || (role === 'teacher' && roles.indexOf('student') >= 0)
}

function assertCanBindRole(state, role) {
  const currentRoles = getRegisteredRoles(state)
  if (currentRoles.indexOf(role) >= 0) return
  if (currentRoles.length >= 3) {
    throw createBusinessError('IDENTITY_LIMIT_REACHED', '一个微信账号最多绑定三重身份')
  }
  if (hasStudentTeacherConflict(currentRoles, role)) {
    throw createBusinessError('STUDENT_TEACHER_CONFLICT', '学生身份和老师身份不能同时绑定')
  }
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
  state.auth.roleLabel = state.auth.role ? getRoleLabel(state.auth.role) : ''
  state.user.role = state.auth.role || ''
  return state
}

function syncCurrentIdentity(state) {
  const role = normalizeRole(state && state.auth && state.auth.role)
  if (role && state.identities && state.identities[role]) {
    state.identities[role] = {
      auth: cloneAuthProfile(state.auth),
      user: cloneUserProfile(state.user, role)
    }
  }
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
  state.cards = Array.isArray(state.cards) ? state.cards : clone(defaultState.cards)
  state.quizCompleted = Boolean(state.quizCompleted)
  state.lastCheckInDate = state.lastCheckInDate || ''
  state.lastTaskDate = state.lastTaskDate || ''
  state.auth.roleLabel = state.auth.role ? getRoleLabel(state.auth.role) : ''
  state.user.role = state.auth.role || state.user.role || ''

  if (state.lastCheckInDate !== todayKey()) {
    state.user.checkedIn = false
  }

  normalizeDailyTasks(state)

  PHOTO_TASK_IDS.forEach(taskId => {
    const status = state.taskStates[taskId]
    const evidence = state.taskEvidence[taskId]
    if ((status === 'PENDING_REVIEW' || status === 'REJECTED') && !getTaskEvidenceSource(evidence)) {
      state.taskStates[taskId] = 'NOT_STARTED'
      delete state.taskEvidence[taskId]
    }
  })

  return state
}

function normalizeEvidenceInput(evidence) {
  const source = evidence || {}
  const fileId = source.fileId || source.fileID || ''
  return {
    fileId,
    tempFilePath: fileId ? '' : source.tempFilePath || '',
    imageUrl: source.imageUrl || '',
    localOnly: Boolean(source.localOnly),
    uploadError: source.error || source.uploadError || ''
  }
}

function getReviewRule(task) {
  const taskId = task && task.id
  if (taskId === 'green_bus') {
    return '判断图片中是否存在公交车或校车通勤场景、骑行场景、骑行记录截图。'
  }
  if (taskId === 'plastic_cup') {
    return '判断图片中是否存在可重复使用的自带水杯；一次性纸杯、塑料杯、奶茶杯严禁算作通过。'
  }
  if (taskId === 'plastic_bag') {
    return '判断图片中是否存在环保袋、布袋或可重复使用购物袋；普通一次性塑料袋严禁算作通过。'
  }
  if (['plate_breakfast', 'plate_lunch', 'plate_dinner'].indexOf(taskId) >= 0) {
    return `判断图片中${task.name || '本餐次'}是否已经光盘，餐盘或餐盒内不应有明显剩饭剩菜。`
  }
  return '判断图片是否与本任务要求相关，无法确定时交由人工复审。'
}

function buildSkippedAiReview(task, reason) {
  return {
    status: 'SKIPPED',
    passed: null,
    label: '待人工复审',
    reason,
    rule: getReviewRule(task),
    reviewedAt: Date.now()
  }
}

function buildErrorAiReview(task, error) {
  return {
    status: 'ERROR',
    passed: null,
    label: 'AI初审异常',
    reason: error && error.message ? error.message : '大模型接口调用失败，已转人工复审。',
    rule: getReviewRule(task),
    reviewedAt: Date.now()
  }
}

function shouldRejectByAi(aiReview) {
  return aiReview && aiReview.status === 'DONE' && aiReview.passed === false
}

function createEvidenceRecord(task, evidence, aiReview, status, awardedPoints) {
  const normalizedEvidence = normalizeEvidenceInput(evidence)
  const now = Date.now()
  const points = Number(awardedPoints || getTaskRulePoints(task) || 0)
  return {
    id: `${task.id}-${now}`,
    taskId: task.id,
    taskName: task.name,
    zone: task.zone,
    points,
    fileId: normalizedEvidence.fileId,
    tempFilePath: normalizedEvidence.tempFilePath,
    imageUrl: normalizedEvidence.imageUrl,
    localOnly: normalizedEvidence.localOnly,
    uploadError: normalizedEvidence.uploadError,
    submittedAt: now,
    status,
    aiReview: aiReview || buildSkippedAiReview(task, '未执行 AI 初审，已转人工复审。')
  }
}

function deductTaskPoints(state, taskId) {
  const points = Number((state.taskPoints || {})[taskId] || 0)
  if (!points) return 0
  state.user.points = Math.max(0, Number(state.user.points || 0) - points)
  state.user.rankTotal = Math.max(0, Number(state.user.rankTotal || 0) - points)
  delete state.taskPoints[taskId]
  return points
}

function awardTaskPoints(state, taskId, points) {
  const normalizedPoints = Number(points || 0)
  if (!normalizedPoints || state.taskPoints[taskId]) return 0
  state.taskPoints[taskId] = normalizedPoints
  state.user.points = Number(state.user.points || 0) + normalizedPoints
  state.user.rankTotal = Number(state.user.rankTotal || 0) + normalizedPoints
  return normalizedPoints
}

function addTaskPoints(state, taskId, points) {
  const normalizedPoints = Number(points || 0)
  if (!normalizedPoints) return 0
  state.taskPoints[taskId] = getTaskAwardedPoints(state, taskId) + normalizedPoints
  state.user.points = Number(state.user.points || 0) + normalizedPoints
  state.user.rankTotal = Number(state.user.rankTotal || 0) + normalizedPoints
  return normalizedPoints
}

function markTaskClaimable(state, taskId) {
  if (!taskId || state.taskStates[taskId] === 'COMPLETED') return false
  state.taskStates[taskId] = 'READY_TO_CLAIM'
  if (state.taskEvidence[taskId]) {
    state.taskEvidence[taskId] = Object.assign({}, state.taskEvidence[taskId], {
      status: 'READY_TO_CLAIM'
    })
  }
  return true
}

function markTaskCompleted(state, taskId) {
  if (!taskId) return false
  state.taskStates[taskId] = 'COMPLETED'
  if (state.taskEvidence[taskId]) {
    state.taskEvidence[taskId] = Object.assign({}, state.taskEvidence[taskId], {
      status: 'COMPLETED',
      claimedAt: state.taskEvidence[taskId].claimedAt || Date.now()
    })
  }
  return true
}

function publicState(doc) {
  const state = normalizeState(doc)
  delete state._id
  delete state._openid
  delete state.createdAt
  delete state.updatedAt
  return state
}

function sanitizeStateForUpdate(state) {
  const data = Object.assign({}, state || {})
  delete data._id
  delete data._openid
  delete data.createdAt
  delete data.updatedAt
  return data
}

async function getOrCreateState(openid) {
  await ensureUsersCollection()

  try {
    const record = await users.doc(openid).get()
    return publicState(record.data)
  } catch (error) {
    const now = db.serverDate()
    const state = normalizeState(defaultState)
    await users.doc(openid).set({
      data: Object.assign({}, state, {
        _openid: openid,
        createdAt: now,
        updatedAt: now
      })
    })
    return state
  }
}

async function saveState(openid, state) {
  await ensureUsersCollection()

  const nextState = normalizeState(state)
  const data = Object.assign(sanitizeStateForUpdate(nextState), {
    _openid: openid,
    updatedAt: db.serverDate()
  })

  // Replace the whole state document so removed nested map keys, such as
  // taskEvidence[taskId], are deleted from cloud storage instead of lingering.
  await users.doc(openid).set({
    data
  })
  return nextState
}

async function listUserRecords(maxCount) {
  await ensureUsersCollection()

  const pageSize = 100
  const records = []
  const totalLimit = Number(maxCount || 1000)

  for (let offset = 0; offset < totalLimit; offset += pageSize) {
    const result = await users.skip(offset).limit(Math.min(pageSize, totalLimit - offset)).get()
    const data = Array.isArray(result.data) ? result.data : []
    records.push.apply(records, data)
    if (data.length < pageSize) break
  }

  return records
}

async function updateUser(openid, payload) {
  const state = await getOrCreateState(openid)
  const patch = payload.patch || {}
  const allowed = {}
  ;['name', 'college', 'badge', 'phone'].forEach(key => {
    if (typeof patch[key] === 'string' && patch[key].trim()) {
      allowed[key] = patch[key].trim()
    }
  })

  const registeredRole = state.auth && state.auth.registered ? (state.auth.role || state.user.role || 'student') : ''
  if (typeof patch.studentNo === 'string' && patch.studentNo.trim() && registeredRole && registeredRole !== 'teacher') {
    const role = registeredRole
    const identityType = getAccountIdentityType(role)
    const accountNo = patch.studentNo.trim()
    const currentNo = normalizeAccountNo(getStateAccountNo(state, identityType))
    if (normalizeAccountNo(accountNo) !== currentNo) {
      await assertAccountAvailable(openid, role, accountNo)
      if (identityType === 'student') {
        state.auth.studentNo = accountNo
      } else {
        state.auth.staffNo = accountNo
      }
      allowed.studentNo = accountNo
    }
  }

  state.user = Object.assign({}, state.user, allowed)
  if (allowed.name) state.auth.name = allowed.name
  if (allowed.college) state.auth.college = allowed.college
  if (allowed.phone) state.auth.phone = allowed.phone
  syncCurrentIdentity(state)
  return saveState(openid, state)
}

function getRoleLabel(role) {
  return ROLE_LABELS[role] || '未注册'
}

function createBusinessError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function normalizeInviteCode(inviteCode) {
  return String(inviteCode || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, INVITE_CODE_LENGTH)
}

function generateNumericCode(length) {
  const bytes = crypto.randomBytes(length)
  let code = ''
  for (let index = 0; index < length; index += 1) {
    code += String(bytes[index] % 10)
  }
  return code
}

function buildRedemptionQrPayload(code) {
  return `IMU-RDM:${String(code || '').trim()}`
}

function normalizeRedemptionVerifyCode(input) {
  if (input && typeof input === 'object') {
    return normalizeRedemptionVerifyCode(
      input.verifyCode || input.redemptionCode || input.code || input.qrPayload || input.r || input.raw || ''
    )
  }

  const raw = String(input || '').trim()
  if (!raw) return ''

  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return normalizeRedemptionVerifyCode(
        parsed.verifyCode || parsed.redemptionCode || parsed.code || parsed.qrPayload || parsed.r || parsed.raw || ''
      )
    }
  } catch (error) {
  }

  const decoded = (() => {
    try {
      return decodeURIComponent(raw)
    } catch (error) {
      return raw
    }
  })()
  const upper = decoded.toUpperCase()
  const tagged = upper.match(/(?:IMU-RDM|IMU-REDEEM|REDEMPTION|REDEEM)[/:=]([0-9]{6,16})/)
  if (tagged) return tagged[1]

  const query = upper.match(/[?&](?:CODE|VERIFYCODE|REDEMPTIONCODE|R)=([0-9]{6,16})/)
  if (query) return query[1]

  const compact = upper.replace(/\s+/g, '')
  if (/^[0-9]{6,16}$/.test(compact)) return compact
  return ''
}

function normalizeLegacyRedemptionCode(input) {
  if (input && typeof input === 'object') {
    return normalizeLegacyRedemptionCode(
      input.verifyCode || input.redemptionCode || input.code || input.qrPayload || input.r || input.raw || ''
    )
  }

  const raw = String(input || '').trim()
  if (!raw) return ''

  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return normalizeLegacyRedemptionCode(parsed)
    }
  } catch (error) {
  }

  const decoded = (() => {
    try {
      return decodeURIComponent(raw)
    } catch (error) {
      return raw
    }
  })()
  const upper = decoded.toUpperCase()
  const tagged = upper.match(/(?:IMU-RDM|IMU-REDEEM|REDEMPTION|REDEEM)[/:=]([A-Z0-9_-]{4,32})/)
  if (tagged) return tagged[1]

  const query = upper.match(/[?&](?:CODE|VERIFYCODE|REDEMPTIONCODE|R)=([A-Z0-9_-]{4,32})/)
  if (query) return query[1]

  return upper.replace(/\s+/g, '')
}

function redemptionCodeMatches(redemption, code, rawCode) {
  const item = redemption || {}
  if (code) {
    return normalizeRedemptionVerifyCode(item.verifyCode || item.code) === code
      || normalizeRedemptionVerifyCode(item.qrPayload) === code
  }

  if (!rawCode) return false
  return normalizeLegacyRedemptionCode(item.verifyCode || item.code) === rawCode
    || normalizeLegacyRedemptionCode(item.qrPayload) === rawCode
}

async function generateUniqueRedemptionCode() {
  const records = await listUserRecords(10000)
  const usedCodes = new Set()
  records.forEach(record => {
    const state = normalizeState(record)
    ;(state.redemptions || []).forEach(item => {
      const code = normalizeRedemptionVerifyCode(item.verifyCode || item.code || item.qrPayload)
      if (code) usedCodes.add(code)
    })
  })

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateNumericCode(REDEMPTION_CODE_LENGTH)
    if (!usedCodes.has(code)) return code
  }

  throw createBusinessError('REDEMPTION_CODE_EXHAUSTED', '兑换码生成失败，请稍后重试')
}

function createInitialInviteConfig(existing) {
  const now = new Date().toISOString()
  const value = Object.assign({}, existing || {})
  const codes = Array.isArray(value.codes) ? value.codes.slice() : []

  INITIAL_INVITE_CODES.forEach(seed => {
    const exists = codes.some(item => normalizeInviteCode(item.code) === seed.code)
    if (!exists) {
      codes.push(Object.assign({}, seed, {
        used: false,
        createdAt: now,
        createdBy: 'system'
      }))
    }
  })

  return Object.assign({}, value, { codes })
}

function shouldSeedInviteConfig(value) {
  const codes = Array.isArray(value && value.codes) ? value.codes : []
  return INITIAL_INVITE_CODES.some(seed => {
    return !codes.some(item => normalizeInviteCode(item.code) === seed.code)
  })
}

function getPublicInvite(invite) {
  return {
    code: invite.code,
    role: invite.role,
    roleLabel: invite.roleLabel || getRoleLabel(invite.role),
    used: Boolean(invite.used),
    createdAt: invite.createdAt || '',
    usedAt: invite.usedAt || ''
  }
}

function generateInviteCode(existingCodes) {
  const usedCodes = existingCodes || []
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const bytes = crypto.randomBytes(INVITE_CODE_LENGTH)
    let code = ''
    for (let index = 0; index < INVITE_CODE_LENGTH; index += 1) {
      code += INVITE_CODE_ALPHABET[bytes[index] % INVITE_CODE_ALPHABET.length]
    }
    if (usedCodes.indexOf(code) < 0) return code
  }
  throw createBusinessError('INVITE_GENERATE_FAILED', '邀请码生成失败，请重试')
}

function getAccountIdentityType(role) {
  return role === 'staff' || role === 'admin' ? 'staff' : 'student'
}

function normalizeAccountNo(accountNo) {
  return String(accountNo || '').trim().toLowerCase()
}

function normalizePhone(phone) {
  return String(phone || '').trim().replace(/\s+/g, '')
}

function getProfileAccountNo(role, profile) {
  if (role === 'teacher') return ''
  if (role === 'student') return String(profile.studentNo || '').trim()
  return String(profile.staffNo || '').trim()
}

function getStateAccountNo(state, identityType) {
  if (!state || !state.auth) return ''
  if (identityType === 'student') {
    return String(state.auth.studentNo || '').trim()
  }
  return String(state.auth.staffNo || '').trim()
}

function getIdentityAccountNo(state, role) {
  const identity = state && state.identities && state.identities[role]
  const auth = identity && identity.auth
  if (!auth) return ''
  if (role === 'student') return String(auth.studentNo || '').trim()
  if (role === 'staff' || role === 'admin') return String(auth.staffNo || '').trim()
  return ''
}

function getStatePhone(state) {
  if (!state) return ''
  const authPhone = state.auth && state.auth.phone
  const userPhone = state.user && state.user.phone
  return normalizePhone(authPhone || userPhone)
}

function getIdentityPhone(state, role) {
  const identity = state && state.identities && state.identities[role]
  if (!identity) return ''
  const authPhone = identity.auth && identity.auth.phone
  const userPhone = identity.user && identity.user.phone
  return normalizePhone(authPhone || userPhone)
}

function getParticipantIdentity(state) {
  if (!state || !state.identities) return null
  return state.identities.student || state.identities.teacher || null
}

function getParticipantState(state) {
  const sourceState = normalizeState(state)
  const identity = getParticipantIdentity(sourceState)
  if (!identity) return sourceState
  const role = identity.auth && identity.auth.role
  return Object.assign({}, sourceState, {
    auth: cloneAuthProfile(identity.auth),
    user: cloneUserProfile(identity.user, role),
    currentRole: role
  })
}

function resetBusinessState(state) {
  state.user = Object.assign({}, state.user, {
    points: 0,
    rankTotal: 0,
    airIndex: 0,
    streak: 0,
    checkedIn: false
  })
  state.taskStates = {}
  state.taskPoints = {}
  state.taskEvidence = {}
  state.weRun = {}
  state.redemptions = []
  state.cards = []
  state.quizCompleted = false
  state.lastCheckInDate = ''
  state.lastTaskDate = ''
  return state
}

async function assertAccountAvailable(openid, role, accountNo) {
  const identityType = getAccountIdentityType(role)
  const normalizedNo = normalizeAccountNo(accountNo)
  const records = await listUserRecords(10000)
  const duplicated = records.some(record => {
    const ownerOpenid = record._openid || record._id
    if (ownerOpenid === openid) return false

    const state = normalizeState(record)
    return getRegisteredRoles(state).some(registeredRole => {
      if (getAccountIdentityType(registeredRole) !== identityType) return false
      return normalizeAccountNo(getIdentityAccountNo(state, registeredRole)) === normalizedNo
    })
  })

  if (duplicated) {
    throw createBusinessError(
      identityType === 'student' ? 'DUPLICATE_STUDENT_NO' : 'DUPLICATE_STAFF_NO',
      identityType === 'student' ? '该学号已注册' : '该工号已注册'
    )
  }
}

async function assertPhoneAvailable(openid, role, phone) {
  const normalizedPhone = normalizePhone(phone)
  const records = await listUserRecords(10000)
  const duplicated = records.some(record => {
    const ownerOpenid = record._openid || record._id
    if (ownerOpenid === openid) return false

    const state = normalizeState(record)
    if (getRegisteredRoles(state).indexOf(role) < 0) return false
    return getIdentityPhone(state, role) === normalizedPhone
  })

  if (duplicated) {
    throw createBusinessError(
      'DUPLICATE_PHONE_ROLE',
      `该手机号已注册${getRoleLabel(role)}身份`
    )
  }
}

async function registerProfile(openid, payload) {
  const state = await getOrCreateState(openid)
  const profile = payload.profile || {}
  const role = normalizeRole(profile.role || 'student') || 'student'
  if (!role) throw createBusinessError('INVALID_ROLE', '请选择身份')
  const name = String(profile.name || '').trim()
  const college = role === 'teacher' ? '' : String(profile.college || state.user.college).trim()
  const studentNo = String(profile.studentNo || '').trim()
  const staffNo = String(profile.staffNo || '').trim()
  const phone = normalizePhone(profile.phone)
  const inviteCode = String(profile.inviteCode || '').trim().toUpperCase()
  const accountNo = getProfileAccountNo(role, { studentNo, staffNo })
  const identityType = getAccountIdentityType(role)
  const needsAccountNo = role !== 'teacher'
  const existingIdentity = state.identities && state.identities[role] && state.identities[role].auth && state.identities[role].auth.registered
  const previousIdentity = existingIdentity ? state.identities[role] : null

  if (!existingIdentity) {
    assertCanBindRole(state, role)
  }

  if (!name) throw createBusinessError('MISSING_NAME', '请输入姓名')
  if (!phone) throw createBusinessError('MISSING_PHONE', '请输入手机号')
  if (!/^1\d{10}$/.test(phone)) {
    throw createBusinessError('INVALID_PHONE', '请输入正确手机号')
  }
  if (needsAccountNo && !accountNo) {
    throw createBusinessError(
      identityType === 'student' ? 'MISSING_STUDENT_NO' : 'MISSING_STAFF_NO',
      identityType === 'student' ? '请输入学号' : '请输入工号'
    )
  }
  if (needsAccountNo) {
    await assertAccountAvailable(openid, role, accountNo)
  }
  await assertPhoneAvailable(openid, role, phone)

  const verifiedInviteCode = existingIdentity
    ? ((previousIdentity.auth && previousIdentity.auth.inviteCode) || '')
    : await consumeInviteCode(role, inviteCode, openid)

  if (!getRegisteredRoles(state).length) {
    resetBusinessState(state)
  }

  const auth = {
    registered: true,
    role,
    roleLabel: getRoleLabel(role),
    name,
    college,
    phone,
    studentNo,
    staffNo,
    inviteCode: verifiedInviteCode,
    registeredAt: new Date().toISOString()
  }
  const user = Object.assign({}, existingIdentity ? previousIdentity.user : clone(defaultState.user), {
    name,
    college,
    studentNo: accountNo,
    phone,
    role,
    badge: role === 'student' || role === 'teacher' ? '低碳新芽' : getRoleLabel(role)
  })
  state.identities[role] = { auth, user }
  state.currentRole = role
  projectCurrentIdentity(state, role)
  return saveState(openid, state)
}

async function switchIdentity(openid, payload) {
  const state = await getOrCreateState(openid)
  const role = normalizeRole(payload && payload.role)
  if (!role) {
    return { ok: false, code: 'INVALID_ROLE', message: '请选择身份', state }
  }

  const identity = state.identities && state.identities[role]
  if (!identity || !identity.auth || !identity.auth.registered) {
    try {
      assertCanBindRole(state, role)
    } catch (error) {
      return {
        ok: false,
        code: error.code || 'IDENTITY_NOT_AVAILABLE',
        message: error.message || '该身份暂不可绑定',
        state
      }
    }
    return {
      ok: false,
      code: 'IDENTITY_NOT_REGISTERED',
      message: '该身份尚未注册，请先完成注册',
      state
    }
  }

  state.currentRole = role
  projectCurrentIdentity(state, role)
  return { ok: true, state: await saveState(openid, state) }
}

async function checkIn(openid) {
  const state = await getOrCreateState(openid)
  const today = todayKey()
  if (state.lastCheckInDate === today || state.user.checkedIn) {
    return { changed: false, state }
  }
  state.lastCheckInDate = today
  state.user.checkedIn = true
  state.user.streak = Number(state.user.streak || 0) + 1
  state.user.points = Number(state.user.points || 0) + 3
  state.user.rankTotal = Number(state.user.rankTotal || 0) + 3
  return { changed: true, state: await saveState(openid, state) }
}

async function completeTask(openid, payload) {
  const state = await getOrCreateState(openid)
  const task = payload.task || {}
  const taskId = task.id
  if (!taskId) return { changed: false, state }

  const current = state.taskStates[taskId]
  if (current === 'COMPLETED' || current === 'PENDING_REVIEW' || current === 'READY_TO_CLAIM') {
    return { changed: false, state }
  }

  touchDailyTasks(state)
  const nextStatus = payload.status || (task.type === 'PHOTO' ? 'PENDING_REVIEW' : 'COMPLETED')
  state.taskStates[taskId] = nextStatus
  if (payload.evidenceFileId) {
    state.taskEvidence[taskId] = {
      fileId: payload.evidenceFileId,
      submittedAt: Date.now(),
      status: nextStatus
    }
  }
  let awardedPoints = 0
  if (nextStatus === 'READY_TO_CLAIM') {
    markTaskClaimable(state, taskId)
  } else if (nextStatus === 'COMPLETED') {
    const points = getCappedTaskPoints(state, task)
    if (!points) {
      state.taskStates[taskId] = current || 'NOT_STARTED'
      return { changed: false, code: 'LIMIT_REACHED', points: 0, state }
    }
    state.taskPoints[taskId] = points
    state.user.points = Number(state.user.points || 0) + points
    state.user.rankTotal = Number(state.user.rankTotal || 0) + points
    awardedPoints = points
  }
  return { changed: true, points: awardedPoints, state: await saveState(openid, state) }
}

function updateStepEvidence(state, task, awardedPoints, targetPoints) {
  const now = Date.now()
  const existing = (state.taskEvidence || {})[STEP_TASK_ID] || {}
  state.taskEvidence[STEP_TASK_ID] = Object.assign({}, existing, {
    id: existing.id || `${STEP_TASK_ID}-${now}`,
    taskId: STEP_TASK_ID,
    taskName: task.name || TASK_NAMES[STEP_TASK_ID] || STEP_TASK_ID,
    zone: getTaskZone(STEP_TASK_ID),
    points: getTaskAwardedPoints(state, STEP_TASK_ID),
    lastAwardedPoints: Number(awardedPoints || 0),
    targetPoints: Number(targetPoints || 0),
    steps: Number(task.steps || 0),
    submittedAt: existing.submittedAt || now,
    claimedAt: now,
    status: 'COMPLETED'
  })
}

async function claimStepTaskPoints(openid, state, task) {
  const current = state.taskStates[STEP_TASK_ID] || 'NOT_STARTED'
  const normalizedSteps = Number(task.steps || 0)
  const targetPoints = getStepPoints(normalizedSteps)
  const awardedBefore = getTaskAwardedPoints(state, STEP_TASK_ID)

  if (normalizedSteps > 0 || task.timestamp) {
    updateWeRunState(state, normalizedSteps, task.timestamp)
  }

  if (!targetPoints) {
    state.taskStates[STEP_TASK_ID] = current || 'NOT_STARTED'
    return {
      changed: false,
      code: 'NOT_READY_TO_CLAIM',
      points: 0,
      claimedPoints: awardedBefore,
      targetPoints,
      state: await saveState(openid, state)
    }
  }

  const points = getClaimableStepPoints(state, task)
  if (!points) {
    if (awardedBefore > 0) markTaskCompleted(state, STEP_TASK_ID)
    return {
      changed: false,
      code: targetPoints > awardedBefore ? 'LIMIT_REACHED' : 'ALREADY_CLAIMED',
      points: 0,
      claimedPoints: awardedBefore,
      targetPoints,
      state: await saveState(openid, state)
    }
  }

  touchDailyTasks(state)
  const awardedPoints = addTaskPoints(state, STEP_TASK_ID, points)
  updateStepEvidence(state, task, awardedPoints, targetPoints)
  markTaskCompleted(state, STEP_TASK_ID)
  return {
    changed: Boolean(awardedPoints),
    points: awardedPoints,
    claimedPoints: getTaskAwardedPoints(state, STEP_TASK_ID),
    targetPoints,
    state: await saveState(openid, state)
  }
}

async function claimTaskPoints(openid, payload) {
  const state = await getOrCreateState(openid)
  const task = payload.task || {}
  const taskId = task.id
  if (!taskId) return { changed: false, code: 'MISSING_TASK', state }

  if (taskId === STEP_TASK_ID) {
    return claimStepTaskPoints(openid, state, task)
  }

  if (state.taskPoints[taskId]) {
    const evidenceStatus = state.taskEvidence[taskId] && state.taskEvidence[taskId].status
    if (state.taskStates[taskId] !== 'COMPLETED' || evidenceStatus && evidenceStatus !== 'COMPLETED') {
      markTaskCompleted(state, taskId)
      return { changed: false, code: 'ALREADY_CLAIMED', points: Number(state.taskPoints[taskId] || 0), state: await saveState(openid, state) }
    }
    return { changed: false, code: 'ALREADY_CLAIMED', points: Number(state.taskPoints[taskId] || 0), state }
  }

  const current = state.taskStates[taskId] || 'NOT_STARTED'
  if (current !== 'READY_TO_CLAIM' && current !== 'COMPLETED') {
    return { changed: false, code: 'NOT_READY_TO_CLAIM', state }
  }

  touchDailyTasks(state)
  const points = getCappedTaskPoints(state, task)
  if (!points) {
    state.taskStates[taskId] = current === 'READY_TO_CLAIM' ? current : 'NOT_STARTED'
    return { changed: false, code: 'LIMIT_REACHED', points: 0, state: await saveState(openid, state) }
  }

  const awardedPoints = awardTaskPoints(state, taskId, points)
  markTaskCompleted(state, taskId)
  return { changed: Boolean(awardedPoints), points: awardedPoints || points, state: await saveState(openid, state) }
}

async function submitEvidence(openid, payload) {
  const state = await getOrCreateState(openid)
  const task = payload.task || {}
  const taskId = task.id
  if (!taskId) return { changed: false, state }

  const current = state.taskStates[taskId]
  if (current === 'COMPLETED' || current === 'PENDING_REVIEW' || current === 'READY_TO_CLAIM') {
    return {
      changed: false,
      state,
      aiReview: (state.taskEvidence[taskId] || {}).aiReview || null
    }
  }

  const evidence = normalizeEvidenceInput(payload.evidence)
  const aiReview = await reviewEvidenceWithAi(task, evidence)
  touchDailyTasks(state)
  const points = getCappedTaskPoints(state, task)
  if (!points) {
    return { changed: false, code: 'LIMIT_REACHED', points: 0, state }
  }

  const nextStatus = 'PENDING_REVIEW'
  state.taskStates[taskId] = nextStatus
  state.taskEvidence[taskId] = createEvidenceRecord(task, evidence, aiReview, nextStatus, points)
  const awardedPoints = awardTaskPoints(state, taskId, points)
  return { changed: true, points: awardedPoints || points, aiReview, state: await saveState(openid, state) }
}

async function deleteEvidence(openid, payload) {
  const state = await getOrCreateState(openid)
  const task = payload.task || {}
  const taskId = task.id
  if (!taskId) return { changed: false, state }

  const evidence = state.taskEvidence[taskId] || {}
  const deductedPoints = deductTaskPoints(state, taskId)
  state.taskStates[taskId] = 'NOT_STARTED'
  delete state.taskEvidence[taskId]
  const nextState = await saveState(openid, state)

  if (evidence.fileId) {
    try {
      await cloud.deleteFile({ fileList: [evidence.fileId] })
    } catch (error) {
      // 删除云存储失败不阻塞用户重新上传，状态先解除锁定。
    }
  }

  return { changed: true, deductedPoints, state: nextState }
}

function assertAdmin(state) {
  if (!state.auth || state.auth.role !== 'admin') {
    const error = new Error('当前账号没有管理员权限')
    error.code = 'FORBIDDEN'
    throw error
  }
}

async function collectEvidenceFromState(state, owner) {
  const sourceState = normalizeState(state)
  const taskIds = Object.keys(sourceState.taskEvidence || {})
  const items = []

  for (let index = 0; index < taskIds.length; index += 1) {
    const taskId = taskIds[index]
    const evidence = sourceState.taskEvidence[taskId] || {}
    const imageSrc = getTaskEvidenceSource(evidence)
    if (!imageSrc) continue

    let imageUrl = evidence.imageUrl || ''
    if (!imageUrl && evidence.fileId) {
      try {
        imageUrl = await getImageUrl(evidence)
      } catch (error) {
        imageUrl = ''
      }
    }

    items.push(Object.assign({}, evidence, {
      taskId,
      status: evidence.status || sourceState.taskStates[taskId] || 'PENDING_REVIEW',
      owner,
      user: {
        name: sourceState.user.name,
        college: sourceState.user.college,
        studentNo: sourceState.user.studentNo,
        roleLabel: sourceState.auth.roleLabel || getRoleLabel(sourceState.auth.role)
      },
      imageUrl,
      imageSrc: imageUrl || imageSrc
    }))
  }

  return items
}

async function listEvidence(openid) {
  const adminState = await getOrCreateState(openid)
  assertAdmin(adminState)

  const result = await users.limit(100).get()
  let items = []
  for (let index = 0; index < result.data.length; index += 1) {
    const record = result.data[index]
    items = items.concat(await collectEvidenceFromState(record, {
      openid: record._openid || record._id,
      accountNo: record.auth && (record.auth.studentNo || record.auth.staffNo),
      role: record.auth && record.auth.role
    }))
  }

  return {
    ok: true,
    items: items.sort((a, b) => Number(b.submittedAt || 0) - Number(a.submittedAt || 0))
  }
}

function applyManualReviewToState(state, item, reviewStatus) {
  const taskId = item.taskId
  const evidence = state.taskEvidence[taskId] || {}
  const approved = reviewStatus === 'APPROVED'
  const awardedPoints = Number((state.taskPoints || {})[taskId] || 0)
  const nextStatus = approved && awardedPoints ? 'COMPLETED' : (approved ? 'READY_TO_CLAIM' : 'REJECTED')
  state.taskStates[taskId] = nextStatus
  state.taskEvidence[taskId] = Object.assign({}, evidence, {
    status: nextStatus,
    claimedAt: approved && awardedPoints ? (evidence.claimedAt || Date.now()) : evidence.claimedAt,
    adminReview: {
      status: reviewStatus,
      reviewedAt: Date.now()
    }
  })
  if (!approved) {
    deductTaskPoints(state, taskId)
  }
  return state
}

async function reviewEvidence(openid, payload) {
  const adminState = await getOrCreateState(openid)
  assertAdmin(adminState)

  const item = payload.item || {}
  const reviewStatus = payload.reviewStatus === 'APPROVED' ? 'APPROVED' : 'REJECTED'
  const targetOpenid = item.owner && item.owner.openid
  if (!targetOpenid || !item.taskId) {
    return { ok: false, code: 'EVIDENCE_NOT_FOUND', message: '未找到凭证记录' }
  }

  const targetState = await getOrCreateState(targetOpenid)
  if (!targetState.taskEvidence || !targetState.taskEvidence[item.taskId]) {
    return { ok: false, code: 'EVIDENCE_NOT_FOUND', message: '未找到凭证记录' }
  }

  await saveState(targetOpenid, applyManualReviewToState(targetState, item, reviewStatus))
  return await listEvidence(openid)
}

function isRegisteredState(state) {
  return Boolean(state && getParticipantIdentity(normalizeState(state)))
}

function getRankingName(state) {
  const participantState = getParticipantState(state)
  return (participantState.user && participantState.user.name)
    || (participantState.auth && participantState.auth.name)
    || 'User'
}

function getRankingRole(state) {
  const participantState = getParticipantState(state)
  return normalizeRole(
    (participantState.auth && participantState.auth.role) ||
    (participantState.user && participantState.user.role)
  )
}

function getRankingCollege(state) {
  const participantState = getParticipantState(state)
  const college = (participantState.user && participantState.user.college)
    || (participantState.auth && participantState.auth.college)
  const role = normalizeRole(
    (participantState.auth && participantState.auth.role) ||
    (participantState.user && participantState.user.role)
  )
  if (college && !(role === 'teacher' && String(college).toLowerCase() === 'unknown')) return college
  return role === 'teacher' ? '老师' : 'Unknown'
}

function getRankingPoints(state) {
  const participantState = getParticipantState(state)
  return Number((participantState.user && (participantState.user.rankTotal || participantState.user.points)) || 0)
}

function getCarbonReductionGrams(steps) {
  return Math.round(Math.max(0, Number(steps || 0)) * CARBON_REDUCTION_GRAMS_PER_STEP * 10) / 10
}

function formatCarbonReductionText(steps) {
  const grams = getCarbonReductionGrams(steps)
  if (grams >= 1000) return `${Math.round(grams)} g`
  return `${grams.toFixed(1)} g`
}

function updateWeRunState(state, steps, timestamp) {
  const normalizedSteps = Math.max(0, Number(steps || 0))
  const normalizedTimestamp = Number(timestamp || 0)
  touchDailyTasks(state)
  state.weRun = Object.assign({}, state.weRun || {}, {
    todayStep: normalizedSteps,
    steps: normalizedSteps,
    timestamp: normalizedTimestamp,
    carbonReductionGrams: getCarbonReductionGrams(normalizedSteps),
    carbonReductionText: formatCarbonReductionText(normalizedSteps),
    syncedAt: Date.now()
  })
  return state.weRun
}

function getRankingStepInfo(state) {
  const source = state.weRun || state.stepRank || {}
  const evidence = (state.taskEvidence || {}).green_steps || {}
  const steps = Number(source.todayStep || source.steps || evidence.steps || 0)
  const syncedAt = Number(source.syncedAt || evidence.claimedAt || evidence.submittedAt || 0)
  const timestamp = Number(source.timestamp || evidence.timestamp || 0)
  return {
    steps,
    syncedAt,
    timestamp,
    carbonReductionGrams: getCarbonReductionGrams(steps),
    carbonReductionText: formatCarbonReductionText(steps)
  }
}

function getRecordOpenid(record) {
  return String((record && (record._openid || record._id)) || '')
}

function stripRankingOwner(item) {
  const publicItem = Object.assign({}, item)
  delete publicItem.openid
  return publicItem
}

function findRankByOpenid(entries, openid) {
  const matched = entries.find(item => item.openid && item.openid === openid)
  return matched ? matched.rank : 0
}

function buildPersonalRankingEntries(records) {
  return records
    .map(record => {
      const state = normalizeState(record)
      if (!isRegisteredState(state)) return null
      return {
        openid: getRecordOpenid(record),
        name: getRankingName(state),
        college: getRankingCollege(state),
        points: getRankingPoints(state)
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.points - a.points)
    .map((item, index) => Object.assign({ rank: index + 1 }, item))
}

function buildPersonalRanking(records) {
  return buildPersonalRankingEntries(records)
    .slice(0, 50)
    .map(stripRankingOwner)
}

function buildCollegeRankingEntries(records) {
  const stats = {}

  records
    .map(record => normalizeState(record))
    .filter(isRegisteredState)
    .filter(state => getRankingRole(state) !== 'teacher')
    .forEach(state => {
      const college = getRankingCollege(state)
      if (!stats[college]) {
        stats[college] = { name: college, participants: 0, points: 0 }
      }
      stats[college].participants += 1
      stats[college].points += getRankingPoints(state)
    })

  return Object.keys(stats)
    .map(key => stats[key])
    .sort((a, b) => b.points - a.points)
    .map((item, index) => ({
      rank: index + 1,
      name: item.name,
      college: `Participants ${item.participants}`,
      points: item.points
    }))
}

function buildCollegeRanking(records) {
  return buildCollegeRankingEntries(records).slice(0, 50)
}

function buildZoneRanking(records) {
  const stats = {}

  records
    .map(record => normalizeState(record))
    .filter(isRegisteredState)
    .forEach(state => {
      Object.keys(state.taskPoints || {}).forEach(taskId => {
        const evidence = (state.taskEvidence || {})[taskId] || {}
        const zone = evidence.zone || TASK_ZONE_MAP[taskId] || 'UNKNOWN'
        if (!stats[zone]) {
          stats[zone] = { code: zone, participants: 0, points: 0 }
        }
        stats[zone].participants += 1
        stats[zone].points += Number(state.taskPoints[taskId] || 0)
      })
    })

  return Object.keys(stats)
    .map(key => stats[key])
    .sort((a, b) => b.points - a.points)
    .slice(0, 50)
    .map((item, index) => ({
      rank: index + 1,
      code: item.code,
      name: item.code,
      college: `Participants ${item.participants}`,
      points: item.points
    }))
}

function buildWalkingRankingEntries(records, role) {
  return records
    .map(record => {
      const state = normalizeState(record)
      if (!isRegisteredState(state) || getRankingRole(state) !== role) return null
      const stepInfo = getRankingStepInfo(state)
      if (!stepInfo.steps && !stepInfo.syncedAt) return null
      return {
        openid: getRecordOpenid(record),
        name: getRankingName(state),
        college: getRankingCollege(state),
        points: stepInfo.steps,
        steps: stepInfo.steps,
        carbonReductionGrams: stepInfo.carbonReductionGrams,
        carbonReductionText: stepInfo.carbonReductionText,
        syncedAt: stepInfo.syncedAt,
        timestamp: stepInfo.timestamp
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.steps - a.steps || b.syncedAt - a.syncedAt)
    .slice(0, 100)
    .map((item, index) => Object.assign({ rank: index + 1 }, item))
}

function buildWalkingRanking(records, role) {
  return buildWalkingRankingEntries(records, role).map(stripRankingOwner)
}

function findRecordByOpenid(records, openid) {
  return records.find(record => getRecordOpenid(record) === openid) || null
}

function findSelfCollegeRank(records, collegeEntries, openid) {
  const record = findRecordByOpenid(records, openid)
  if (!record) return 0
  const state = normalizeState(record)
  if (!isRegisteredState(state) || getRankingRole(state) === 'teacher') return 0
  const college = getRankingCollege(state)
  const matched = collegeEntries.find(item => item.name === college)
  return matched ? matched.rank : 0
}

async function getRankings(openid) {
  const records = await listUserRecords(1000)
  const personalEntries = buildPersonalRankingEntries(records)
  const collegeEntries = buildCollegeRankingEntries(records)
  const walkingStudentEntries = buildWalkingRankingEntries(records, 'student')
  const walkingTeacherEntries = buildWalkingRankingEntries(records, 'teacher')
  return {
    ok: true,
    updatedAt: Date.now(),
    personal: personalEntries.slice(0, 50).map(stripRankingOwner),
    walking: {
      student: walkingStudentEntries.map(stripRankingOwner),
      teacher: walkingTeacherEntries.map(stripRankingOwner)
    },
    self: {
      personal: findRankByOpenid(personalEntries, openid),
      walking: {
        student: findRankByOpenid(walkingStudentEntries, openid),
        teacher: findRankByOpenid(walkingTeacherEntries, openid)
      },
      college: findSelfCollegeRank(records, collegeEntries, openid),
      zone: 0
    },
    college: collegeEntries.slice(0, 50),
    zone: buildZoneRanking(records)
  }
}

function buildAdminStats(records) {
  const states = records.map(record => normalizeState(record))
  const registeredStates = states.filter(isRegisteredState)
  const roleCounts = { student: 0, teacher: 0, staff: 0, admin: 0 }
  let totalPoints = 0
  let completedTasks = 0
  let pendingEvidence = 0
  let rejectedEvidence = 0
  let redemptions = 0

  registeredStates.forEach(state => {
    getRegisteredRoles(state).forEach(role => {
      if (roleCounts[role] !== undefined) roleCounts[role] += 1
    })
    totalPoints += getRankingPoints(state)
    completedTasks += Object.keys(state.taskStates || {})
      .filter(taskId => ['READY_TO_CLAIM', 'COMPLETED'].indexOf(state.taskStates[taskId]) >= 0).length
    pendingEvidence += Object.keys(state.taskEvidence || {})
      .filter(taskId => ((state.taskEvidence || {})[taskId] || {}).status === 'PENDING_REVIEW').length
    rejectedEvidence += Object.keys(state.taskEvidence || {})
      .filter(taskId => ((state.taskEvidence || {})[taskId] || {}).status === 'REJECTED').length
    redemptions += (state.redemptions || []).length
  })

  return {
    totalUsers: records.length,
    registeredUsers: registeredStates.length,
    totalPoints,
    completedTasks,
    pendingEvidence,
    rejectedEvidence,
    redemptions,
    roleCounts,
    updatedAt: Date.now()
  }
}

async function getAdminStats(openid) {
  const adminState = await getOrCreateState(openid)
  assertAdmin(adminState)

  return {
    ok: true,
    stats: buildAdminStats(await listUserRecords(1000))
  }
}

function sanitizeConfigKey(key) {
  return String(key || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 64)
}

function normalizeConfigObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return clone(value)
  return {}
}

function isExpectedRewardItem(reward, expected) {
  if (!reward || !expected) return false
  const textKeys = ['id', 'name', 'note', 'stockText', 'image', 'color']
  const numberKeys = ['points', 'stock']
  const expectedStockGroup = String(expected.stockGroup || '')

  if (String(reward.stockGroup || '') !== expectedStockGroup) return false
  if (textKeys.some(key => String(reward[key] || '') !== String(expected[key] || ''))) return false
  return numberKeys.every(key => Number(reward[key] || 0) === Number(expected[key] || 0))
}

function shouldSeedCatalogConfig(value) {
  const catalog = normalizeConfigObject(value)
  const rewards = Array.isArray(catalog.rewards) ? catalog.rewards : []
  if (catalog.seedVersion !== CATALOG_SEED_VERSION) return true
  if (rewards.length !== REWARD_CATALOG_ITEMS.length) return true
  if (REWARD_CATALOG_ITEMS.some((expected, index) => String((rewards[index] || {}).id || '') !== expected.id)) return true
  return REWARD_CATALOG_ITEMS.some(expected => {
    const reward = rewards.find(item => String(item.id || '') === expected.id)
    return !isExpectedRewardItem(reward, expected)
  })
}

function buildCatalogConfig(value) {
  const catalog = normalizeConfigObject(value)
  catalog.seedVersion = CATALOG_SEED_VERSION
  catalog.rewards = clone(REWARD_CATALOG_ITEMS)
  return catalog
}

function shouldSeedRulesConfig(value) {
  const rules = normalizeConfigObject(value)
  const image = typeof value === 'string' ? value : rules.image
  return image !== RULES_CONFIG.image || rules.seedVersion !== CATALOG_SEED_VERSION
}

function buildRulesConfig(value) {
  const rules = normalizeConfigObject(value)
  rules.seedVersion = CATALOG_SEED_VERSION
  rules.image = RULES_CONFIG.image
  return rules
}

async function seedConfigIfNeeded(key, value) {
  if (key === 'catalog' && shouldSeedCatalogConfig(value)) {
    return saveSystemConfig(key, buildCatalogConfig(value), 'auto-seed')
  }
  if (key === 'rules' && shouldSeedRulesConfig(value)) {
    return saveSystemConfig(key, buildRulesConfig(value), 'auto-seed')
  }
  if (key === 'inviteCodes' && shouldSeedInviteConfig(value)) {
    return saveSystemConfig(key, createInitialInviteConfig(value), 'auto-seed')
  }
  return value
}

async function getConfig(payload) {
  await ensureConfigCollection()

  const key = sanitizeConfigKey(payload.key)
  if (!key) {
    return { ok: false, code: 'MISSING_CONFIG_KEY', message: 'Missing config key' }
  }

  let value = null
  let updatedAt = null
  try {
    const record = await configs.doc(key).get()
    value = record.data && record.data.value
    updatedAt = record.data && record.data.updatedAt
  } catch (error) {
  }

  value = await seedConfigIfNeeded(key, value)
  return { ok: true, key, value, updatedAt }
}

async function setConfig(openid, payload) {
  const adminState = await getOrCreateState(openid)
  assertAdmin(adminState)
  await ensureConfigCollection()

  const key = sanitizeConfigKey(payload.key)
  if (!key) {
    return { ok: false, code: 'MISSING_CONFIG_KEY', message: 'Missing config key' }
  }

  await configs.doc(key).set({
    data: {
      key,
      value: payload.value,
      updatedBy: openid,
      updatedAt: db.serverDate()
    }
  })

  return { ok: true, key, value: payload.value }
}

async function getConfigValue(key) {
  const result = await getConfig({ key })
  return result && result.value ? result.value : {}
}

async function getInviteConfig() {
  const result = await getConfig({ key: 'inviteCodes' })
  return result && result.value ? result.value : createInitialInviteConfig({})
}

async function saveInviteConfig(value, updatedBy) {
  return saveSystemConfig('inviteCodes', value, updatedBy || 'system')
}

async function consumeInviteCode(role, inviteCode, openid) {
  if (role === 'student' || role === 'teacher') return ''

  const code = normalizeInviteCode(inviteCode)
  if (code.length !== INVITE_CODE_LENGTH) {
    throw createBusinessError('INVALID_INVITE', '请输入8位邀请码')
  }

  const config = await getInviteConfig()
  const codes = Array.isArray(config.codes) ? config.codes.slice() : []
  const index = codes.findIndex(item => {
    return normalizeInviteCode(item.code) === code
      && item.role === role
      && !item.used
  })

  if (index < 0) {
    throw createBusinessError('INVALID_INVITE', '邀请码不正确或已被使用')
  }

  codes[index] = Object.assign({}, codes[index], {
    used: true,
    usedAt: new Date().toISOString(),
    usedBy: openid
  })

  await saveInviteConfig(Object.assign({}, config, { codes }), openid)
  return code
}

async function createInviteCode(openid, payload) {
  const adminState = await getOrCreateState(openid)
  assertAdmin(adminState)

  const role = payload.role === 'admin' ? 'admin' : 'staff'
  const config = await getInviteConfig()
  const codes = Array.isArray(config.codes) ? config.codes.slice() : []
  const code = generateInviteCode(codes.map(item => normalizeInviteCode(item.code)))
  const invite = {
    code,
    role,
    roleLabel: getRoleLabel(role),
    used: false,
    source: 'admin',
    createdAt: new Date().toISOString(),
    createdBy: openid,
    createdByName: adminState.user && adminState.user.name ? adminState.user.name : ''
  }

  codes.unshift(invite)
  await saveInviteConfig(Object.assign({}, config, { codes }), openid)
  return {
    ok: true,
    invite: getPublicInvite(invite)
  }
}

async function saveSystemConfig(key, value, updatedBy) {
  await ensureConfigCollection()
  await configs.doc(key).set({
    data: {
      key,
      value,
      updatedBy: updatedBy || 'system',
      updatedAt: db.serverDate()
    }
  })
  return value
}

function normalizeQuizQuestion(question, index) {
  const source = question || {}
  const title = String(source.title || '').trim()
  const options = Array.isArray(source.options)
    ? source.options.map(item => String(item || '').trim()).filter(Boolean)
    : []
  const answer = Number(source.answer)

  if (!title || options.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= options.length) {
    return null
  }

  return {
    id: source.id || `quiz_${index + 1}`,
    title,
    options,
    answer,
    explain: String(source.explain || '').trim()
  }
}

function shuffleList(list) {
  const result = list.slice()
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = result[index]
    result[index] = result[swapIndex]
    result[swapIndex] = current
  }
  return result
}

function getValidQuizBank(config) {
  return (Array.isArray((config || {}).questions) ? config.questions : [])
    .map(normalizeQuizQuestion)
    .filter(Boolean)
}

function hasBrokenQuizText(value) {
  if (typeof value !== 'string' || /[\u3400-\u9fff]/.test(value)) return false
  return /\?{3,}/.test(value) || /\uFFFD{2,}/.test(value) || /锟斤拷/.test(value)
}

function hasBrokenQuizBank(bank) {
  return bank.some(question => {
    return hasBrokenQuizText(question.title) ||
      hasBrokenQuizText(question.explain) ||
      question.options.some(hasBrokenQuizText)
  })
}

function shouldSeedQuizConfig(config, bank) {
  if (!bank.length) return true
  if (hasBrokenQuizBank(bank)) return true
  return Boolean(
    config &&
    config.seedVersion &&
    bundledQuizConfig.seedVersion &&
    config.seedVersion !== bundledQuizConfig.seedVersion
  )
}

async function writeBundledQuizConfig(updatedBy) {
  const value = clone(bundledQuizConfig)
  await saveSystemConfig('quiz', value, updatedBy || 'system')
  return {
    ok: true,
    key: 'quiz',
    total: getValidQuizBank(value).length,
    value
  }
}

async function seedQuizConfig(openid) {
  const state = await getOrCreateState(openid)
  assertAdmin(state)
  return writeBundledQuizConfig(openid)
}

async function getQuizQuestions(openid, payload) {
  await getOrCreateState(openid)

  let config = await getConfigValue('quiz')
  let bank = getValidQuizBank(config)

  if (shouldSeedQuizConfig(config, bank)) {
    await writeBundledQuizConfig('auto-seed')
    config = await getConfigValue('quiz')
    bank = getValidQuizBank(config)
  }

  const requiredBankSize = Number(config.bankSize || QUIZ_REQUIRED_BANK_SIZE)
  const drawCount = Math.max(1, Math.min(20, Number(payload.count || config.drawCount || QUIZ_DRAW_COUNT)))

  if (bank.length < requiredBankSize) {
    return {
      ok: false,
      code: 'QUIZ_BANK_NOT_READY',
      message: `题库需要 ${requiredBankSize} 道有效题，当前 ${bank.length} 道`,
      questions: [],
      total: bank.length,
      requiredBankSize,
      drawCount
    }
  }

  return {
    ok: true,
    questions: shuffleList(bank).slice(0, drawCount),
    total: bank.length,
    requiredBankSize,
    drawCount,
    points: Number(config.points || 0)
  }
}

function buildStudentCode(openid) {
  return `IMU-${String(openid || '').slice(-6).toUpperCase()}`
}

async function findStudentByCode(code) {
  const normalizedCode = String(code || '').trim().toUpperCase()
  if (!normalizedCode) return null

  const records = await listUserRecords(10000)
  const matched = records.find(record => buildStudentCode(record._openid || record._id) === normalizedCode)
  if (!matched) return null

  const normalizedState = normalizeState(matched)
  if (!getParticipantIdentity(normalizedState)) return null

  return {
    record: matched,
    openid: matched._openid || matched._id,
    state: getParticipantState(normalizedState)
  }
}

async function getStudentCode(openid) {
  const state = await getOrCreateState(openid)
  if (!getParticipantIdentity(state)) {
    throw createBusinessError('PARTICIPANT_NOT_REGISTERED', '请先绑定学生或老师身份')
  }
  const participantState = getParticipantState(state)
  return {
    ok: true,
    code: buildStudentCode(openid),
    user: {
      name: participantState.user.name,
      college: participantState.user.college,
      studentNo: participantState.user.studentNo,
      roleLabel: participantState.auth.roleLabel || getRoleLabel(participantState.auth.role)
    }
  }
}

async function verifyStudentCode(openid, payload) {
  const staffState = await getOrCreateState(openid)
  if (!staffState.auth || ['staff', 'admin'].indexOf(staffState.auth.role) < 0) {
    const error = new Error('Current account has no staff permission')
    error.code = 'FORBIDDEN'
    throw error
  }

  const matched = await findStudentByCode(payload.code)

  if (!matched) {
    return { ok: false, code: 'STUDENT_CODE_NOT_FOUND', message: 'Student code not found' }
  }

  const state = matched.state
  await writeStaffLog(openid, staffState, 'student', {
    studentOpenid: matched.openid,
    studentCode: String(payload.code || '').trim().toUpperCase()
  }, { code: 'OK', status: 'VERIFIED' })

  return {
    ok: true,
    student: {
      name: state.user.name,
      college: state.user.college,
      studentNoMasked: maskAccountNo(state.user.studentNo),
      points: state.user.points,
      rankTotal: state.user.rankTotal,
      roleLabel: state.auth.roleLabel || getRoleLabel(state.auth.role)
    }
  }
}

async function writeStaffLog(openid, staffState, actionId, detail, outcome) {
  await ensureStaffLogsCollection()

  const result = await staffLogs.add({
    data: {
      actionId,
      detail: detail || {},
      outcome: outcome || {},
      staffOpenid: openid,
      staffRole: staffState.auth.role,
      staffName: staffState.user.name,
      createdAtMs: Date.now(),
      createdAt: db.serverDate()
    }
  })

  return result._id
}

function formatStaffLog(record) {
  const detail = record.detail || {}
  const outcome = record.outcome || {}
  return {
    id: record._id,
    actionId: record.actionId || '',
    staffRole: record.staffRole || '',
    staffName: record.staffName || '',
    taskId: detail.taskId || '',
    taskName: detail.taskName || TASK_NAMES[detail.taskId] || '',
    studentName: detail.studentName || '',
    studentCollege: detail.studentCollege || '',
    studentNoMasked: detail.studentNoMasked || '',
    redemptionId: detail.redemptionId || '',
    resultCode: outcome.code || '',
    resultStatus: outcome.status || '',
    points: Number(outcome.points || 0),
    changed: Boolean(outcome.changed),
    createdAtMs: Number(record.createdAtMs || 0)
  }
}

function applyStaffTaskToStudent(targetState, taskId) {
  const task = getServerTask(taskId)
  if (!task) {
    return { changed: false, code: 'INVALID_TASK', status: 'FAILED', points: 0 }
  }

  const current = targetState.taskStates[taskId]
  if (current === 'COMPLETED' || current === 'PENDING_REVIEW' || current === 'READY_TO_CLAIM') {
    return { changed: false, code: 'DUPLICATE_ACTION', status: current, points: Number(targetState.taskPoints[taskId] || 0) }
  }

  const points = getCappedTaskPoints(targetState, task)
  if (!points) {
    return { changed: false, code: 'LIMIT_REACHED', status: 'LIMIT_REACHED', points: 0 }
  }

  touchDailyTasks(targetState)
  awardTaskPoints(targetState, taskId, points)
  markTaskCompleted(targetState, taskId)
  return { changed: true, code: 'OK', status: 'COMPLETED', points }
}

async function recordStaffOperation(openid, payload) {
  const staffState = await getOrCreateState(openid)
  if (!staffState.auth || ['staff', 'admin'].indexOf(staffState.auth.role) < 0) {
    const error = new Error('Current account has no staff permission')
    error.code = 'FORBIDDEN'
    throw error
  }

  const actionId = String(payload.actionId || 'unknown').trim() || 'unknown'
  const detail = payload.detail || {}

  if (actionId === 'recycle' || actionId === 'task') {
    const taskId = String(detail.taskId || '').trim()
    if (!isAllowedStaffTask(actionId, taskId)) {
      return { ok: false, code: 'TASK_NOT_AUTHORIZED', message: '当前任务不属于该工作人员操作类型' }
    }

    const matched = await findStudentByCode(detail.code)
    if (!matched) {
      await writeStaffLog(openid, staffState, actionId, Object.assign({}, detail, {
        taskId,
        taskName: TASK_NAMES[taskId] || taskId
      }), { code: 'STUDENT_CODE_NOT_FOUND', status: 'FAILED' })
      return { ok: false, code: 'STUDENT_CODE_NOT_FOUND', message: '学生码无效' }
    }

    const targetState = matched.state
    const operation = applyStaffTaskToStudent(targetState, taskId)
    if (operation.changed) {
      syncCurrentIdentity(targetState)
      await saveState(matched.openid, targetState)
    }

    const logId = await writeStaffLog(openid, staffState, actionId, {
      taskId,
      taskName: TASK_NAMES[taskId] || taskId,
      studentOpenid: matched.openid,
      studentName: targetState.user.name,
      studentCollege: targetState.user.college,
      studentNoMasked: maskAccountNo(targetState.user.studentNo),
      quantity: detail.quantity || '',
      unit: detail.unit || ''
    }, operation)

    return { ok: operation.code === 'OK', id: logId, actionId, operation }
  }

  const logId = await writeStaffLog(openid, staffState, actionId, detail, { code: 'LOGGED', status: 'LOGGED' })
  return { ok: true, id: logId, actionId }
}

async function listStaffLogs(openid, payload) {
  const staffState = await getOrCreateState(openid)
  if (!staffState.auth || ['staff', 'admin'].indexOf(staffState.auth.role) < 0) {
    const error = new Error('Current account has no staff permission')
    error.code = 'FORBIDDEN'
    throw error
  }

  await ensureStaffLogsCollection()

  const scope = String((payload && payload.scope) || '').trim()
  const includeAll = staffState.auth.role === 'admin' && scope === 'all'
  const todayStart = Number((payload && payload.todayStart) || 0)

  const result = await staffLogs
    .orderBy('createdAtMs', 'desc')
    .limit(100)
    .get()

  const records = (result.data || [])
    .filter(record => includeAll || record.staffOpenid === openid)
    .filter(record => !todayStart || Number(record.createdAtMs || 0) >= todayStart)
    .map(formatStaffLog)

  return { ok: true, items: records }
}

async function listAdminUsers(openid) {
  const adminState = await getOrCreateState(openid)
  assertAdmin(adminState)

  const records = await listUserRecords(10000)
  const usersList = records
    .map(record => normalizeState(record))
    .filter(isRegisteredState)
    .reduce((items, state) => {
      getRegisteredRoles(state).forEach(role => {
        const identity = state.identities[role]
        const auth = identity.auth || {}
        const user = identity.user || {}
        items.push({
          name: user.name,
          college: user.college,
          role,
          roleLabel: auth.roleLabel || getRoleLabel(role),
          accountNoMasked: maskAccountNo(auth.studentNo || auth.staffNo),
          points: Number(user.points || 0),
          rankTotal: Number(user.rankTotal || 0)
        })
      })
      return items
    }, [])
    .sort((a, b) => String(a.role).localeCompare(String(b.role)) || String(a.name).localeCompare(String(b.name), 'zh-Hans-CN'))

  return { ok: true, items: usersList }
}

async function exportAdminData(openid) {
  const adminState = await getOrCreateState(openid)
  assertAdmin(adminState)

  const records = await listUserRecords(1000)
  const stats = buildAdminStats(records)
  const rankings = {
    personal: buildPersonalRanking(records),
    college: buildCollegeRanking(records),
    zone: buildZoneRanking(records)
  }
  const logs = await listStaffLogs(openid, { scope: 'all' })

  return {
    ok: true,
    generatedAt: Date.now(),
    summary: stats,
    rankings,
    operationLogs: logs.items || []
  }
}

async function verifyRedemption(openid, payload) {
  const staffState = await getOrCreateState(openid)
  if (!staffState.auth || ['staff', 'admin'].indexOf(staffState.auth.role) < 0) {
    const error = new Error('Current account has no staff permission')
    error.code = 'FORBIDDEN'
    throw error
  }

  const code = normalizeRedemptionVerifyCode(payload)
  const rawCode = code ? '' : normalizeLegacyRedemptionCode(payload)
  if (!code && !rawCode) {
    return { ok: false, code: 'MISSING_REDEMPTION_CODE', message: 'Missing redemption code' }
  }

  const records = await listUserRecords(10000)
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    const accountState = normalizeState(record)
    const state = getParticipantState(accountState)
    const redemptions = state.redemptions || []
    const redemptionIndex = redemptions.findIndex(item => redemptionCodeMatches(item, code, rawCode))
    if (redemptionIndex < 0) continue

    const redemption = redemptions[redemptionIndex]
    if (redemption.status === 'REDEEMED') {
      return { ok: false, code: 'ALREADY_REDEEMED', redemption }
    }
    if (redemption.status === 'EXPIRED') {
      return { ok: false, code: 'REDEMPTION_EXPIRED', redemption }
    }

    const expiresAt = Number(redemption.expiresAt || 0)
    if (expiresAt && Date.now() > expiresAt) {
      redemptions[redemptionIndex] = Object.assign({}, redemption, {
        status: 'EXPIRED',
        expiredAt: Date.now()
      })
      state.user.points = Number(state.user.points || 0) + Number(redemption.points || 0)
      state.redemptions = redemptions
      syncCurrentIdentity(state)
      await saveState(record._openid || record._id, state)
      return { ok: false, code: 'REDEMPTION_EXPIRED', redemption: redemptions[redemptionIndex] }
    }

    redemptions[redemptionIndex] = Object.assign({}, redemption, {
      status: 'REDEEMED',
      verifiedAt: Date.now(),
      verifiedBy: openid
    })
    state.redemptions = redemptions
    syncCurrentIdentity(state)
    await saveState(record._openid || record._id, state)
    await writeStaffLog(openid, staffState, 'reward', {
      code: code || rawCode,
      verifyCode: redemptions[redemptionIndex].verifyCode || redemptions[redemptionIndex].code || code || rawCode,
      redemptionId: redemption.id,
      rewardId: redemption.rewardId,
      rewardName: redemption.name,
      studentOpenid: record._openid || record._id,
      studentName: state.user.name,
      studentCollege: state.user.college,
      studentNoMasked: maskAccountNo(state.user.studentNo)
    }, { code: 'OK', status: 'REDEEMED', changed: true })
    return { ok: true, redemption: redemptions[redemptionIndex], user: state.user }
  }

  return { ok: false, code: 'REDEMPTION_NOT_FOUND', message: 'Redemption code not found' }
}

function parseQrPayload(code) {
  const raw = String(code || '').trim()
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed
  } catch (error) {
  }

  const upper = raw.toUpperCase()
  const taskMatch = upper.match(/(?:^|[/:?&])IMU-TASK[/:=]([A-Z0-9_-]+)/)
    || upper.match(/(?:^|[/:?&])TASK[/:=]([A-Z0-9_-]+)/)
  if (taskMatch) {
    return { type: 'TASK', taskId: taskMatch[1].toLowerCase() }
  }

  return { raw }
}

function isValidTaskQrForTask(code, taskId) {
  const payload = parseQrPayload(code)
  const type = String(payload.type || payload.qrType || '').toUpperCase()
  const payloadTaskId = String(payload.taskId || payload.task_id || '').trim()
  if (!payloadTaskId) return false
  if (type && type !== 'TASK' && type !== 'IMU-TASK') return false
  return payloadTaskId === taskId
}

async function completeScannedTask(openid, payload) {
  const task = payload.task || {}
  const code = String(payload.code || '').trim()
  if (!task.id) {
    return { ok: false, code: 'MISSING_TASK', message: 'Missing task' }
  }

  if (!isValidTaskQrForTask(code, task.id)) {
    return { ok: false, code: 'INVALID_TASK_CODE', message: 'Invalid task QR code', state: await getOrCreateState(openid) }
  }

  return Object.assign({ ok: true }, await completeTask(openid, { task, status: 'COMPLETED' }))
}

async function redeem(openid, payload) {
  const state = getParticipantState(await getOrCreateState(openid))
  if (!getParticipantIdentity(state)) {
    return { ok: false, code: 'PARTICIPANT_NOT_REGISTERED', state }
  }
  const reward = payload.reward || {}
  const rewardRule = await getRewardRule(reward)
  if (!rewardRule) {
    return { ok: false, code: 'INVALID_REWARD', state }
  }
  const points = Number(rewardRule.points || 0)

  if (Number(state.user.points || 0) < points) {
    return { ok: false, code: 'INSUFFICIENT_POINTS', state }
  }

  const remainingStock = await getRewardRemainingStock(rewardRule)
  if (remainingStock <= 0) {
    return { ok: false, code: 'OUT_OF_STOCK', remainingStock, state }
  }

  const now = Date.now()
  const redemptionNonce = crypto.randomBytes(2).toString('hex').toUpperCase()
  const verifyCode = await generateUniqueRedemptionCode()
  state.user.points = Number(state.user.points || 0) - points
  state.redemptions.unshift({
    id: `TX${now}${redemptionNonce}`,
    rewardId: rewardRule.id,
    name: rewardRule.name,
    points,
    status: '待核销',
    code: verifyCode,
    verifyCode,
    qrPayload: buildRedemptionQrPayload(verifyCode),
    createdAt: now,
    expiresAt: now + 2 * 60 * 60 * 1000
  })
  syncCurrentIdentity(state)
  return { ok: true, state: await saveState(openid, state) }
}

async function addCard(openid, payload) {
  const state = await getOrCreateState(openid)
  const id = payload.id
  if (!id || state.cards.indexOf(id) >= 0) {
    return { changed: false, state }
  }
  state.cards.push(id)
  return { changed: true, state: await saveState(openid, state) }
}

async function finishQuiz(openid, payload) {
  const state = await getOrCreateState(openid)
  if (state.quizCompleted) {
    return { changed: false, state }
  }
  const quizConfig = await getConfigValue('quiz')
  const points = Number(quizConfig.points || 0)
  state.quizCompleted = true
  state.user.points = Number(state.user.points || 0) + points
  state.user.rankTotal = Number(state.user.rankTotal || 0) + points
  return { changed: true, state: await saveState(openid, state) }
}

function buildQuery(params) {
  return Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')
}

function normalizeWeatherLocation(input) {
  const source = input || {}
  const latitude = Number(source.latitude)
  const longitude = Number(source.longitude)
  const location = Object.assign({}, DEFAULT_WEATHER_LOCATION)

  if (latitude >= -90 && latitude <= 90) location.latitude = latitude
  if (longitude >= -180 && longitude <= 180) location.longitude = longitude
  ;['name', 'region', 'label', 'timezone'].forEach(key => {
    if (typeof source[key] === 'string' && source[key].trim()) {
      location[key] = source[key].trim()
    }
  })

  return location
}

function buildWeatherUrl(location) {
  return `https://api.open-meteo.com/v1/forecast?${buildQuery({
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: 'auto',
    current: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'cloud_cover',
      'is_day'
    ].join(','),
    hourly: [
      'temperature_2m',
      'weather_code',
      'precipitation_probability'
    ].join(','),
    forecast_days: 1
  })}`
}

function buildAirUrl(location) {
  return `https://air-quality-api.open-meteo.com/v1/air-quality?${buildQuery({
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: 'auto',
    current: [
      'us_aqi',
      'pm2_5',
      'pm10',
      'carbon_monoxide',
      'nitrogen_dioxide',
      'ozone'
    ].join(',')
  })}`
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, response => {
      const statusCode = response.statusCode || 0
      let body = ''

      response.setEncoding('utf8')
      response.on('data', chunk => {
        body += chunk
      })
      response.on('end', () => {
        if (statusCode < 200 || statusCode >= 300) {
          reject(new Error(`天气接口请求失败：${statusCode}`))
          return
        }

        try {
          resolve(JSON.parse(body || '{}'))
        } catch (error) {
          reject(new Error('天气接口返回格式异常'))
        }
      })
    })

    request.setTimeout(10000, () => {
      request.destroy(new Error('天气接口请求超时'))
    })
    request.on('error', reject)
  })
}

function requestJsonPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const target = new URL(url)
    const request = https.request({
      method: 'POST',
      hostname: target.hostname,
      port: target.port || 443,
      path: `${target.pathname}${target.search}`,
      headers: Object.assign({
        'Content-Type': 'application/json'
      }, headers || {})
    }, response => {
      const statusCode = response.statusCode || 0
      let responseBody = ''

      response.setEncoding('utf8')
      response.on('data', chunk => {
        responseBody += chunk
      })
      response.on('end', () => {
        if (statusCode < 200 || statusCode >= 300) {
          reject(new Error(`大模型接口请求失败：${statusCode} ${responseBody.slice(0, 120)}`))
          return
        }

        try {
          resolve(JSON.parse(responseBody || '{}'))
        } catch (error) {
          reject(new Error('大模型接口返回格式异常'))
        }
      })
    })

    request.setTimeout(20000, () => {
      request.destroy(new Error('大模型接口请求超时'))
    })
    request.on('error', reject)
    request.write(JSON.stringify(body))
    request.end()
  })
}

function normalizeChatCompletionsUrl(input) {
  const baseUrl = String(input || '').trim() || 'https://api.openai.com/v1'
  if (/\/chat\/completions\/?$/.test(baseUrl)) return baseUrl
  return `${baseUrl.replace(/\/$/, '')}/chat/completions`
}

async function getImageUrl(evidence) {
  if (evidence.imageUrl) return evidence.imageUrl
  if (!evidence.fileId) return ''
  const result = await cloud.getTempFileURL({
    fileList: [evidence.fileId]
  })
  const first = (result.fileList || [])[0] || {}
  return first.tempFileURL || ''
}

function stripJsonFence(content) {
  return String(content || '')
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim()
}

function parseAiContent(content) {
  const text = stripJsonFence(content)
  try {
    return JSON.parse(text)
  } catch (error) {
    const matched = text.match(/\{[\s\S]*\}/)
    if (matched) {
      try {
        return JSON.parse(matched[0])
      } catch (innerError) {
        return { passed: null, reason: text.slice(0, 160) }
      }
    }
    return { passed: null, reason: text.slice(0, 160) }
  }
}

async function reviewEvidenceWithAi(task, evidence) {
  const apiKey = process.env.AI_REVIEW_API_KEY || process.env.OPENAI_API_KEY
  const baseUrl = normalizeChatCompletionsUrl(process.env.AI_REVIEW_BASE_URL || process.env.OPENAI_BASE_URL)
  const model = process.env.AI_REVIEW_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini'

  if (!apiKey) {
    return buildSkippedAiReview(task, '云函数未配置 AI_REVIEW_API_KEY，已转管理员人工复审。')
  }

  const imageUrl = await getImageUrl(evidence)
  if (!imageUrl) {
    return buildSkippedAiReview(task, '当前图片没有可供云端访问的 URL，已转管理员人工复审。')
  }

  try {
    const rule = getReviewRule(task)
    const response = await requestJsonPost(baseUrl, {
      Authorization: `Bearer ${apiKey}`
    }, {
      model,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: '你是校园低碳任务图片初审助手。只输出 JSON，不要输出 Markdown。'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                `任务：${task.name || task.id}`,
                `初审规则：${rule}`,
                '请判断图片是否满足任务要求。',
                '输出格式：{"passed":true|false,"reason":"不超过40字的中文理由"}',
                '无法确认时 passed 填 false，并说明需要人工复核。'
              ].join('\n')
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }
      ]
    })
    const content = (((response.choices || [])[0] || {}).message || {}).content || ''
    const parsed = parseAiContent(content)
    const passed = parsed.passed === true
      ? true
      : parsed.passed === false
        ? false
        : null
    if (passed === null) {
      return buildErrorAiReview(task, new Error(parsed.reason || '大模型未返回明确初审结果，已转人工复审。'))
    }
    return {
      status: 'DONE',
      passed,
      label: passed ? 'AI初审通过' : 'AI初审未通过',
      reason: parsed.reason || (passed ? '图片符合任务要求。' : '图片不符合任务要求。'),
      rule,
      model,
      reviewedAt: Date.now()
    }
  } catch (error) {
    return buildErrorAiReview(task, error)
  }
}

async function getWeather(payload) {
  const location = normalizeWeatherLocation(payload.location)
  const [weather, air] = await Promise.all([
    requestJson(buildWeatherUrl(location)),
    requestJson(buildAirUrl(location))
  ])

  return {
    ok: true,
    location,
    weather,
    air,
    source: 'Open-Meteo'
  }
}

function findWeRunStepInfoList(source) {
  if (!source || typeof source !== 'object') return []

  const candidates = [
    source,
    source.data,
    source.result,
    source.weRunData,
    source.data && source.data.data,
    source.result && source.result.data
  ]

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]
    if (candidate && Array.isArray(candidate.stepInfoList)) {
      return candidate.stepInfoList
    }
  }

  return []
}

async function decodeWeRun(openid, event) {
  const weRunData = event.weRunData || {}
  const stepInfoList = findWeRunStepInfoList(weRunData)
  if (!stepInfoList.length) {
    return {
      ok: false,
      code: 'WERUN_DATA_EMPTY',
      message: '未解析到微信运动步数，请在真机微信中授权后重试'
    }
  }

  const sortedList = stepInfoList
    .map(item => ({
      timestamp: Number(item.timestamp || 0),
      step: Number(item.step || 0)
    }))
    .sort((a, b) => a.timestamp - b.timestamp)
  const today = sortedList[sortedList.length - 1] || { timestamp: 0, step: 0 }
  const state = await getOrCreateState(openid)
  updateWeRunState(state, today.step, today.timestamp)
  const nextState = await saveState(openid, state)

  return {
    ok: true,
    todayStep: today.step,
    timestamp: today.timestamp,
    stepInfoList: sortedList,
    carbonReductionGrams: getCarbonReductionGrams(today.step),
    carbonReductionText: formatCarbonReductionText(today.step),
    state: nextState
  }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const action = event.action || 'getState'
  const payload = event.payload || {}

  try {
    if (action === 'getState') {
      return { ok: true, state: await getOrCreateState(openid) }
    }
    if (action === 'updateUser') {
      return { ok: true, state: await updateUser(openid, payload) }
    }
    if (action === 'registerProfile') {
      return { ok: true, state: await registerProfile(openid, payload) }
    }
    if (action === 'switchIdentity') {
      return await switchIdentity(openid, payload)
    }
    if (action === 'checkIn') {
      return Object.assign({ ok: true }, await checkIn(openid))
    }
    if (action === 'completeTask') {
      return Object.assign({ ok: true }, await completeTask(openid, payload))
    }
    if (action === 'claimTaskPoints') {
      return Object.assign({ ok: true }, await claimTaskPoints(openid, payload))
    }
    if (action === 'submitEvidence') {
      return Object.assign({ ok: true }, await submitEvidence(openid, payload))
    }
    if (action === 'deleteEvidence') {
      return Object.assign({ ok: true }, await deleteEvidence(openid, payload))
    }
    if (action === 'listEvidence') {
      return await listEvidence(openid)
    }
    if (action === 'reviewEvidence') {
      return await reviewEvidence(openid, payload)
    }
    if (action === 'getRankings') {
      return await getRankings(openid)
    }
    if (action === 'getAdminStats') {
      return await getAdminStats(openid)
    }
    if (action === 'getConfig') {
      return await getConfig(payload)
    }
    if (action === 'setConfig') {
      return await setConfig(openid, payload)
    }
    if (action === 'getRewardInventory') {
      return await getRewardInventory()
    }
    if (action === 'getStudentCode') {
      return await getStudentCode(openid)
    }
    if (action === 'verifyStudentCode') {
      return await verifyStudentCode(openid, payload)
    }
    if (action === 'recordStaffOperation') {
      return await recordStaffOperation(openid, payload)
    }
    if (action === 'listStaffLogs') {
      return await listStaffLogs(openid, payload)
    }
    if (action === 'verifyRedemption') {
      return await verifyRedemption(openid, payload)
    }
    if (action === 'completeScannedTask') {
      return await completeScannedTask(openid, payload)
    }
    if (action === 'redeem') {
      return await redeem(openid, payload)
    }
    if (action === 'addCard') {
      return Object.assign({ ok: true }, await addCard(openid, payload))
    }
    if (action === 'finishQuiz') {
      return Object.assign({ ok: true }, await finishQuiz(openid, payload))
    }
    if (action === 'getQuizQuestions') {
      return await getQuizQuestions(openid, payload)
    }
    if (action === 'listAdminUsers') {
      return await listAdminUsers(openid)
    }
    if (action === 'exportAdminData') {
      return await exportAdminData(openid)
    }
    if (action === 'createInviteCode') {
      return await createInviteCode(openid, payload)
    }
    if (action === 'seedQuizConfig') {
      return await seedQuizConfig(openid)
    }
    if (action === 'getWeather') {
      return await getWeather(payload)
    }
    if (action === 'decodeWeRun') {
      return await decodeWeRun(openid, event)
    }
    return { ok: false, code: 'UNKNOWN_ACTION', message: `未知操作：${action}` }
  } catch (error) {
    return {
      ok: false,
      code: error.code || error.errCode || 'SERVER_ERROR',
      message: error.message || '云函数执行失败'
    }
  }
}
