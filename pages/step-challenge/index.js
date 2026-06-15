const cloudApi = require('../../utils/cloud-api')
const store = require('../../utils/store')
const data = require('../../utils/data')

const CAMPUSES = []
const STEP_LEVELS = []
const EMPTY_CAMPUS = {
  id: '',
  name: '',
  label: '',
  latitude: 0,
  longitude: 0,
  scale: 16,
  address: '',
  bounds: null
}
let DEFAULT_CAMPUS = EMPTY_CAMPUS

function replaceArray(target, source) {
  target.splice.apply(target, [0, target.length].concat(Array.isArray(source) ? source : []))
}

function mergeListByKey(defaultList, sourceList, keyName) {
  const defaults = (defaultList || []).reduce((result, item) => {
    const key = item && item[keyName]
    if (key !== undefined && key !== null) result[String(key)] = item
    return result
  }, {})

  return (sourceList || []).map(item => {
    const key = item && item[keyName]
    return Object.assign({}, defaults[String(key)] || {}, item)
  })
}

function normalizeStepConfig(value) {
  const source = value && typeof value === 'object' ? value : {}
  const startPoint = data.stepChallenge.startPoint || null
  const endPoint = data.stepChallenge.endPoint || startPoint
  const campuses = data.stepChallenge.campuses || []
  const stepLevels = Array.isArray(source.stepLevels) && source.stepLevels.length
    ? mergeListByKey(data.stepChallenge.stepLevels, source.stepLevels, 'steps')
    : data.stepChallenge.stepLevels

  return {
    campuses: campuses.map(campus => Object.assign({}, campus, {
      startPoint,
      endPoint
    })),
    stepLevels,
    startPoint,
    endPoint
  }
}

function applyStepConfig(config) {
  const source = normalizeStepConfig(config)
  replaceArray(CAMPUSES, source.campuses)
  replaceArray(STEP_LEVELS, source.stepLevels)
  DEFAULT_CAMPUS = CAMPUSES[0] || EMPTY_CAMPUS
  return DEFAULT_CAMPUS
}
const STEP_TASK_ID = 'green_steps'
const FAST_LOCATION_POLL_INTERVAL = 200
const STEP_REALTIME_SYNC_INTERVAL_MS = 5000
const STEP_SYNC_TIMEOUT_MS = 12000
const STEP_JUMP_ANIMATION_MS = 420
const MIN_ROUTE_POINT_GAP_METERS = 1.5
const MIN_ROUTE_SAMPLE_INTERVAL_MS = 180
const MAX_ROUTE_ACCURACY_METERS = 70
const MAX_FIRST_POINT_ACCURACY_METERS = 100
const MAX_WALK_OR_RUN_SPEED_MPS = 8
const MAX_ABNORMAL_SPEED_MPS = 10.5
const MAX_ROUTE_SEGMENT_METERS = 10
const ROUTE_JUMP_SUSPECT_DISTANCE_METERS = 45
const ROUTE_JUMP_CONFIRM_RADIUS_METERS = 16
const ROUTE_JUMP_CONFIRM_COUNT = 3
const ROUTE_JUMP_CONFIRM_MS = 1200
const ROUTE_JITTER_RADIUS_METERS = 10
const ROUTE_MAX_DYNAMIC_GAP_METERS = 7
const ROUTE_SHARP_TURN_DEGREES = 65
const ROUTE_TURN_CONFIRM_DISTANCE_METERS = 26
const ROUTE_TURN_CONFIRM_DEGREES = 34
const ROUTE_BACKTRACK_TOLERANCE_METERS = 3
const ROUTE_RENDER_INTERVAL_MS = 120
const ROUTE_RENDER_POINT_CAP = 1200
const ROUTE_RENDER_TAIL_POINTS = 180
const MAP_RECENTER_DISTANCE_METERS = 180
const ACTIVE_MAP_SCALE_OFFSET = 1
const MIN_ACTIVE_MAP_SCALE = 18
const MAX_ACTIVE_MAP_SCALE = 20
const MAP_VISIBILITY_PADDING_RATIO = 0.12
const MAP_REGION_CHECK_DELAY_MS = 80
const EARTH_METERS_PER_DEGREE = 111320
const ROUTE_GREEN = '#00C853'
const CAMPUS_NEARBY_DISTANCE_METERS = 2400
const CAMPUS_DISPLAY_RULES = [
  {
    id: 'north',
    label: '内蒙古大学北校区',
    latitude: 40.8183,
    longitude: 111.6971,
    bounds: {
      minLatitude: 40.812,
      maxLatitude: 40.824,
      minLongitude: 111.688,
      maxLongitude: 111.705
    }
  },
  {
    id: 'east',
    label: '内蒙古大学东校区',
    latitude: 40.8179,
    longitude: 111.7062,
    bounds: {
      minLatitude: 40.811,
      maxLatitude: 40.823,
      minLongitude: 111.701,
      maxLongitude: 111.716
    }
  },
  {
    id: 'south',
    label: '内蒙古大学南校区',
    latitude: 40.7599,
    longitude: 111.6764,
    bounds: {
      minLatitude: 40.752,
      maxLatitude: 40.764,
      minLongitude: 111.671,
      maxLongitude: 111.694
    }
  }
]
// 10000 steps ~= 1.42 kgCO2e, so one step is about 0.142 gCO2e.
const CARBON_REDUCTION_GRAMS_PER_STEP = 0.142

applyStepConfig(data.stepChallenge)

function toRad(value) {
  return Number(value || 0) * Math.PI / 180
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function getActiveMapScale(campus) {
  const baseScale = Number(campus && campus.scale || DEFAULT_CAMPUS.scale || 17)
  const safeScale = isFinite(baseScale) ? baseScale : 17
  return clamp(safeScale + ACTIVE_MAP_SCALE_OFFSET, MIN_ACTIVE_MAP_SCALE, MAX_ACTIVE_MAP_SCALE)
}

function distanceMeters(from, to) {
  const radius = 6371000
  const lat1 = toRad(from.latitude)
  const lat2 = toRad(to.latitude)
  const deltaLat = toRad(to.latitude - from.latitude)
  const deltaLon = toRad(to.longitude - from.longitude)
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)
  return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function meterVector(from, to) {
  const midLatitude = toRad((Number(from.latitude) + Number(to.latitude)) / 2)
  return {
    x: (Number(to.longitude) - Number(from.longitude)) * EARTH_METERS_PER_DEGREE * Math.cos(midLatitude),
    y: (Number(to.latitude) - Number(from.latitude)) * EARTH_METERS_PER_DEGREE
  }
}

function vectorLength(vector) {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y)
}

