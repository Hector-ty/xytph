const cloudApi = require('./cloud-api')

const WEATHER_CACHE_KEY = 'carbonCampusWeatherCacheV1'
const WEATHER_CACHE_TTL = 10 * 60 * 1000
const WEATHER_CACHE_VERSION = 2

const WEATHER_LOCATIONS = {
  yuquan: {
    id: 'yuquan',
    name: '玉泉区',
    region: '呼和浩特市',
    label: '呼和浩特市 · 玉泉区',
    latitude: 40.7599,
    longitude: 111.6764,
    timezone: 'Asia/Shanghai'
  },
  saihan: {
    id: 'saihan',
    name: '赛罕区',
    region: '呼和浩特市',
    label: '呼和浩特市 · 赛罕区',
    latitude: 40.8183,
    longitude: 111.6971,
    timezone: 'Asia/Shanghai'
  }
}

const DEFAULT_WEATHER_LOCATION = WEATHER_LOCATIONS.saihan

const CAMPUS_WEATHER_RULES = [
  {
    id: 'south',
    label: '南校区',
    weatherLocationId: 'yuquan',
    latitude: 40.7599,
    longitude: 111.6764,
    bounds: {
      minLatitude: 40.752,
      maxLatitude: 40.764,
      minLongitude: 111.671,
      maxLongitude: 111.694
    }
  },
  {
    id: 'north',
    label: '北校区',
    weatherLocationId: 'saihan',
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
    label: '东校区',
    weatherLocationId: 'saihan',
    latitude: 40.8179,
    longitude: 111.7062,
    bounds: {
      minLatitude: 40.811,
      maxLatitude: 40.823,
      minLongitude: 111.701,
      maxLongitude: 111.716
    }
  }
]

const CAMPUS_NEARBY_DISTANCE_METERS = 2400
const EARTH_METERS_PER_DEGREE = 111320

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

const WEATHER_ICONS = {
  clear: '/assets/weather/clear.png',
  'partly-cloudy': '/assets/weather/partly-cloudy.png',
  cloud: '/assets/weather/cloud.png',
  rain: '/assets/weather/rain.png',
  snow: '/assets/weather/snow.png',
  fog: '/assets/weather/fog.png',
  storm: '/assets/weather/storm.png',
  bike: '/assets/weather/bike.png',
  bus: '/assets/weather/bus.png',
  umbrella: '/assets/weather/umbrella.png',
  seedling: '/assets/weather/seedling.png',
  droplet: '/assets/weather/droplet.png',
  thermometer: '/assets/weather/thermometer.png',
  wind: '/assets/weather/wind.png'
}

function round(value, digits) {
  const factor = Math.pow(10, digits || 0)
  return Math.round(Number(value || 0) * factor) / factor
}

function normalizePoint(point) {
  const latitude = Number(point && point.latitude)
  const longitude = Number(point && point.longitude)
  if (!isFinite(latitude) || !isFinite(longitude)) return null
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null
  return { latitude, longitude }
}

function distanceMeters(from, to) {
  const source = normalizePoint(from)
  const target = normalizePoint(to)
  if (!source || !target) return Number.MAX_SAFE_INTEGER

  const midLatitude = ((source.latitude + target.latitude) / 2) * Math.PI / 180
  const latitudeMeters = (target.latitude - source.latitude) * EARTH_METERS_PER_DEGREE
  const longitudeMeters = (target.longitude - source.longitude) * EARTH_METERS_PER_DEGREE * Math.cos(midLatitude)
  return Math.sqrt(latitudeMeters * latitudeMeters + longitudeMeters * longitudeMeters)
}

function isInsideBounds(point, bounds) {
  const location = normalizePoint(point)
  if (!location || !bounds) return false
  return location.latitude >= bounds.minLatitude
    && location.latitude <= bounds.maxLatitude
    && location.longitude >= bounds.minLongitude
    && location.longitude <= bounds.maxLongitude
}

function decorateWeatherLocation(location, campusRule, source) {
  const weatherLocation = Object.assign({}, clone(location), {
    source: source || 'default'
  })
  if (campusRule) {
    weatherLocation.campusId = campusRule.id
    weatherLocation.campusLabel = campusRule.label
  }
  return weatherLocation
}

