const data = require('../../utils/data')
const store = require('../../utils/store')
const cloudApi = require('../../utils/cloud-api')

const WALKING_SYNC_INTERVAL_MS = 30000

function formatCarbonReductionText(steps) {
  const grams = Math.round(Math.max(0, Number(steps || 0)) * 0.142 * 10) / 10
  if (grams >= 1000) return `${Math.round(grams)} g`
  return `${grams.toFixed(1)} g`
}

function enrichList(list, type) {
  const source = Array.isArray(list) ? list : []
  return source.map(item => Object.assign({}, item, {
    initial: String(item.name || '').slice(0, 1) || '#',
    scoreMain: type === 'walking' ? Number(item.steps || item.points || 0) : Number(item.points || 0),
    scoreUnit: type === 'walking' ? '步' : '分',
    scoreMeta: type === 'walking'
      ? (item.carbonReductionText || formatCarbonReductionText(item.steps || item.points))
      : '',
    scoreText: type === 'walking'
      ? `${Number(item.steps || item.points || 0)} 步`
      : `${Number(item.points || 0)} 分`
  }))
}

function ensureTopThree(list) {
  const topThree = list.slice(0, 3)
  while (topThree.length < 3) {
    const index = topThree.length
    topThree.push({
      rank: index + 1,
      name: '虚位以待',
      college: '',
      points: 0,
      initial: '',
      scoreMain: 0,
      scoreUnit: '',
      scoreMeta: '',
      scoreText: ''
    })
  }
  return topThree
}

function getSelectedRankList(rankings, selected, walkingRole) {
  if (selected === 'walking') {
    const walking = rankings.walking || {}
    return walking[walkingRole] || []
  }
  return rankings[selected] || []
}

function getSelectedSelfRank(rankings, selected, walkingRole) {
  const self = (rankings && rankings.self) || {}
  if (selected === 'walking') {
    const walking = self.walking || {}
    return Number(walking[walkingRole] || 0)
  }
  return Number(self[selected] || 0)
}

function formatSelfRank(rank) {
  return rank > 0 ? String(rank) : '--'
}

function mergeCloudRankings(result) {
  const source = result || {}
  const zoneMap = data.zones.reduce((map, zone) => {
    map[zone.code] = zone
    return map
  }, {})
  const zone = (Array.isArray(source.zone) ? source.zone : []).map(item => {
    const zoneInfo = zoneMap[item.code] || {}
    return Object.assign({}, item, {
      name: zoneInfo.name || item.name,
      college: item.college || zoneInfo.short || ''
    })
  })

  return {
    personal: Array.isArray(source.personal) ? source.personal : [],
    walking: {
      student: source.walking && Array.isArray(source.walking.student) ? source.walking.student : [],
      teacher: source.walking && Array.isArray(source.walking.teacher) ? source.walking.teacher : []
    },
    self: Object.assign({ personal: 0, walking: { student: 0, teacher: 0 }, college: 0, zone: 0 }, source.self || {}),
    college: Array.isArray(source.college) ? source.college : [],
    zone
  }
}

function formatUpdatedAt(timestamp) {
  if (!timestamp) return '--'
  const date = new Date(Number(timestamp))
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
}

function getUserCollegeLabel(state) {
  const auth = (state && state.auth) || {}
  const user = (state && state.user) || {}
  const role = auth.role || user.role || ''
  const college = user.college || auth.college || ''
  if (college && !(role === 'teacher' && String(college).toLowerCase() === 'unknown')) return college
  return role === 'teacher' ? '老师' : ''
}

function getUserStepInfo(state) {
  const weRun = (state && state.weRun) || {}
  const steps = Number(weRun.todayStep || weRun.steps || 0)
  return {
    steps,
    carbonReductionText: weRun.carbonReductionText || formatCarbonReductionText(steps)
  }
}