function dotVector(a, b) {
  return a.x * b.x + a.y * b.y
}

function angleBetweenVectors(a, b) {
  const lengthA = vectorLength(a)
  const lengthB = vectorLength(b)
  if (!lengthA || !lengthB) return 0
  return Math.acos(clamp(dotVector(a, b) / (lengthA * lengthB), -1, 1)) * 180 / Math.PI
}

function pointFromMeterVector(origin, vector, template) {
  const longitudeScale = EARTH_METERS_PER_DEGREE * Math.cos(toRad(origin.latitude)) || EARTH_METERS_PER_DEGREE
  return {
    latitude: origin.latitude + vector.y / EARTH_METERS_PER_DEGREE,
    longitude: origin.longitude + vector.x / longitudeScale,
    accuracy: template.accuracy,
    timestamp: template.timestamp
  }
}

function interpolateRoutePoint(from, to, ratio) {
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * ratio,
    longitude: from.longitude + (to.longitude - from.longitude) * ratio,
    accuracy: to.accuracy,
    timestamp: Math.round((from.timestamp || to.timestamp || Date.now()) + ((to.timestamp || Date.now()) - (from.timestamp || to.timestamp || Date.now())) * ratio)
  }
}

function isInsideCampus(location, campus) {
  const bounds = campus && campus.bounds
  if (!bounds || !location) return false
  return location.latitude >= bounds.minLatitude
    && location.latitude <= bounds.maxLatitude
    && location.longitude >= bounds.minLongitude
    && location.longitude <= bounds.maxLongitude
}

function pickCampusDisplayRule(location) {
  if (!location) return null
  const matchedRule = CAMPUS_DISPLAY_RULES.find(rule => isInsideCampus(location, rule))
  if (matchedRule) return matchedRule

  const nearestRule = CAMPUS_DISPLAY_RULES
    .map(rule => Object.assign({}, rule, {
      distance: Math.round(distanceMeters(location, rule))
    }))
    .sort((a, b) => a.distance - b.distance)[0]

  if (nearestRule && nearestRule.distance <= CAMPUS_NEARBY_DISTANCE_METERS) {
    return nearestRule
  }

  return null
}

function withCampusDisplayInfo(campus, location) {
  const sourceCampus = campus || DEFAULT_CAMPUS
  const displayRule = pickCampusDisplayRule(location || sourceCampus)
  if (!displayRule) {
    return sourceCampus
  }

  return Object.assign({}, sourceCampus, {
    id: `imu-${displayRule.id}`,
    name: displayRule.label,
    label: displayRule.label,
    displayLabel: displayRule.label,
    latitude: displayRule.latitude,
    longitude: displayRule.longitude,
    bounds: displayRule.bounds
  })
}

function pickCampus(location) {
  const matchedCampus = CAMPUSES.find(campus => isInsideCampus(location, campus))
  if (matchedCampus) return withCampusDisplayInfo(matchedCampus, location)

  const nearestCampus = CAMPUSES
    .map(campus => Object.assign({}, campus, {
      distance: Math.round(distanceMeters(location, campus))
    }))
    .sort((a, b) => a.distance - b.distance)[0] || DEFAULT_CAMPUS

  return withCampusDisplayInfo(nearestCampus, location)
}

function formatTime(timestamp) {
  if (!timestamp) return '尚未同步'
  const date = new Date(timestamp)
  const pad = value => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDateTime(timestamp) {
  if (!timestamp) return '--'
  const date = new Date(timestamp)
  const pad = value => String(value).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDuration(ms) {
  const seconds = Math.max(0, Math.floor(Number(ms || 0) / 1000))
  const minutes = Math.floor(seconds / 60)
  const remainSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainSeconds).padStart(2, '0')}`
}

function formatDistance(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`
  return `${Math.round(meters)} m`
}

function formatCarbonReduction(steps) {
  const grams = Math.max(0, Number(steps || 0) * CARBON_REDUCTION_GRAMS_PER_STEP)
  if (grams >= 1000) return `${Math.round(grams)} g`
  return `${grams.toFixed(1)} g`
}

function formatPoint(point) {
  if (!point) return '暂无'
  return `${Number(point.latitude).toFixed(4)}, ${Number(point.longitude).toFixed(4)}`
}

function getLocationAccuracy(point) {
  const accuracy = Number(point && (point.accuracy || point.horizontalAccuracy) || 0)
  return Number.isFinite(accuracy) ? accuracy : 0
}

function getDynamicRouteGap(point) {
  const accuracy = getLocationAccuracy(point)
  if (!accuracy) return MIN_ROUTE_POINT_GAP_METERS
  return clamp(accuracy * 0.18, MIN_ROUTE_POINT_GAP_METERS, ROUTE_MAX_DYNAMIC_GAP_METERS)
}

function getLocationTimestamp(location) {
  const timestamp = Number(location && (location.time || location.timestamp) || 0)
  if (timestamp <= 0) return Date.now()
  return timestamp < 10000000000 ? timestamp * 1000 : timestamp
}

function toMapPoint(point) {
  return {
    latitude: point.latitude,
    longitude: point.longitude
  }
}

function isSameMapPoint(first, second) {
  if (!first || !second) return false
  return Number(first.latitude).toFixed(6) === Number(second.latitude).toFixed(6)
    && Number(first.longitude).toFixed(6) === Number(second.longitude).toFixed(6)
}

function getCampusMarkerLabel(campus) {
  return campus && (campus.displayLabel || campus.label || campus.name) || ''
}

function getStepReward(steps) {
  const level = STEP_LEVELS
    .slice()
    .sort((a, b) => Number(b.steps || 0) - Number(a.steps || 0))
    .find(item => Number(steps || 0) >= Number(item.steps || 0))
  return level ? level.points : 0
}

function getNextTarget(steps) {
  const levels = STEP_LEVELS
    .slice()
    .sort((a, b) => Number(a.steps || 0) - Number(b.steps || 0))
  const next = levels.find(item => Number(steps || 0) < Number(item.steps || 0))
  const last = levels[levels.length - 1]
  return Number((next || last || {}).steps || 0)
}

function buildStepMetricData(steps, status) {
  const normalizedSteps = Number(steps || 0)
  const rewardPoints = getStepReward(normalizedSteps)
  const nextTarget = getNextTarget(normalizedSteps)
  const maxTarget = Math.max.apply(null, STEP_LEVELS.map(item => Number(item.steps || 0)).concat([1]))
  return {
    steps: normalizedSteps,
    rewardPoints,
    nextTarget,
    progressPercent: Math.min(100, Math.round(normalizedSteps / maxTarget * 100)),
    carbonReductionText: formatCarbonReduction(normalizedSteps),
    canClaim: rewardPoints > 0 && status !== 'COMPLETED'
  }
}