function pickWeatherLocationByCampus(point) {
  const location = normalizePoint(point)
  if (!location) return decorateWeatherLocation(DEFAULT_WEATHER_LOCATION, null, 'default')

  const matchedRule = CAMPUS_WEATHER_RULES.find(rule => isInsideBounds(location, rule.bounds))
  if (matchedRule) {
    return decorateWeatherLocation(WEATHER_LOCATIONS[matchedRule.weatherLocationId], matchedRule, 'campus')
  }

  const nearestRule = CAMPUS_WEATHER_RULES
    .map(rule => Object.assign({}, rule, { distance: distanceMeters(location, rule) }))
    .sort((a, b) => a.distance - b.distance)[0]

  if (nearestRule && nearestRule.distance <= CAMPUS_NEARBY_DISTANCE_METERS) {
    return decorateWeatherLocation(WEATHER_LOCATIONS[nearestRule.weatherLocationId], nearestRule, 'nearby')
  }

  return decorateWeatherLocation(DEFAULT_WEATHER_LOCATION, null, 'default')
}

function normalizeWeatherLocation(input) {
  const source = input || {}
  const sourceId = String(source.id || '').trim()
  const preset = WEATHER_LOCATIONS[sourceId] || DEFAULT_WEATHER_LOCATION
  const location = Object.assign({}, clone(preset))
  const point = normalizePoint(source)

  if (point) {
    location.latitude = point.latitude
    location.longitude = point.longitude
  }
  ;['id', 'name', 'region', 'label', 'timezone', 'campusId', 'campusLabel', 'source'].forEach(key => {
    if (typeof source[key] === 'string' && source[key].trim()) {
      location[key] = source[key].trim()
    }
  })

  return location
}

function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (typeof wx === 'undefined' || typeof wx.getLocation !== 'function') {
      reject(new Error('定位能力不可用'))
      return
    }

    wx.getLocation({
      type: 'wgs84',
      success: resolve,
      fail: reject
    })
  })
}

function resolveWeatherLocation(options) {
  const opts = Object.assign({}, options || {})
  if (opts.location) {
    return Promise.resolve(normalizeWeatherLocation(opts.location))
  }
  if (opts.autoLocation === false) {
    return Promise.resolve(decorateWeatherLocation(DEFAULT_WEATHER_LOCATION, null, 'default'))
  }

  return getCurrentLocation()
    .then(location => pickWeatherLocationByCampus(location))
    .catch(() => decorateWeatherLocation(DEFAULT_WEATHER_LOCATION, null, 'fallback'))
}

function toCompass(direction) {
  const degree = Number(direction || 0)
  const labels = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
  return labels[Math.round(degree / 45) % 8]
}

function getWeatherMeta(code, isDay) {
  const weatherCode = Number(code)
  const dayTime = Number(isDay) === 1

  if (weatherCode === 0) {
    return {
      label: dayTime ? '晴朗' : '晴夜',
      description: dayTime ? '天空通透，适合绿色出行' : '夜间晴朗，体感通常更凉',
      icon: WEATHER_ICONS.clear,
      accent: '#F5C84A'
    }
  }
  if ([1, 2].includes(weatherCode)) {
    return {
      label: '间晴多云',
      description: '云量适中，适合安排步行和公共交通结合的路线',
      icon: WEATHER_ICONS['partly-cloudy'],
      accent: '#6AB6C9'
    }
  }
  if (weatherCode === 3) {
    return {
      label: '多云',
      description: '云量较多，户外任务节奏可以更灵活',
      icon: WEATHER_ICONS.cloud,
      accent: '#7CA6B6'
    }
  }
  if ([45, 48].includes(weatherCode)) {
    return {
      label: '雾',
      description: '能见度一般，骑行和长距离步行要更谨慎',
      icon: WEATHER_ICONS.fog,
      accent: '#93A6AF'
    }
  }
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
    return {
      label: '降雨',
      description: '建议随身带伞，优先选择校车或公交等共享出行方式',
      icon: WEATHER_ICONS.rain,
      accent: '#4E8EC9'
    }
  }
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
    return {
      label: '降雪',
      description: '地面湿滑，减少骑行速度，优先选择安全路线',
      icon: WEATHER_ICONS.snow,
      accent: '#7CB9D9'
    }
  }
  if ([95, 96, 99].includes(weatherCode)) {
    return {
      label: '雷暴',
      description: '不建议长时间户外停留，先完成室内任务更合适',
      icon: WEATHER_ICONS.storm,
      accent: '#6D7EBB'
    }
  }
  return {
    label: '天气变化中',
    description: '建议出门前再查看实时情况',
    icon: WEATHER_ICONS.cloud,
    accent: '#7CA6B6'
  }
}

