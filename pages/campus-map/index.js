const store = require('../../utils/store')
const data = require('../../utils/data')

const PIN_COLLISION_X = 6
const PIN_COLLISION_Y = 8
const PIN_SEPARATION_OFFSETS = [
  { left: 6, top: 8 },
  { left: -6, top: 8 },
  { left: 6, top: -8 },
  { left: -6, top: -8 },
  { left: 0, top: 12 },
  { left: 0, top: -12 }
]

const PIN_POSITION_OVERRIDES = {
  签: { left: 89, top: 89, hotLeft: 85.5, hotTop: 84, hotWidth: 7, hotHeight: 10 },
  走: { left: 80, top: 89, hotLeft: 76.5, hotTop: 84, hotWidth: 7, hotHeight: 10 },
  盘: { left: 42, top: 15, hotLeft: 38.5, hotTop: 10, hotWidth: 7, hotHeight: 10 },
  循: { left: 51, top: 36, hotLeft: 47.5, hotTop: 31, hotWidth: 7, hotHeight: 10 },
  礼: { left: 59, top: 36, hotLeft: 55.5, hotTop: 31, hotWidth: 7, hotHeight: 10 }
}
const REQUIRED_MAP_BUTTON_ICONS = ['签', '盘', '循', '走', '礼']
const CANTEEN_NAV_TARGET_KEYS = ['canteen', 'east_canteen', 'dining_hall', 'clean_plate']
const ARTS_NAV_TARGET_KEYS = ['walk_start', 'walk_end', 'arts']

function buildFilters(locations) {
  const types = locations
    .map(item => item.type)
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
  return ['全部'].concat(types)
}

function getPinNumber(value) {
  const number = Number(value)
  return isFinite(number) ? number : null
}

function clampPinPercent(value) {
  return Math.max(4, Math.min(96, value))
}

function pinsAreClose(first, second) {
  return Math.abs(first.left - second.left) < PIN_COLLISION_X &&
    Math.abs(first.top - second.top) < PIN_COLLISION_Y
}

function applyPinPositionOverrides(locations) {
  return (locations || []).map(item => {
    const override = PIN_POSITION_OVERRIDES[item.icon]
    return override ? Object.assign({}, item, override) : item
  })
}

function hasRequiredMapButtons(locations) {
  const icons = (locations || []).map(item => item && item.icon)
  return REQUIRED_MAP_BUTTON_ICONS.every(icon => icons.indexOf(icon) >= 0)
}

function normalizeCampusNavTargets(navTargets) {
  const source = navTargets && typeof navTargets === 'object' ? navTargets : {}
  const fallbackTargets = data.campusMap.navTargets || {}
  const defaultTarget = fallbackTargets.default || null
  const canteenTarget = fallbackTargets.east_canteen || fallbackTargets.canteen || defaultTarget
  const artsTarget = fallbackTargets.arts || fallbackTargets.walk_start || defaultTarget
  const keys = Object.keys(Object.assign({}, fallbackTargets, source))

  return keys.reduce((result, key) => {
    if (CANTEEN_NAV_TARGET_KEYS.indexOf(key) >= 0) {
      result[key] = canteenTarget
    } else if (ARTS_NAV_TARGET_KEYS.indexOf(key) >= 0) {
      result[key] = artsTarget
    } else {
      result[key] = defaultTarget
    }
    return result
  }, {})
}

function separatePinLocations(locations) {
  const placedPins = []
  return (locations || []).map(item => {
    const originalLeft = getPinNumber(item.left)
    const originalTop = getPinNumber(item.top)
    if (originalLeft === null || originalTop === null) return item

    let left = originalLeft
    let top = originalTop
    let offsetIndex = 0

    while (placedPins.some(pin => pinsAreClose(pin, { left, top })) && offsetIndex < PIN_SEPARATION_OFFSETS.length) {
      const offset = PIN_SEPARATION_OFFSETS[offsetIndex]
      left = clampPinPercent(originalLeft + offset.left)
      top = clampPinPercent(originalTop + offset.top)
      offsetIndex += 1
    }

    placedPins.push({ left, top })
    if (left === originalLeft && top === originalTop) return item
    return Object.assign({}, item, { left, top })
  })
}