function buildMarkers(campus, location, routePoints, challengeEnded) {
  const campusLabel = getCampusMarkerLabel(campus)
  const markers = [
    {
      id: 1,
      latitude: campus.latitude,
      longitude: campus.longitude,
      title: campusLabel,
      width: 30,
      height: 30,
      callout: {
        content: campusLabel,
        display: 'ALWAYS',
        borderRadius: 8,
        padding: 8,
        bgColor: '#FFFFFF',
        color: '#174D39',
        fontSize: 13
      }
    }
  ]

  if (routePoints.length) {
    markers.push({
      id: 3,
      latitude: routePoints[0].latitude,
      longitude: routePoints[0].longitude,
      title: '起点',
      width: 24,
      height: 24,
      callout: {
        content: '起点',
        display: 'ALWAYS',
        borderRadius: 7,
        padding: 6,
        bgColor: '#EAF8F0',
        color: '#16835D',
        fontSize: 12
      }
    })
  }

  if (location) {
    markers.push({
      id: 2,
      latitude: location.latitude,
      longitude: location.longitude,
      title: challengeEnded ? '终点' : '当前位置',
      width: 26,
      height: 26,
      callout: {
        content: challengeEnded ? '终点' : '当前位置',
        display: 'ALWAYS',
        borderRadius: 7,
        padding: 6,
        bgColor: '#FFFFFF',
        color: '#174D39',
        fontSize: 12
      }
    })
  }

  return markers
}

function normalizeRouteSegments(routeSource) {
  if (!Array.isArray(routeSource) || !routeSource.length) return []
  const segments = Array.isArray(routeSource[0]) ? routeSource : [routeSource]
  return segments.filter(segment => Array.isArray(segment) && segment.length >= 2)
}

function simplifyRouteSegmentForRender(segment, maxPoints, tailPoints) {
  if (!Array.isArray(segment) || segment.length <= maxPoints) {
    return (segment || []).map(toMapPoint)
  }

  const keepTail = Math.min(tailPoints, Math.max(2, maxPoints - 2))
  const headEnd = Math.max(1, segment.length - keepTail)
  const headBudget = Math.max(2, maxPoints - keepTail)
  const step = Math.max(1, Math.ceil(headEnd / headBudget))
  const points = []

  for (let index = 0; index < headEnd; index += step) {
    points.push(toMapPoint(segment[index]))
  }

  segment.slice(-keepTail).forEach(point => {
    const lastPoint = points[points.length - 1]
    if (!lastPoint || !isSameMapPoint(lastPoint, point)) {
      points.push(toMapPoint(point))
    }
  })

  return points
}

function buildPolyline(routeSource, highlighted, options) {
  const renderOptions = options || {}
  const segments = normalizeRouteSegments(routeSource)
  const maxPoints = Math.max(2, Number(renderOptions.maxPoints || 0))
  const tailPoints = Math.max(2, Number(renderOptions.tailPoints || ROUTE_RENDER_TAIL_POINTS))

  return segments.map(segment => ({
    points: maxPoints
      ? simplifyRouteSegmentForRender(segment, maxPoints, tailPoints)
      : segment.map(toMapPoint),
    color: ROUTE_GREEN,
    width: highlighted ? 14 : 10,
    borderColor: ROUTE_GREEN,
    borderWidth: 0,
    arrowLine: false
  }))
}

function buildRouteRenderPolyline(routeSource, highlighted) {
  return buildPolyline(routeSource, highlighted, {
    maxPoints: ROUTE_RENDER_POINT_CAP,
    tailPoints: ROUTE_RENDER_TAIL_POINTS
  })
}

function buildIncludePoints(routePoints, backupPoint) {
  const points = routePoints.length ? routePoints : (backupPoint ? [backupPoint] : [])
  return simplifyRouteSegmentForRender(points, ROUTE_RENDER_POINT_CAP, ROUTE_RENDER_TAIL_POINTS)
}

function normalizeRegion(region) {
  const southwest = region && region.southwest
  const northeast = region && region.northeast
  if (!southwest || !northeast) return null
  return {
    minLatitude: Math.min(Number(southwest.latitude), Number(northeast.latitude)),
    maxLatitude: Math.max(Number(southwest.latitude), Number(northeast.latitude)),
    minLongitude: Math.min(Number(southwest.longitude), Number(northeast.longitude)),
    maxLongitude: Math.max(Number(southwest.longitude), Number(northeast.longitude))
  }
}

function isLocationVisibleInRegion(location, region) {
  const bounds = normalizeRegion(region)
  if (!bounds || !location) return false
  const latitude = Number(location.latitude)
  const longitude = Number(location.longitude)
  if (!isFinite(latitude) || !isFinite(longitude)) return false

  const latitudePadding = (bounds.maxLatitude - bounds.minLatitude) * MAP_VISIBILITY_PADDING_RATIO
  const longitudePadding = (bounds.maxLongitude - bounds.minLongitude) * MAP_VISIBILITY_PADDING_RATIO
  return latitude >= bounds.minLatitude + latitudePadding
    && latitude <= bounds.maxLatitude - latitudePadding
    && longitude >= bounds.minLongitude + longitudePadding
    && longitude <= bounds.maxLongitude - longitudePadding
}

function shouldMoveMapCenter(center, location) {
  if (!center || !location) return true
  return distanceMeters(center, location) > MAP_RECENTER_DISTANCE_METERS
}