function getAqiMeta(aqi) {
  const value = Number(aqi || 0)
  if (value <= 50) {
    return {
      label: '优',
      color: '#33A852',
      summary: '空气清爽，适合步行、骑行和室外签到。',
      shortNote: '适合绿行'
    }
  }
  if (value <= 100) {
    return {
      label: '良',
      color: '#E5B93C',
      summary: '空气质量整体可接受，普通户外任务可以正常安排。',
      shortNote: '可正常出行'
    }
  }
  if (value <= 150) {
    return {
      label: '轻度污染',
      color: '#F08A37',
      summary: '敏感人群建议减少高强度户外活动。',
      shortNote: '敏感人群谨慎'
    }
  }
  if (value <= 200) {
    return {
      label: '中度污染',
      color: '#E4564F',
      summary: '不适合长时间户外停留，优先完成室内低碳课堂和线上任务。',
      shortNote: '减少户外时长'
    }
  }
  if (value <= 300) {
    return {
      label: '重度污染',
      color: '#9C4FB5',
      summary: '建议明显减少室外活动，把出行压缩为必要通勤。',
      shortNote: '尽量室内活动'
    }
  }
  return {
    label: '严重污染',
    color: '#7A4A3A',
    summary: '应尽量避免不必要外出，低碳行动以室内学习和节能为主。',
    shortNote: '避免非必要外出'
  }
}

function pickHourlySlots(hourly, currentTime) {
  const times = hourly.time || []
  const temperatures = hourly.temperature_2m || []
  const codes = hourly.weather_code || []
  const precipProbabilities = hourly.precipitation_probability || []
  const currentToken = String(currentTime || '').slice(0, 13)
  let startIndex = times.findIndex(item => String(item).slice(0, 13) >= currentToken)
  if (startIndex < 0) startIndex = 0

  return times.slice(startIndex, startIndex + 6).map((time, index) => {
    const sourceIndex = startIndex + index
    const meta = getWeatherMeta(codes[sourceIndex], 1)
    return {
      time: String(time).slice(11, 16),
      temperature: Math.round(Number(temperatures[sourceIndex] || 0)),
      precipitationProbability: Math.round(Number(precipProbabilities[sourceIndex] || 0)),
      label: meta.label,
      icon: meta.icon
    }
  })
}

function buildTravelTips(current, airMeta) {
  const temperature = Number(current.temperature_2m || 0)
  const precipitation = Number(current.precipitation || 0)
  const windSpeed = Number(current.wind_speed_10m || 0)
  const aqiValue = Number(current.us_aqi || 0)
  const tips = []

  if (aqiValue <= 80 && precipitation < 0.1 && temperature >= 8 && temperature <= 28 && windSpeed < 20) {
    tips.push({
      title: '适合步行或骑行',
      description: '今天适合把短途出行换成步行或骑行，顺手完成绿行任务。',
      icon: WEATHER_ICONS.bike
    })
  } else {
    tips.push({
      title: '优先公共交通',
      description: '天气或空气条件一般时，校车、公交和多人共享出行更稳妥。',
      icon: precipitation >= 0.1 ? WEATHER_ICONS.umbrella : WEATHER_ICONS.bus
    })
  }

  tips.push({
    title: aqiValue <= 100 ? '空气条件不错' : '任务重心转到室内',
    description: aqiValue <= 100 ? airMeta.summary : '空气质量一般或偏差时，可以先完成低碳课堂、资讯阅读和室内节能行为。',
    icon: aqiValue <= 100 ? WEATHER_ICONS.seedling : WEATHER_ICONS.cloud
  })

  if (temperature >= 30 || temperature <= 5) {
    tips.push({
      title: '注意温度带来的能耗',
      description: '离开教室和宿舍时随手关灯断电，合理使用空调和取暖设备。',
      icon: WEATHER_ICONS.thermometer
    })
  } else {
    tips.push({
      title: '适合积累低碳积分',
      description: '天气较平稳时，更容易把绿色出行、打卡和签到串起来完成。',
      icon: WEATHER_ICONS.seedling
    })
  }

  return tips
}

