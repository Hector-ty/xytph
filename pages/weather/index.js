const weatherService = require('../../utils/weather')

function buildWeatherView(bundle) {
  return Object.assign({}, bundle, {
    heroBadges: [
      {
        title: '体感',
        value: `${bundle.current.apparentTemperature}°C`,
        icon: weatherService.WEATHER_ICONS.thermometer
      },
      {
        title: '湿度',
        value: `${bundle.current.humidity}%`,
        icon: weatherService.WEATHER_ICONS.droplet
      },
      {
        title: '风速',
        value: `${bundle.current.windDirection}风 ${bundle.current.windSpeed} km/h`,
        icon: weatherService.WEATHER_ICONS.wind
      }
    ],
    airMetrics: [
      { title: 'PM2.5', value: `${bundle.air.pm25}`, unit: 'ug/m3' },
      { title: 'PM10', value: `${bundle.air.pm10}`, unit: 'ug/m3' },
      { title: '臭氧 O3', value: `${bundle.air.ozone}`, unit: 'ug/m3' },
      { title: '一氧化碳', value: `${bundle.air.carbonMonoxide}`, unit: 'ug/m3' },
      { title: '二氧化氮', value: `${bundle.air.nitrogenDioxide}`, unit: 'ug/m3' }
    ]
  })
}

Page({
  data: {
    loading: true,
    refreshing: false,
    weather: null,
    errorMessage: '',
    weatherIcons: weatherService.WEATHER_ICONS
  },

  onShow() {
    this.loadWeather(false)
  },

  loadWeather(force) {
    const hasWeather = Boolean(this.data.weather)

    this.setData({
      loading: !hasWeather,
      refreshing: Boolean(force && hasWeather),
      errorMessage: ''
    })

    return weatherService.loadWeatherBundle({ force }).then(bundle => {
      this.setData({
        loading: false,
        refreshing: false,
        weather: buildWeatherView(bundle),
        errorMessage: bundle.errorMessage || ''
      })
    }).catch(error => {
      this.setData({
        loading: false,
        refreshing: false,
        errorMessage: error && error.message ? error.message : '天气数据暂时获取失败'
      })
    })
  },

  handleRefresh() {
    this.loadWeather(true)
  },

  handleErrorAction() {
    this.handleRefresh()
  }
})
