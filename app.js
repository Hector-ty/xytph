const store = require('./utils/store')

App({
  onLaunch() {
    store.initCloud()
    store.ensureState()   
    store.syncCatalog().catch(() => {})
    store.syncState().catch(() => {})
  },
  globalData: {
    appName: '校园碳普惠'
  }
})