function buildCarbonLinks(current, weatherMeta, airMeta) {
  const precipitation = Number(current.precipitation || 0)
  const temperature = Number(current.temperature_2m || 0)
  const windSpeed = Number(current.wind_speed_10m || 0)
  const aqiValue = Number(current.us_aqi || 0)

  return [
    {
      title: '天气决定低碳出行窗口',
      description: precipitation < 0.1 && aqiValue <= 80
        ? '今天更适合把短途通勤换成步行或骑行。'
        : '天气一般时，公共交通和共享出行比单人机动出行更省碳。',
      icon: precipitation < 0.1 ? WEATHER_ICONS.bike : WEATHER_ICONS.bus
    },
    {
      title: '空气质量影响任务节奏',
      description: aqiValue <= 100 ? airMeta.summary : '空气偏差时，把任务重心转向室内活动同样属于低碳行动。',
      icon: aqiValue <= 100 ? WEATHER_ICONS.seedling : WEATHER_ICONS.cloud
    },
    {
      title: '温度和风雨影响校园能耗',
      description: temperature >= 30 || temperature <= 5 || windSpeed >= 20
        ? '极端温度和大风雨天气会抬高空调、取暖和通勤能耗。'
        : `${weatherMeta.label}天气下能耗压力相对平稳，适合保持日常绿色习惯。`,
      icon: temperature >= 30 || temperature <= 5 ? WEATHER_ICONS.thermometer : WEATHER_ICONS.wind
    }
  ]
}

function buildLocationLabel(location, timezone) {
  const districtLabel = location.label
    || [location.region, location.name].filter(Boolean).join(' · ')
    || DEFAULT_WEATHER_LOCATION.name
  const label = location.campusLabel
    ? `${location.campusLabel} · ${districtLabel}`
    : districtLabel
  return `${label} · ${round(location.latitude, 2)}°N / ${round(location.longitude, 2)}°E · ${timezone || location.timezone || '本地时区'}`
}