Page({
  data: {
    loadingLocation: true,
    loadingSteps: false,
    locationError: '',
    stepError: '',
    campus: DEFAULT_CAMPUS,
    latitude: DEFAULT_CAMPUS.latitude,
    longitude: DEFAULT_CAMPUS.longitude,
    scale: DEFAULT_CAMPUS.scale,
    markers: buildMarkers(DEFAULT_CAMPUS, null, [], false),
    polyline: [],
    mapIncludePoints: [],
    userLocation: null,
    routePoints: [],
    routePointCount: 0,
    routeDistanceText: '0 m',
    routeDurationText: '00:00',
    routeStartText: '--',
    routeEndText: '--',
    routeStartPointText: '暂无',
    routeEndPointText: '暂无',
    routeSummaryVisible: false,
    challengeActive: false,
    challengeEnded: false,
    steps: 0,
    stepsJumping: false,
    rewardPoints: 0,
    nextTarget: getNextTarget(0),
    progressPercent: 0,
    carbonReductionText: formatCarbonReduction(0),
    syncedAtText: '尚未同步',
    canClaim: false,
    claiming: false,
    status: 'NOT_STARTED',
    statusLabel: '尚未完成'
  },

  onLoad() {
    if (!store.requireRole('student')) return
    this.routePoints = []
    this.routeSegments = []
    this.routeDistance = 0
    this.lastRouteAcceptedAt = 0
    this.pendingTurnPoint = null
    this.resetRouteJumpCandidate()
    this.challengeStartedAt = Date.now()
    this.updateStepNav(DEFAULT_CAMPUS, '正在定位当前位置')
    this.refreshStatus()
    this.startNetworkRecoveryWatch()
    this.startChallenge()
    this.syncSteps()
    store.syncCatalog().then(() => this.refreshStatus()).catch(() => this.refreshStatus())
    this.loadStepConfig().then(() => {
      this.refreshStatus()
      this.refreshStepMetrics()
    }).catch(error => {
      this.setData({
        loadingLocation: false,
        locationError: error && error.message ? error.message : '步数挑战配置未加载'
      })
    })
  },

  onShow() {
    if (!store.requireRole('student')) return
    this.startNetworkRecoveryWatch()
    this.refreshStatus()
    if (this.data.challengeActive && !this.data.challengeEnded) {
      this.startLocationTracking()
      this.startDurationTimer()
      this.startRealtimeStepSync()
    }
  },

  onHide() {
    this.stopLocationTracking()
    this.stopFastLocationPolling()
    this.stopDurationTimer()
    this.stopRealtimeStepSync()
    this.clearMapVisibilityTimer()
    this.clearRouteRenderTimer()
    this.pendingRouteRender = null
  },

  onUnload() {
    this.stopLocationTracking()
    this.stopFastLocationPolling()
    this.stopDurationTimer()
    this.stopRealtimeStepSync()
    this.clearStepJumpTimer()
    this.clearMapVisibilityTimer()
    this.clearRouteRenderTimer()
    this.pendingRouteRender = null
    this.stopNetworkRecoveryWatch()
  },

  loadStepConfig() {
    return store.getConfigAsync('stepChallenge').then(result => {
      const config = normalizeStepConfig(result.value)
      const campus = applyStepConfig(config)
      if (!CAMPUSES.length) {
        throw new Error('步数挑战校区未配置')
      }
      this.applyLoadedCampus(campus)
      return config
    }).catch(() => {
      const config = normalizeStepConfig(data.stepChallenge)
      const campus = applyStepConfig(config)
      if (!CAMPUSES.length) {
        throw new Error('步数挑战校区未配置')
      }
      this.applyLoadedCampus(campus)
      return config
    })
  },

  refreshStatus() {
    const state = store.getState()
    const status = state.taskStates[STEP_TASK_ID] || 'NOT_STARTED'
    this.setData({
      status,
      statusLabel: status === 'COMPLETED' ? '已领取' : '开始挑战',
      canClaim: this.data.rewardPoints > 0 && status !== 'COMPLETED'
    })
  },

  refreshStepMetrics() {
    this.setData(buildStepMetricData(this.data.steps, this.data.status))
  },

  updateStepNav(campus, statusText) {
    const nav = this.selectComponent && this.selectComponent('#stepNav')
    if (nav && nav.setStepCampus) {
      nav.setStepCampus(campus, statusText)
    }
  },

  applyLoadedCampus(campus) {
    const routePoints = this.routePoints || []
    const routeSegments = this.routeSegments || routePoints
    const currentLocation = this.data.userLocation
    const displayCampus = withCampusDisplayInfo(campus, currentLocation || campus)
    const nextData = {
      campus: displayCampus,
      markers: buildMarkers(displayCampus, currentLocation, routePoints, this.data.challengeEnded),
      polyline: buildRouteRenderPolyline(routeSegments, this.data.challengeEnded)
    }

    if (!this.mapCenteredOnce) {
      nextData.latitude = displayCampus.latitude
      nextData.longitude = displayCampus.longitude
      nextData.scale = this.data.challengeActive && !this.data.challengeEnded
        ? getActiveMapScale(displayCampus)
        : displayCampus.scale
    }

    this.setData(nextData)
  },

  startChallenge() {
    this.routePoints = []
    this.routeSegments = []
    this.routeDistance = 0
    this.lastRouteAcceptedAt = 0
    this.pendingTurnPoint = null
    this.resetRouteJumpCandidate()
    this.challengeStartedAt = Date.now()
    this.mapCenterLocation = null
    this.mapCenteredOnce = false
    this.routeRenderedOnce = false
    this.pendingRouteRender = null
    this.lastRouteRenderAt = 0
    this.clearRouteRenderTimer()
    this.setData({
      challengeActive: true,
      challengeEnded: false,
      routeSummaryVisible: false,
      routePoints: [],
      routePointCount: 0,
      routeDistanceText: '0 m',
      routeDurationText: '00:00',
      routeStartText: formatDateTime(this.challengeStartedAt),
      routeEndText: '--',
      routeStartPointText: '待定位',
      routeEndPointText: '待定位',
      polyline: [],
      mapIncludePoints: [],
      loadingLocation: true,
      locationError: '',
      scale: getActiveMapScale(this.data.campus || DEFAULT_CAMPUS)
    })
    this.startDurationTimer()
    this.startRealtimeStepSync()
    this.startLocationTracking()
    this.loadLocation()
  },

  loadLocation() {
    this.setData({ loadingLocation: true, locationError: '' })

    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      success: location => {
        this.applyLocation(location, '')
        this.startLocationTracking()
      },
      fail: () => {
        const fallbackLocation = this.routePoints[this.routePoints.length - 1] || this.data.userLocation
        if (fallbackLocation) {
          const campus = pickCampus(fallbackLocation)
          const message = '定位暂未恢复，网络连接后会继续绘制路线'
          this.updateStepNav(campus, message)
          this.scheduleRouteRender(fallbackLocation, campus, {
            locationError: message,
            shouldCenterMap: false,
            force: true
          })
          return
        }

        const fallbackCampus = withCampusDisplayInfo(DEFAULT_CAMPUS, DEFAULT_CAMPUS)
        const message = '定位暂未开启，已展示默认校区地图'
        this.updateStepNav(fallbackCampus, message)
        this.mapCenterLocation = toMapPoint(fallbackCampus)
        this.mapCenteredOnce = true
        this.setData({
          loadingLocation: false,
          locationError: message,
          campus: fallbackCampus,
          latitude: fallbackCampus.latitude,
          longitude: fallbackCampus.longitude,
          scale: getActiveMapScale(fallbackCampus),
          markers: buildMarkers(fallbackCampus, null, this.routePoints || [], this.data.challengeEnded)
        })
      }
    })
  },

  applyLocation(location, locationError) {
    const userLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: getLocationAccuracy(location),
      timestamp: getLocationTimestamp(location)
    }
    const active = this.data.challengeActive && !this.data.challengeEnded
    let routeChanged = false
    if (active) {
      routeChanged = this.addRoutePoint(userLocation)
    }
    const displayLocation = active && this.routePoints.length
      ? this.routePoints[this.routePoints.length - 1]
      : userLocation
    const campus = pickCampus(displayLocation)
    this.updateStepNav(campus, locationError || getCampusMarkerLabel(campus))
    const accuracy = getLocationAccuracy(displayLocation)
    const shouldCenterMap = !this.mapCenteredOnce
      || ((!accuracy || accuracy <= MAX_ROUTE_ACCURACY_METERS) && shouldMoveMapCenter(this.mapCenterLocation, displayLocation))
    if (active) {
      const forceRender = !this.routeRenderedOnce
        || shouldCenterMap
        || (locationError || '') !== (this.data.locationError || '')

      if (routeChanged || forceRender) {
        this.scheduleRouteRender(displayLocation, campus, {
          locationError,
          shouldCenterMap,
          force: forceRender
        })
      }
      return
    }

    const nextData = {
      loadingLocation: false,
      locationError: locationError || '',
      userLocation: displayLocation,
      campus,
      markers: buildMarkers(campus, displayLocation, this.routePoints, this.data.challengeEnded),
      polyline: buildRouteRenderPolyline(this.routeSegments || this.routePoints, this.data.challengeEnded),
      mapIncludePoints: this.data.challengeEnded ? buildIncludePoints(this.routePoints, displayLocation) : this.data.mapIncludePoints,
      routePointCount: this.routePoints.length,
      routeDistanceText: formatDistance(this.routeDistance),
      routeStartPointText: formatPoint(this.routePoints[0]),
      routeEndPointText: formatPoint(this.routePoints[this.routePoints.length - 1])
    }

    if (shouldCenterMap) {
      this.mapCenteredOnce = true
      this.mapCenterLocation = toMapPoint(displayLocation)
      nextData.latitude = displayLocation.latitude
      nextData.longitude = displayLocation.longitude
      nextData.scale = getActiveMapScale(campus)
    }

    this.setData(nextData, () => {
      if (this.data.challengeActive && !this.data.challengeEnded) {
        this.ensureLocationVisible(displayLocation, campus)
      }
    })
  },

  buildRouteRenderData(displayLocation, campus, locationError, shouldCenterMap) {
    const nextData = {
      loadingLocation: false,
      locationError: locationError || '',
      userLocation: displayLocation,
      campus,
      markers: buildMarkers(campus, displayLocation, this.routePoints, this.data.challengeEnded),
      polyline: buildRouteRenderPolyline(this.routeSegments || this.routePoints, this.data.challengeEnded),
      mapIncludePoints: this.data.challengeEnded ? buildIncludePoints(this.routePoints, displayLocation) : this.data.mapIncludePoints,
      routePointCount: this.routePoints.length,
      routeDistanceText: formatDistance(this.routeDistance),
      routeStartPointText: formatPoint(this.routePoints[0]),
      routeEndPointText: formatPoint(this.routePoints[this.routePoints.length - 1])
    }

    if (shouldCenterMap) {
      this.mapCenteredOnce = true
      this.mapCenterLocation = toMapPoint(displayLocation)
      nextData.latitude = displayLocation.latitude
      nextData.longitude = displayLocation.longitude
      nextData.scale = getActiveMapScale(campus)
    }

    return nextData
  },

  flushRouteRender() {
    const pending = this.pendingRouteRender
    if (!pending) return

    this.clearRouteRenderTimer()
    this.pendingRouteRender = null
    this.lastRouteRenderAt = Date.now()
    this.routeRenderedOnce = true

    const nextData = this.buildRouteRenderData(
      pending.displayLocation,
      pending.campus,
      pending.locationError,
      pending.shouldCenterMap
    )

    this.setData(nextData, () => {
      if (this.data.challengeActive && !this.data.challengeEnded) {
        this.ensureLocationVisible(pending.displayLocation, pending.campus)
      }
    })
  },

  scheduleRouteRender(displayLocation, campus, options) {
    const renderOptions = options || {}
    const previousPending = this.pendingRouteRender
    this.pendingRouteRender = {
      displayLocation,
      campus,
      locationError: renderOptions.locationError || '',
      shouldCenterMap: Boolean(renderOptions.shouldCenterMap || (previousPending && previousPending.shouldCenterMap))
    }

    const now = Date.now()
    const elapsed = now - (this.lastRouteRenderAt || 0)
    if (renderOptions.force || elapsed >= ROUTE_RENDER_INTERVAL_MS) {
      this.flushRouteRender()
      return
    }

    if (!this.routeRenderTimer) {
      this.routeRenderTimer = setTimeout(() => {
        this.flushRouteRender()
      }, Math.max(0, ROUTE_RENDER_INTERVAL_MS - elapsed))
    }
  },

  clearRouteRenderTimer() {
    if (this.routeRenderTimer) {
      clearTimeout(this.routeRenderTimer)
      this.routeRenderTimer = null
    }
  },

  startNetworkRecoveryWatch() {
    if (this.networkWatchStarted) return

    if (wx.getNetworkType) {
      wx.getNetworkType({
        success: result => {
          this.networkConnected = result.networkType !== 'none'
        }
      })
    }

    if (!wx.onNetworkStatusChange) return

    this.networkStatusHandler = this.networkStatusHandler || (result => {
      this.networkConnected = result.isConnected
      if (result.isConnected) {
        this.resumeTrackingAfterNetworkRecovery()
      }
    })

    wx.onNetworkStatusChange(this.networkStatusHandler)
    this.networkWatchStarted = true
  },

  stopNetworkRecoveryWatch() {
    if (this.networkStatusHandler && wx.offNetworkStatusChange) {
      wx.offNetworkStatusChange(this.networkStatusHandler)
    }
    this.networkWatchStarted = false
  },

  resumeTrackingAfterNetworkRecovery() {
    if (!this.data.challengeActive || this.data.challengeEnded) return

    this.locationPollingBusy = false
    this.pendingTurnPoint = null
    this.resetRouteJumpCandidate()
    this.stopLocationTracking()
    this.startLocationTracking()
    this.pollLocationOnce({ force: true })
    this.syncSteps({ silent: true, force: true })
  },

  getMapContext() {
    if (!this.mapContext && wx.createMapContext) {
      this.mapContext = wx.createMapContext('campusMap', this)
    }
    return this.mapContext
  },

  centerMapOnLocation(location, campus) {
    if (!location) return
    this.mapCenteredOnce = true
    this.mapCenterLocation = toMapPoint(location)
    this.setData({
      latitude: location.latitude,
      longitude: location.longitude,
      scale: getActiveMapScale(campus || this.data.campus)
    })
  },

  clearMapVisibilityTimer() {
    if (this.mapVisibilityTimer) {
      clearTimeout(this.mapVisibilityTimer)
      this.mapVisibilityTimer = null
    }
  },

  ensureLocationVisible(location, campus) {
    if (!location || !this.data.challengeActive || this.data.challengeEnded) return
    this.clearMapVisibilityTimer()
    const checkId = (this.mapVisibilityCheckId || 0) + 1
    this.mapVisibilityCheckId = checkId
    this.pendingVisibleLocation = location

    this.mapVisibilityTimer = setTimeout(() => {
      this.mapVisibilityTimer = null
      if (checkId !== this.mapVisibilityCheckId || !this.data.challengeActive || this.data.challengeEnded) return

      const targetLocation = this.pendingVisibleLocation || location
      const mapContext = this.getMapContext()
      const recenterByDistance = () => {
        if (shouldMoveMapCenter(this.mapCenterLocation, targetLocation)) {
          this.centerMapOnLocation(targetLocation, campus)
        }
      }

      if (!mapContext || !mapContext.getRegion) {
        recenterByDistance()
        return
      }

      mapContext.getRegion({
        success: region => {
          if (checkId !== this.mapVisibilityCheckId || !this.data.challengeActive || this.data.challengeEnded) return
          if (!isLocationVisibleInRegion(targetLocation, region)) {
            this.centerMapOnLocation(targetLocation, campus)
          }
        },
        fail: recenterByDistance
      })
    }, MAP_REGION_CHECK_DELAY_MS)
  },

  isPendingTurnConfirmed(routePoint) {
    const lastPoint = this.routePoints[this.routePoints.length - 1]
    const pendingPoint = this.pendingTurnPoint
    if (!lastPoint || !pendingPoint) return false

    const pendingVector = meterVector(lastPoint, pendingPoint)
    const candidateVector = meterVector(lastPoint, routePoint)
    const pendingLength = vectorLength(pendingVector)
    const candidateLength = vectorLength(candidateVector)
    if (pendingLength < MIN_ROUTE_POINT_GAP_METERS || candidateLength < MIN_ROUTE_POINT_GAP_METERS) return false

    const turnAngle = angleBetweenVectors(pendingVector, candidateVector)
    const pendingGap = distanceMeters(pendingPoint, routePoint)
    return turnAngle <= ROUTE_TURN_CONFIRM_DEGREES || pendingGap <= ROUTE_JITTER_RADIUS_METERS
  },

  getRouteTurnState(routePoint) {
    const lastPoint = this.routePoints[this.routePoints.length - 1]
    const previousPoint = this.routePoints[this.routePoints.length - 2]
    if (!lastPoint || !previousPoint) return { action: 'append', points: [routePoint] }

    const previousVector = meterVector(previousPoint, lastPoint)
    const candidateVector = meterVector(lastPoint, routePoint)
    const previousLength = vectorLength(previousVector)
    const candidateLength = vectorLength(candidateVector)
    if (previousLength < MIN_ROUTE_POINT_GAP_METERS || candidateLength < MIN_ROUTE_POINT_GAP_METERS) {
      this.pendingTurnPoint = null
      return { action: 'append', points: [routePoint] }
    }

    const previousUnit = {
      x: previousVector.x / previousLength,
      y: previousVector.y / previousLength
    }
    const forwardMeters = dotVector(candidateVector, previousUnit)
    const lateralMeters = Math.sqrt(Math.max(0, candidateLength * candidateLength - forwardMeters * forwardMeters))
    const turnAngle = angleBetweenVectors(previousVector, candidateVector)

    if (forwardMeters < ROUTE_BACKTRACK_TOLERANCE_METERS && candidateLength < ROUTE_TURN_CONFIRM_DISTANCE_METERS) {
      return { action: 'discard' }
    }

    if (turnAngle >= ROUTE_SHARP_TURN_DEGREES && candidateLength < ROUTE_TURN_CONFIRM_DISTANCE_METERS) {
      if (this.isPendingTurnConfirmed(routePoint)) {
        const pendingPoint = this.pendingTurnPoint
        this.pendingTurnPoint = null
        return { action: 'append', points: [pendingPoint, routePoint] }
      }
      this.pendingTurnPoint = routePoint
      return { action: 'hold' }
    }

    this.pendingTurnPoint = null

    if (turnAngle >= ROUTE_TURN_CONFIRM_DEGREES
      && lateralMeters > ROUTE_JITTER_RADIUS_METERS
      && candidateLength < ROUTE_TURN_CONFIRM_DISTANCE_METERS) {
      const lateralVector = {
        x: candidateVector.x - previousUnit.x * forwardMeters,
        y: candidateVector.y - previousUnit.y * forwardMeters
      }
      const adjustedForward = Math.max(MIN_ROUTE_POINT_GAP_METERS, forwardMeters)
      const adjustedVector = {
        x: previousUnit.x * adjustedForward + lateralVector.x * 0.28,
        y: previousUnit.y * adjustedForward + lateralVector.y * 0.28
      }
      return {
        action: 'append',
        points: [pointFromMeterVector(lastPoint, adjustedVector, routePoint)]
      }
    }

    return { action: 'append', points: [routePoint] }
  },

  getCurrentRouteSegment() {
    this.routeSegments = this.routeSegments || []
    if (!this.routeSegments.length) {
      this.routeSegments.push([])
    }
    return this.routeSegments[this.routeSegments.length - 1]
  },

  appendRoutePoint(routePoint, options) {
    const startNewSegment = options && options.startNewSegment
    if (startNewSegment) {
      this.routeSegments = this.routeSegments || []
      this.routeSegments.push([routePoint])
      this.routePoints.push(routePoint)
      return true
    }

    const lastPoint = this.routePoints[this.routePoints.length - 1]
    if (!lastPoint) {
      this.getCurrentRouteSegment().push(routePoint)
      this.routePoints.push(routePoint)
      return true
    }

    const gap = distanceMeters(lastPoint, routePoint)
    if (gap < 1) return false

    const segmentCount = Math.max(1, Math.ceil(gap / MAX_ROUTE_SEGMENT_METERS))
    let appended = false
    for (let index = 1; index <= segmentCount; index += 1) {
      const nextPoint = index === segmentCount
        ? routePoint
        : interpolateRoutePoint(lastPoint, routePoint, index / segmentCount)
      const currentLastPoint = this.routePoints[this.routePoints.length - 1]
      const segmentGap = distanceMeters(currentLastPoint, nextPoint)
      if (segmentGap < 1) continue
      this.routeDistance += segmentGap
      this.routePoints.push(nextPoint)
      this.getCurrentRouteSegment().push(nextPoint)
      appended = true
    }
    return appended
  },

  // Far points are quarantined until repeated stable samples confirm relocation.
  resetRouteJumpCandidate() {
    this.pendingJumpPoint = null
    this.pendingJumpCount = 0
    this.pendingJumpStartedAt = 0
  },

  isRouteJumpSuspect(lastPoint, routePoint, gap, elapsedMs) {
    if (!lastPoint || gap <= ROUTE_JUMP_SUSPECT_DISTANCE_METERS) return false

    const elapsedSeconds = Math.max(0, Number(elapsedMs || 0) / 1000)
    if (!elapsedSeconds) return true

    const runningReach = MAX_WALK_OR_RUN_SPEED_MPS * elapsedSeconds + ROUTE_JUMP_SUSPECT_DISTANCE_METERS
    return gap > runningReach
  },

  holdRouteJumpCandidate(routePoint) {
    const timestamp = routePoint.timestamp || Date.now()
    const pendingPoint = this.pendingJumpPoint

    if (!pendingPoint || distanceMeters(pendingPoint, routePoint) > ROUTE_JUMP_CONFIRM_RADIUS_METERS) {
      this.pendingJumpPoint = routePoint
      this.pendingJumpCount = 1
      this.pendingJumpStartedAt = timestamp
      this.pendingTurnPoint = null
      return false
    }

    this.pendingJumpPoint = routePoint
    this.pendingJumpCount += 1
    const stableFor = Math.max(0, timestamp - (this.pendingJumpStartedAt || timestamp))
    if (this.pendingJumpCount >= ROUTE_JUMP_CONFIRM_COUNT && stableFor >= ROUTE_JUMP_CONFIRM_MS) {
      this.resetRouteJumpCandidate()
    }

    this.pendingTurnPoint = null
    return false
  },

  addRoutePoint(point) {
    const lastPoint = this.routePoints[this.routePoints.length - 1]
    const accuracy = getLocationAccuracy(point)
    const timestamp = point.timestamp || Date.now()
    const routePoint = {
      latitude: point.latitude,
      longitude: point.longitude,
      accuracy,
      timestamp
    }

    if (!lastPoint) {
      if (accuracy && accuracy > MAX_FIRST_POINT_ACCURACY_METERS) return false
      this.appendRoutePoint(routePoint)
      this.lastRouteAcceptedAt = timestamp
      this.resetRouteJumpCandidate()
      return true
    }

    const gap = distanceMeters(lastPoint, routePoint)
    const elapsedMs = Math.max(0, timestamp - (lastPoint.timestamp || this.lastRouteAcceptedAt || timestamp))
    const minRouteGap = getDynamicRouteGap(routePoint)

    if (accuracy && accuracy > MAX_ROUTE_ACCURACY_METERS) {
      this.pendingTurnPoint = null
      return false
    }

    if (elapsedMs < MIN_ROUTE_SAMPLE_INTERVAL_MS && gap < minRouteGap * 2) {
      return false
    }

    if (gap < minRouteGap) return false

    const elapsedSeconds = elapsedMs > 0 ? elapsedMs / 1000 : 0
    const speed = elapsedSeconds > 0 ? gap / elapsedSeconds : 0
    const jumpSuspect = this.isRouteJumpSuspect(lastPoint, routePoint, gap, elapsedMs)
    if (jumpSuspect || speed > MAX_ABNORMAL_SPEED_MPS) {
      return this.holdRouteJumpCandidate(routePoint)
    }

    if (elapsedSeconds > 0 && speed > MAX_WALK_OR_RUN_SPEED_MPS) {
      this.pendingTurnPoint = null
      return false
    }

    this.resetRouteJumpCandidate()

    const turnState = this.getRouteTurnState(routePoint)
    if (turnState.action !== 'append') return false

    const appended = turnState.points.reduce((changed, item) => this.appendRoutePoint(item) || changed, false)
    if (appended) {
      this.lastRouteAcceptedAt = timestamp
    }
    return appended
  },

  startLocationTracking() {
    this.startFastLocationPolling()
    if (this.locationTrackingStarted || !wx.startLocationUpdate || !wx.onLocationChange) return

    this.locationChangeHandler = this.locationChangeHandler || (location => {
      if (!this.data.challengeActive || this.data.challengeEnded) return
      this.applyLocation(location, '')
    })

    wx.startLocationUpdate({
      type: 'gcj02',
      success: () => {
        this.locationTrackingStarted = true
        wx.onLocationChange(this.locationChangeHandler)
      },
      fail: () => {
        this.locationTrackingStarted = false
        this.startFastLocationPolling()
      }
    })
  },

  pollLocationOnce(options) {
    const force = options && options.force
    if (!this.data.challengeActive || this.data.challengeEnded || (this.locationPollingBusy && !force)) return
    this.locationPollingBusy = true
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      highAccuracyExpireTime: 1000,
      success: location => {
        if (!this.data.challengeActive || this.data.challengeEnded) return
        this.applyLocation(location, '')
      },
      fail: () => {
        if (!this.data.challengeActive || this.data.challengeEnded) return
        const fallbackLocation = this.routePoints[this.routePoints.length - 1] || this.data.userLocation
        if (fallbackLocation) {
          const campus = pickCampus(fallbackLocation)
          this.scheduleRouteRender(fallbackLocation, campus, {
            locationError: this.networkConnected === false ? '网络已断开，路线将在恢复后继续' : '定位信号弱，正在继续尝试',
            shouldCenterMap: false,
            force: !this.routeRenderedOnce
          })
        }
      },
      complete: () => {
        this.locationPollingBusy = false
      }
    })
  },

  startFastLocationPolling() {
    if (this.locationPollingTimer) return
    this.pollLocationOnce()
    this.locationPollingTimer = setInterval(() => {
      this.pollLocationOnce()
    }, FAST_LOCATION_POLL_INTERVAL)
  },

  stopFastLocationPolling() {
    if (this.locationPollingTimer) {
      clearInterval(this.locationPollingTimer)
      this.locationPollingTimer = null
    }
    this.locationPollingBusy = false
  },

  stopLocationTracking() {
    if (this.locationChangeHandler && wx.offLocationChange) {
      wx.offLocationChange(this.locationChangeHandler)
    }
    if (this.locationTrackingStarted && wx.stopLocationUpdate) {
      wx.stopLocationUpdate()
    }
    this.locationTrackingStarted = false
  },

  startDurationTimer() {
    this.stopDurationTimer()
    this.durationTimer = setInterval(() => {
      if (!this.data.challengeActive || this.data.challengeEnded) return
      this.setData({
        routeDurationText: formatDuration(Date.now() - this.challengeStartedAt)
      })
    }, 1000)
  },

  stopDurationTimer() {
    if (this.durationTimer) {
      clearInterval(this.durationTimer)
      this.durationTimer = null
    }
  },

  endChallenge() {
    this.stopLocationTracking()
    this.stopFastLocationPolling()
    this.stopDurationTimer()
    this.stopRealtimeStepSync()
    this.clearRouteRenderTimer()
    this.pendingRouteRender = null
    const endedAt = Date.now()
    const duration = endedAt - this.challengeStartedAt
    const lastPoint = this.routePoints[this.routePoints.length - 1] || this.data.userLocation
    const startPoint = this.routePoints[0] || lastPoint
    this.setData({
      challengeActive: false,
      challengeEnded: true,
      routeSummaryVisible: true,
      routeDurationText: formatDuration(duration),
      routeDistanceText: formatDistance(this.routeDistance),
      markers: buildMarkers(this.data.campus, lastPoint, this.routePoints, true),
      polyline: buildRouteRenderPolyline(this.routeSegments || this.routePoints, true),
      mapIncludePoints: buildIncludePoints(this.routePoints, lastPoint),
      routePointCount: this.routePoints.length,
      routeStartText: formatDateTime(this.challengeStartedAt),
      routeEndText: formatDateTime(endedAt),
      routeStartPointText: formatPoint(startPoint),
      routeEndPointText: formatPoint(lastPoint)
    })
    this.syncSteps()
  },

  goHome() {
    wx.reLaunch({ url: '/pages/home/index' })
  },

  startRealtimeStepSync() {
    this.stopRealtimeStepSync()
    if (!this.data.challengeActive || this.data.challengeEnded) return

    this.stepSyncTimer = setInterval(() => {
      if (!this.data.challengeActive || this.data.challengeEnded) return
      this.syncSteps({ silent: true })
    }, STEP_REALTIME_SYNC_INTERVAL_MS)
  },

  stopRealtimeStepSync() {
    if (this.stepSyncTimer) {
      clearInterval(this.stepSyncTimer)
      this.stepSyncTimer = null
    }
  },

  clearStepJumpTimer() {
    if (this.stepJumpStartTimer) {
      clearTimeout(this.stepJumpStartTimer)
      this.stepJumpStartTimer = null
    }
    if (this.stepJumpTimer) {
      clearTimeout(this.stepJumpTimer)
      this.stepJumpTimer = null
    }
  },

  triggerStepJump() {
    this.clearStepJumpTimer()
    this.setData({ stepsJumping: false })
    this.stepJumpStartTimer = setTimeout(() => {
      this.stepJumpStartTimer = null
      this.setData({ stepsJumping: true })
      this.stepJumpTimer = setTimeout(() => {
        this.stepJumpTimer = null
        this.setData({ stepsJumping: false })
      }, STEP_JUMP_ANIMATION_MS)
    }, 20)
  },

  finishStepSync(nextData) {
    this.stepSyncBusy = false
    this.stepSyncStartedAt = 0
    this.setData(Object.assign({ loadingSteps: false }, nextData || {}))
  },

  applyStepSyncResult(response) {
    const previousSteps = Number(this.data.steps || 0)
    const steps = Number(response.todayStep || 0)
    this.finishStepSync(Object.assign(buildStepMetricData(steps, this.data.status), {
      syncedAtText: formatTime(Date.now()),
      stepError: ''
    }))
    if (steps !== previousSteps || (this.data.challengeActive && !this.data.challengeEnded)) {
      this.triggerStepJump()
    }
  },

  syncSteps(options) {
    const silent = options && options.silent === true
    const force = options && options.force === true
    const now = Date.now()
    if (this.stepSyncBusy && !force && now - (this.stepSyncStartedAt || now) < STEP_SYNC_TIMEOUT_MS) return

    this.stepSyncBusy = true
    this.stepSyncStartedAt = now
    if (!silent) {
      this.setData({ loadingSteps: true, stepError: '' })
    }

    if (!wx.cloud || !wx.cloud.CloudID) {
      this.finishStepSync({
        stepError: '微信云开发未启用，暂时无法读取微信运动步数'
      })
      return
    }

    this.readWeRunData()
  },

  readWeRunData() {
    wx.getWeRunData({
      success: result => {
        const cloudID = result.cloudID
        if (!cloudID) {
          this.finishStepSync({
            stepError: '当前基础库未返回云开发步数数据，请在真机微信中重试'
          })
          return
        }

        cloudApi.callWithOpenData('decodeWeRun', {}, {
          weRunData: wx.cloud.CloudID(cloudID)
        }).then(response => {
          this.applyStepSyncResult(response)
        }).catch(error => {
          this.finishStepSync({
            stepError: error && error.message ? error.message : '微信步数暂时同步失败'
          })
        })
      },
      fail: () => {
        this.finishStepSync({
          stepError: '请授权微信运动后同步步数'
        })
      }
    })
  },

  openSettings() {
    wx.openSetting({
      success: () => {
        this.loadLocation()
        this.syncSteps()
      }
    })
  },

  claimReward() {
    if (this.data.status === 'COMPLETED') {
      wx.showToast({ title: '今日已完成', icon: 'none' })
      return
    }
    if (!this.data.canClaim) {
      wx.showToast({ title: `达到 ${this.data.nextTarget || 0} 步后可领取`, icon: 'none' })
      return
    }

    const task = data.tasks.find(item => item.id === STEP_TASK_ID)
    if (!task) return

    const rewardTask = Object.assign({}, task, {
      steps: this.data.steps,
      points: this.data.rewardPoints
    })
    this.setData({ claiming: true })
    store.claimTaskPointsAsync(rewardTask).then(result => {
      this.setData({ claiming: false })
      wx.showToast({
        title: result.changed ? `领取成功 +${result.points || this.data.rewardPoints}` : '今日已领取',
        icon: result.changed ? 'success' : 'none'
      })
      this.refreshStatus()
    }).catch(() => {
      this.setData({ claiming: false })
      wx.showToast({ title: '领取失败，请稍后重试', icon: 'none' })
    })
  }
})