Page({
  data: {
    selected: 'personal',
    walkingRole: 'student',
    rankings: { personal: [], walking: { student: [], teacher: [] }, self: { personal: 0, walking: { student: 0, teacher: 0 }, college: 0, zone: 0 }, college: [], zone: [] },
    list: [],
    topThree: ensureTopThree([]),
    user: {},
    selfRankText: '--',
    userCollegeLabel: '',
    selfScoreMain: 0,
    selfScoreUnit: '分',
    selfScoreMeta: '',
    walkingSyncing: false,
    walkingSyncText: '',
    walkingSyncError: '',
    updatedAt: '--'
  },

  onShow() {
    if (!store.requireRegistered()) return
    this.applyUserDisplay(store.getState())
    store.syncCatalog().then(() => this.loadRankings()).catch(() => this.loadRankings())
    store.syncState().then(state => this.applyUserDisplay(state)).catch(() => this.applyUserDisplay(store.getState()))
    this.loadRankings()
  },

  select(event) {
    const selected = event.currentTarget.dataset.type
    this.refreshVisibleList(selected, this.data.walkingRole, this.data.rankings)
    this.applyUserDisplay(store.getState(), selected)
    if (selected === 'walking') this.syncWalkingSteps({ silent: true })
  },

  selectWalkingRole(event) {
    const walkingRole = event.currentTarget.dataset.role || 'student'
    this.refreshVisibleList(this.data.selected, walkingRole, this.data.rankings)
  },

  applyUserDisplay(state, selected) {
    const source = state || store.getState()
    const currentSelected = selected || this.data.selected
    const user = source.user || {}
    const stepInfo = getUserStepInfo(source)
    this.setData({
      user,
      userCollegeLabel: getUserCollegeLabel(source),
      selfScoreMain: currentSelected === 'walking' ? stepInfo.steps : Number(user.rankTotal || user.points || 0),
      selfScoreUnit: currentSelected === 'walking' ? '步' : '分',
      selfScoreMeta: currentSelected === 'walking' ? stepInfo.carbonReductionText : ''
    })
  },

  refreshVisibleList(selected, walkingRole, rankings) {
    const nextSelected = selected || this.data.selected
    const nextWalkingRole = walkingRole || this.data.walkingRole
    const nextRankings = rankings || this.data.rankings
    const list = enrichList(getSelectedRankList(nextRankings, nextSelected, nextWalkingRole), nextSelected)
    this.setData({
      selected: nextSelected,
      walkingRole: nextWalkingRole,
      list,
      topThree: ensureTopThree(list),
      selfRankText: formatSelfRank(getSelectedSelfRank(nextRankings, nextSelected, nextWalkingRole))
    })
  },

  loadRankings() {
    store.getRankingsAsync().then(result => {
      const rankings = mergeCloudRankings(result)
      const list = enrichList(getSelectedRankList(rankings, this.data.selected, this.data.walkingRole), this.data.selected)
      this.setData({
        rankings,
        list,
        topThree: ensureTopThree(list),
        selfRankText: formatSelfRank(getSelectedSelfRank(rankings, this.data.selected, this.data.walkingRole)),
        updatedAt: formatUpdatedAt(result && result.updatedAt)
      })
    }).catch(error => {
      this.setData({
        rankings: { personal: [], walking: { student: [], teacher: [] }, self: { personal: 0, walking: { student: 0, teacher: 0 }, college: 0, zone: 0 }, college: [], zone: [] },
        list: [],
        topThree: ensureTopThree([]),
        selfRankText: '--',
        updatedAt: '--'
      })
      wx.showToast({ title: error && error.message ? error.message : '排行榜加载失败', icon: 'none' })
    })
  },

  syncWalkingSteps(options) {
    const silent = options && options.silent === true
    if (this.walkingSyncBusy) return
    if (silent && Date.now() - Number(this.lastWalkingSyncedAt || 0) < WALKING_SYNC_INTERVAL_MS) return

    this.walkingSyncBusy = true
    if (!silent) this.setData({ walkingSyncing: true, walkingSyncText: '', walkingSyncError: '' })

    if (!wx.cloud || !wx.cloud.CloudID) {
      this.walkingSyncBusy = false
      this.setData({
        walkingSyncing: false,
        walkingSyncError: '微信云开发未启用，暂时无法同步微信步数'
      })
      return
    }

    wx.getWeRunData({
      success: result => {
        const cloudID = result.cloudID
        if (!cloudID) {
          this.walkingSyncBusy = false
          this.setData({
            walkingSyncing: false,
            walkingSyncError: '当前基础库未返回微信步数，请在真机微信中重试'
          })
          return
        }

        cloudApi.callWithOpenData('decodeWeRun', {}, {
          weRunData: wx.cloud.CloudID(cloudID)
        }).then(response => {
          this.walkingSyncBusy = false
          this.lastWalkingSyncedAt = Date.now()
          if (response.state) {
            store.saveState(response.state)
            this.applyUserDisplay(response.state, 'walking')
          }
          this.setData({
            walkingSyncing: false,
            walkingSyncText: `已同步 ${Number(response.todayStep || 0)} 步`,
            walkingSyncError: ''
          })
          this.loadRankings()
        }).catch(error => {
          this.walkingSyncBusy = false
          this.setData({
            walkingSyncing: false,
            walkingSyncError: error && error.message ? error.message : '微信步数同步失败'
          })
        })
      },
      fail: () => {
        this.walkingSyncBusy = false
        this.setData({
          walkingSyncing: false,
          walkingSyncError: '请授权微信运动后同步步数'
        })
      }
    })
  }
})