function buildBundle(location, weatherResponse, airResponse) {
  const currentWeather = weatherResponse.current || {}
  const currentAir = airResponse.current || {}
  const weatherMeta = getWeatherMeta(currentWeather.weather_code, currentWeather.is_day)
  const aqiMeta = getAqiMeta(currentAir.us_aqi)
  const current = Object.assign({}, currentWeather, currentAir)
  const hourly = pickHourlySlots(weatherResponse.hourly || {}, currentWeather.time)

  return {
    fetchedAt: Date.now(),
    location: {
      latitude: round(location.latitude, 4),
      longitude: round(location.longitude, 4),
      name: location.name || DEFAULT_WEATHER_LOCATION.name,
      region: location.region || DEFAULT_WEATHER_LOCATION.region,
      campusId: location.campusId || '',
      campusLabel: location.campusLabel || '',
      source: location.source || '',
      label: buildLocationLabel(location, weatherResponse.timezone_abbreviation || weatherResponse.timezone)
    },
    summary: {
      aqi: Math.round(Number(currentAir.us_aqi || 0)),
      aqiLabel: aqiMeta.label,
      aqiBadge: aqiMeta.label.length > 2 ? aqiMeta.label.slice(0, 2) : aqiMeta.label,
      shortNote: aqiMeta.shortNote,
      condition: weatherMeta.label,
      conditionNote: `${weatherMeta.label} · ${Math.round(Number(currentWeather.temperature_2m || 0))}°C`,
      icon: weatherMeta.icon,
      color: aqiMeta.color
    },
    current: {
      time: currentWeather.time || '',
      temperature: Math.round(Number(currentWeather.temperature_2m || 0)),
      apparentTemperature: Math.round(Number(currentWeather.apparent_temperature || 0)),
      humidity: Math.round(Number(currentWeather.relative_humidity_2m || 0)),
      precipitation: round(currentWeather.precipitation || 0, 1),
      windSpeed: Math.round(Number(currentWeather.wind_speed_10m || 0)),
      windDirection: toCompass(currentWeather.wind_direction_10m),
      cloudCover: Math.round(Number(currentWeather.cloud_cover || 0)),
      weatherLabel: weatherMeta.label,
      weatherDescription: weatherMeta.description,
      icon: weatherMeta.icon,
      accent: weatherMeta.accent
    },
    air: {
      aqi: Math.round(Number(currentAir.us_aqi || 0)),
      level: aqiMeta.label,
      color: aqiMeta.color,
      summary: aqiMeta.summary,
      pm25: round(currentAir.pm2_5 || 0, 1),
      pm10: round(currentAir.pm10 || 0, 1),
      ozone: round(currentAir.ozone || 0, 1),
      carbonMonoxide: round(currentAir.carbon_monoxide || 0, 1),
      nitrogenDioxide: round(currentAir.nitrogen_dioxide || 0, 1)
    },
    hourly,
    travelTips: buildTravelTips(current, aqiMeta),
    carbonLinks: buildCarbonLinks(current, weatherMeta, aqiMeta)
  }
}

function getWeatherCacheId(location) {
  const source = location || DEFAULT_WEATHER_LOCATION
  const locationId = source.id || `${round(source.latitude, 2)},${round(source.longitude, 2)}`
  return [locationId, source.campusId || 'default'].join(':')
}

function getCachedBundle(location) {
  const cached = wx.getStorageSync(WEATHER_CACHE_KEY)
  const cacheId = getWeatherCacheId(location)
  const cacheItem = cached && cached.version === WEATHER_CACHE_VERSION && cached.items
    ? cached.items[cacheId]
    : null
  if (!cacheItem || !cacheItem.data || !cacheItem.timestamp) return null
  if (Date.now() - cacheItem.timestamp > WEATHER_CACHE_TTL) return null
  return cacheItem.data
}

function saveCachedBundle(bundle, location) {
  const cached = wx.getStorageSync(WEATHER_CACHE_KEY)
  const nextCache = cached && cached.version === WEATHER_CACHE_VERSION && cached.items
    ? cached
    : { version: WEATHER_CACHE_VERSION, items: {} }
  nextCache.items[getWeatherCacheId(location)] = {
    timestamp: Date.now(),
    data: bundle
  }
  wx.setStorageSync(WEATHER_CACHE_KEY, nextCache)
}

function loadWeatherFromCloud(location) {
  return cloudApi.call('getWeather', { location }).then(result => {
    if (!result.weather || !result.air) {
      throw new Error('天气云函数返回异常')
    }
    const responseLocation = Object.assign({}, location, result.location || {})
    return buildBundle(responseLocation, result.weather || {}, result.air || {})
  })
}

function loadWeatherBundle(options) {
  const opts = Object.assign({ force: false }, options || {})
  return resolveWeatherLocation(opts).then(location => {
    const cached = !opts.force ? getCachedBundle(location) : null
    if (cached) {
      return Object.assign({ cached: true }, cached)
    }

    return loadWeatherFromCloud(location).then(bundle => {
      saveCachedBundle(bundle, location)
      return bundle
    })
  })
    .catch(error => {
      const nextError = new Error('天气数据暂时获取失败')
      nextError.code = 'WEATHER_REQUEST_FAILED'
      nextError.raw = error
      throw nextError
    })
}

module.exports = {
  DEFAULT_WEATHER_LOCATION,
  WEATHER_LOCATIONS,
  WEATHER_ICONS,
  pickWeatherLocationByCampus,
  resolveWeatherLocation,
  getWeatherMeta,
  getAqiMeta,
  loadWeatherBundle
}
