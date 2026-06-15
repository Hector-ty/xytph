Component({
  data: {
    showBack: false,
    title: '',
    lightTitle: false,
    isStepChallenge: false,
    stepCampusLabel: '正在定位当前位置',
    titles: {
      '/pages/weather/index': '天气与出行',
      '/pages/step-challenge/index': '步数挑战',
      '/pages/tasks/index': '低碳任务',
      '/pages/rewards/index': '碳惠商城',
      '/pages/rankings/index': '减碳排行榜',
      '/pages/me/index': '我的低碳档案',
      '/pages/task-detail/index': '任务详情',
      '/pages/profile/index': '身份资料',
      '/pages/achievements/index': '我的成就',
      '/pages/news/index': '资讯中心',
      '/pages/rules/index': '积分规则',
      '/pages/quiz/index': '低碳课堂',
      '/pages/campus-map/index': '校园地图',
      '/pages/cards/index': '校园打卡',
      '/pages/certificate/index': '活动证书',
      '/pages/staff/index': '工作人员工作台'
    },
    lightTitlePages: [
      '/pages/achievements/index',
      '/pages/cards/index',
      '/pages/quiz/index',
      '/pages/rankings/index',
      '/pages/rules/index',
      '/pages/staff/index'
    ]
  },

  pageLifetimes: {
    show() {
      this.updateVisible()
    }
  },

  lifetimes: {
    attached() {
      this.updateVisible()
    }
  },

  methods: {
    updateVisible() {
      const pages = getCurrentPages()
      const current = pages.length ? `/${pages[pages.length - 1].route}` : ''
      this.setData({
        showBack: current !== '/pages/home/index',
        title: this.data.titles[current] || '返回',
        lightTitle: this.data.lightTitlePages.includes(current),
        isStepChallenge: current === '/pages/step-challenge/index'
      })
    },

    setStepCampus(campus, statusText) {
      if (!campus) return
      this.setData({
        stepCampusLabel: statusText || campus.label || this.data.stepCampusLabel
      })
    },

    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        wx.navigateBack({ delta: 1 })
        return
      }

      const current = pages.length ? `/${pages[0].route}` : ''
      if (current !== '/pages/home/index') {
        wx.reLaunch({ url: '/pages/home/index' })
      }
    }
  }
})