function normalizeMapConfig(value) {
  const source = value && typeof value === 'object' ? value : {}
  const defaultLocations = (data.campusMap.locations || []).reduce((result, item) => {
    result[item.id] = item
    return result
  }, {})
  const locations = Array.isArray(source.locations) && source.locations.length
    ? source.locations.map(item => {
      const safeItem = item && typeof item === 'object' ? item : {}
      if (!safeItem.id) return null
      return Object.assign({}, defaultLocations[safeItem.id] || {}, safeItem)
    }).filter(Boolean)
    : data.campusMap.locations
  const positionedLocations = applyPinPositionOverrides(
    hasRequiredMapButtons(locations) ? locations : data.campusMap.locations
  )

  return {
    mapImage: source.mapImage || data.campusMap.mapImage || '/assets/brand/campus-map-south.png',
    locations: separatePinLocations(positionedLocations),
    navTargets: normalizeCampusNavTargets(source.navTargets)
  }
}

Page({
  data: {
    mapImage: data.campusMap.mapImage || '/assets/brand/campus-map-south.png',
    locations: [],
    selected: '全部',
    filters: ['全部'],
    visibleLocations: []
  },

  onShow() {
    this.loadMapConfig()
  },

  loadMapConfig() {
    store.getConfigAsync('campusMap').then(result => {
      const value = normalizeMapConfig(result.value)
      const locations = value.locations
      this.navTargets = value.navTargets
      const filters = buildFilters(locations)
      const selected = filters.indexOf(this.data.selected) >= 0 ? this.data.selected : filters[0]
      const visibleLocations = selected === '全部'
        ? locations
        : locations.filter(item => item.type === selected)
      this.setData({ mapImage: value.mapImage, locations, filters, selected, visibleLocations })
    }).catch(() => {
      const value = normalizeMapConfig(data.campusMap)
      const locations = value.locations
      this.navTargets = value.navTargets
      const filters = buildFilters(locations)
      this.setData({
        mapImage: value.mapImage,
        locations,
        selected: filters[0],
        filters,
        visibleLocations: locations
      })
    })
  },

  goBack() {
    wx.navigateBack()
  },

  selectFilter(event) {
    const selected = event.currentTarget.dataset.type
    const locations = this.data.locations || []
    const visibleLocations = selected === '全部'
      ? locations
      : locations.filter(item => item.type === selected)
    this.setData({ selected, visibleLocations })
  },

  findLocation(id) {
    return (this.data.locations || []).find(location => String(location.id) === String(id))
  },

  getNavigationTarget(item) {
    const navTargets = this.navTargets || {}
    return navTargets[item.navTarget] || navTargets.default || item.navigation || null
  },

  showLocation(event) {
    const item = this.findLocation(event.currentTarget.dataset.id)
    if (!item) return
    const target = this.getNavigationTarget(item)
    wx.showModal({
      title: item.name,
      content: `${item.note || ''}${target && target.name ? `\n导航终点：${target.name}` : ''}`,
      confirmText: '导航前往',
      cancelText: '关闭',
      success: result => {
        if (result.confirm) this.openLocation(item)
      }
    })
  },

  navigateLocation(event) {
    const item = this.findLocation(event.currentTarget.dataset.id)
    if (item) this.openLocation(item)
  },

  openLocation(item) {
    const target = this.getNavigationTarget(item)
    if (!target || !target.latitude || !target.longitude) {
      wx.showToast({ title: '导航点未配置', icon: 'none' })
      return
    }
    wx.openLocation({
      latitude: target.latitude,
      longitude: target.longitude,
      name: target.name || '',
      address: target.address || '',
      scale: 18,
      fail: () => {
        wx.showToast({ title: '暂时无法打开导航', icon: 'none' })
      }
    })
  }
})
