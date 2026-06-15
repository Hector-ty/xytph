const defaultCatalog = {
  zones: [
    {
      code: 'GREEN_TRAVEL',
      name: '绿行专区',
      short: '绿行',
      icon: '行',
      color: '#2C9365',
      pale: '#E0F4E8',
      slogan: '步行、骑行、公交，让出行更轻',
      capNote: '单日上限 15 分',
      wordArt: '/assets/brand/home-word-art/green-travel.png'
    },
    {
      code: 'FOOD_PLASTIC',
      name: '减塑专区',
      short: '减塑',
      icon: '杯',
      color: '#2E8EA8',
      pale: '#E0F1F6',
      slogan: '少用一次性用品，从一杯一袋开始',
      capNote: '单日上限 12 分',
      wordArt: '/assets/brand/home-word-art/plastic-reduce.png'
    },
    {
      code: 'CLEAN_PLATE',
      name: '光盘专区',
      short: '光盘',
      icon: '盘',
      color: '#D99A22',
      pale: '#FFF0C7',
      slogan: '按需取餐，珍惜每一份粮食',
      capNote: '单日最多 2 餐',
      wordArt: '/assets/brand/home-word-art/clean-plate.png'
    },
    {
      code: 'RECYCLE',
      name: '循环集市',
      short: '循环',
      icon: '循',
      color: '#E06E50',
      pale: '#FDE7DD',
      slogan: '旧物再流转，资源再利用',
      capNote: '工作人员登记',
      wordArt: '/assets/brand/home-word-art/recycle-market.png'
    },
    {
      code: 'DORM',
      name: '低碳宿舍',
      short: '宿舍',
      icon: '舍',
      color: '#6C77C8',
      pale: '#E9ECFF',
      slogan: '随手关灯、节水节电，宿舍也低碳',
      capNote: '单日上限 15 分',
      wordArt: '/assets/brand/home-word-art/low-carbon-dorm.png'
    }
  ],

  tasks: [
    {
      id: 'green_steps',
      zone: 'GREEN_TRAVEL',
      name: '绿行步数挑战',
      subtitle: '同步今日微信步数，达到目标后领取积分',
      icon: '步',
      type: 'STEP',
      typeLabel: '步数挑战',
      points: 8,
      pointsLabel: '+3/+5/+8',
      progress: 0,
      instructions: ['进入步数挑战页授权微信运动', '在校园内完成步行路线或同步今日步数', '达到 3000/5000/8000 步后领取对应积分'],
      rule: '3000 步得 3 分，5000 步得 5 分，8000 步得 8 分；绿行专区每日总上限 15 分。'
    },
    {
      id: 'green_bus',
      zone: 'GREEN_TRAVEL',
      name: '公交/校车低碳出行',
      subtitle: '到达活动点位后扫码完成一次绿色出行记录',
      icon: '车',
      type: 'QR',
      typeLabel: '扫码完成',
      points: 5,
      progress: 0,
      instructions: ['选择公交、校车或共享出行前往校园', '到达低碳出行服务点', '扫描点位二维码完成记录'],
      rule: '每完成一次有效扫码得 5 分，绿行专区每日总上限 15 分。'
    },
    {
      id: 'green_walk',
      zone: 'GREEN_TRAVEL',
      name: '校园健步走',
      subtitle: '参与校园绿色健步路线打卡',
      icon: '走',
      type: 'QR',
      typeLabel: '路线打卡',
      points: 8,
      progress: 0,
      instructions: ['从指定起点开始健步路线', '沿路线到达终点服务点', '扫描终点二维码完成打卡'],
      rule: '完成一次校园健步走路线得 8 分，计入绿行专区。'
    },
    {
      id: 'plastic_cup',
      zone: 'FOOD_PLASTIC',
      name: '自带水杯打卡',
      subtitle: '使用自己的水杯，减少一次性纸杯和塑料瓶',
      icon: '杯',
      type: 'PHOTO',
      typeLabel: '上传照片',
      points: 3,
      progress: 0,
      instructions: ['使用自带水杯接水或购买饮品', '拍摄水杯与活动标识同框照片', '提交后积分到账并等待复审'],
      rule: '提交后得 3 分；照片需清晰展示自带水杯，复审未通过将扣回积分。'
    },
    {
      id: 'plastic_cutlery',
      zone: 'FOOD_PLASTIC',
      name: '拒绝一次性餐具',
      subtitle: '堂食或自备餐具，减少一次性筷勺使用',
      icon: '筷',
      type: 'DIRECT',
      typeLabel: '立即完成',
      points: 3,
      progress: 0,
      instructions: ['就餐时选择堂食餐具或自备餐具', '确认不领取一次性餐具', '点击完成记录本次行动'],
      rule: '每次有效记录得 3 分，减塑专区每日总上限 12 分。'
    },
    {
      id: 'plastic_bag',
      zone: 'FOOD_PLASTIC',
      name: '环保袋随身带',
      subtitle: '购物时使用可重复利用的环保袋',
      icon: '袋',
      type: 'PHOTO',
      typeLabel: '上传照片',
      points: 2,
      progress: 0,
      instructions: ['在校园商店或活动点购物时自带环保袋', '拍摄环保袋使用照片', '提交后积分到账并等待复审'],
      rule: '提交后得 2 分；同一照片不可重复提交，复审未通过将扣回积分。'
    },
    {
      id: 'plastic_meal',
      zone: 'FOOD_PLASTIC',
      name: '低碳餐选择',
      subtitle: '优先选择少包装、适量、均衡的低碳餐',
      icon: '餐',
      type: 'DIRECT',
      typeLabel: '立即完成',
      points: 5,
      progress: 0,
      instructions: ['在食堂选择少包装、适量的餐食', '尽量减少剩餐与一次性用品', '点击完成记录行动'],
      rule: '完成一次低碳餐行动得 5 分，计入减塑专区。'
    },
    {
      id: 'plate_breakfast',
      zone: 'CLEAN_PLATE',
      name: '早餐光盘',
      subtitle: '早餐后拍摄餐盘，践行光盘行动',
      icon: '早',
      type: 'PHOTO',
      typeLabel: '上传照片',
      points: 10,
      progress: 0,
      instructions: ['按需取餐并完成早餐', '拍摄餐后餐盘或餐盒', '提交后积分到账并等待复审'],
      rule: '提交后得 10 分；光盘任务每日按规则封顶，复审未通过将扣回积分。'
    },
    {
      id: 'plate_lunch',
      zone: 'CLEAN_PLATE',
      name: '午餐光盘',
      subtitle: '午餐后上传餐盘照片，减少食物浪费',
      icon: '午',
      type: 'PHOTO',
      typeLabel: '上传照片',
      points: 10,
      progress: 0,
      instructions: ['按需取餐并完成午餐', '拍摄清晰餐后照片', '提交后积分到账并等待复审'],
      rule: '提交后得 10 分；照片需能判断无明显剩饭剩菜，复审未通过将扣回积分。'
    },
    {
      id: 'plate_dinner',
      zone: 'CLEAN_PLATE',
      name: '晚餐光盘',
      subtitle: '晚餐也不浪费，完成光盘打卡',
      icon: '晚',
      type: 'PHOTO',
      typeLabel: '上传照片',
      points: 10,
      progress: 0,
      instructions: ['按需取餐并完成晚餐', '拍摄餐盘或餐盒照片', '提交后积分到账并等待复审'],
      rule: '提交后得 10 分；光盘专区每日积分按规则封顶，复审未通过将扣回积分。'
    },
    {
      id: 'recycle_books',
      zone: 'RECYCLE',
      name: '旧书流转登记',
      subtitle: '带旧书到循环集市，由工作人员登记',
      icon: '书',
      type: 'STAFF_ENTRY',
      typeLabel: '现场登记',
      points: 10,
      progress: 0,
      instructions: ['整理可继续使用的旧书', '带到循环集市服务点', '向工作人员出示个人码完成登记'],
      rule: '旧书按登记数量计分，系统按现场规则发放积分。'
    },
    {
      id: 'recycle_clothes',
      zone: 'RECYCLE',
      name: '旧衣回收登记',
      subtitle: '清洁旧衣交到循环集市回收点',
      icon: '衣',
      type: 'STAFF_ENTRY',
      typeLabel: '现场登记',
      points: 15,
      progress: 0,
      instructions: ['整理干净、可回收的旧衣物', '带到活动服务点称重或登记', '工作人员扫码确认积分'],
      rule: '旧衣按重量或件数登记，污染严重或不合格物品不计分。'
    },
    {
      id: 'recycle_boxes',
      zone: 'RECYCLE',
      name: '纸箱回收登记',
      subtitle: '回收快递纸箱，减少包装浪费',
      icon: '箱',
      type: 'STAFF_ENTRY',
      typeLabel: '现场登记',
      points: 8,
      progress: 0,
      instructions: ['将纸箱压平并保持干燥', '送至循环集市纸箱回收点', '由工作人员登记数量'],
      rule: '纸箱按数量折算积分，循环专区每日总上限 20 分。'
    },
    {
      id: 'dorm_promise',
      zone: 'DORM',
      name: '宿舍低碳承诺',
      subtitle: '承诺随手关灯、节水节电、减少浪费',
      icon: '诺',
      type: 'DIRECT',
      typeLabel: '立即承诺',
      points: 3,
      progress: 0,
      instructions: ['阅读低碳宿舍行动倡议', '确认今日可执行的小行动', '点击完成承诺'],
      rule: '每日完成一次宿舍低碳承诺得 3 分。'
    },
    {
      id: 'dorm_energy',
      zone: 'DORM',
      name: '离寝断电随手拍',
      subtitle: '离开宿舍前关闭闲置电器并上传照片',
      icon: '电',
      type: 'PHOTO',
      typeLabel: '上传照片',
      points: 5,
      progress: 0,
      instructions: ['离开宿舍前检查灯具和闲置电器', '拍摄安全、合规的宿舍节能照片', '提交后积分到账并等待复审'],
      rule: '提交后得 5 分；请勿拍摄他人隐私信息，复审未通过将扣回积分。'
    },
    {
      id: 'dorm_report',
      zone: 'DORM',
      name: '节水节电报修',
      subtitle: '发现长流水、长明灯或设备异常及时反馈',
      icon: '修',
      type: 'QR',
      typeLabel: '扫码反馈',
      points: 3,
      progress: 0,
      instructions: ['发现宿舍或公共区域能源浪费问题', '到服务点或二维码海报扫码登记', '提交线索后等待工作人员处理'],
      rule: '有效线索得 3 分，恶意或重复线索不计分。'
    }
  ],

  rewards: [
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
  ],

  personalRanking: [
    { rank: 1, name: '低碳先锋', college: '生态与环境学院', points: 168 },
    { rank: 2, name: '绿色达人', college: '经济管理学院', points: 152 },
    { rank: 3, name: '光盘行动者', college: '文学与新闻传播学院', points: 139 }
  ],

  collegeRanking: [
    { rank: 1, name: '生态与环境学院', points: 5860 },
    { rank: 2, name: '经济管理学院', points: 5420 },
    { rank: 3, name: '法学院', points: 4980 }
  ],

  news: [
    {
      id: 'news_low_carbon_day',
      title: '内蒙古大学校园低碳日活动开启',
      summary: '围绕绿行、减塑、光盘、循环集市和低碳宿舍五大专区，邀请同学们用小行动积累绿色积分。',
      date: '06-13',
      tag: '活动'
    },
    {
      id: 'news_recycle_market',
      title: '循环集市兑换点今日开放',
      summary: '旧书、旧衣、纸箱等可带到卓越楼服务点，由工作人员登记后获得积分。',
      date: '06-13',
      tag: '公告'
    },
    {
      id: 'news_clean_plate',
      title: '光盘行动照片提交说明',
      summary: '请拍摄清晰餐盘照片，避免出现他人隐私信息，审核通过后积分会自动到账。',
      date: '06-13',
      tag: '指南'
    }
  ],

  achievements: [
    { id: 'badge_new_leaf', name: '低碳新芽', note: '完成注册并开始第一次绿色行动', icon: '芽', color: '#2C9365', unlocked: true },
    { id: 'badge_green_travel', name: '绿行达人', note: '完成一次绿行步数挑战或出行打卡', icon: '行', color: '#2E8EA8', unlocked: false },
    { id: 'badge_clean_plate', name: '光盘达人', note: '完成两次光盘行动审核', icon: '盘', color: '#D99A22', unlocked: false },
    { id: 'badge_recycle', name: '循环伙伴', note: '完成一次循环集市登记', icon: '循', color: '#E06E50', unlocked: false },
    { id: 'badge_dorm', name: '节能寝室', note: '完成低碳宿舍承诺或节能随手拍', icon: '舍', color: '#6C77C8', unlocked: false },
    { id: 'badge_quiz', name: '低碳学霸', note: '完成低碳课堂答题挑战', icon: '知', color: '#2B91B9', unlocked: false }
  ],

  cards: [
    { id: 'library', name: '图书馆绿荫', note: '安静学习，也记得随手关灯。', icon: '图', color: '#2C9365' },
    { id: 'main-building', name: '卓越楼晨光', note: '从南校区卓越楼开始一次低碳行动。', icon: '楼', color: '#2E8EA8' },
    { id: 'canteen', name: '东院餐厅光盘', note: '每一次按需取餐都值得收藏。', icon: '餐', color: '#D99A22' },
    { id: 'recycle-market', name: '循环集市', note: '让旧物继续发光。', icon: '循', color: '#E06E50' },
    { id: 'dorm', name: '节能宿舍', note: '小小寝室，也能成为低碳样板。', icon: '舍', color: '#6C77C8' },
    { id: 'lake', name: '桃李湖畔', note: '把绿色校园装进口袋。', icon: '湖', color: '#477BC0' }
  ]
}

const SOUTH_EXCELLENCE_TARGET = {
  name: '内蒙古大学南校区卓越楼',
  address: '内蒙古大学南校区卓越楼',
  latitude: 40.7589,
  longitude: 111.6859
}

const SOUTH_EAST_CANTEEN_TARGET = {
  name: '内蒙古大学南校区东院餐厅',
  address: '幸运咖（内大南校区店）周围道路',
  latitude: 40.7594,
  longitude: 111.6912
}

const SOUTH_ARTS_TARGET = {
  name: '内蒙古大学艺术楼',
  address: '内蒙古大学南校区艺术楼',
  latitude: 40.7599,
  longitude: 111.6764
}

const CANTEEN_NAV_TARGET_KEYS = ['canteen', 'east_canteen', 'dining_hall', 'clean_plate']
const ARTS_NAV_TARGET_KEYS = ['walk_start', 'walk_end', 'arts']

function normalizeCampusNavTargets(navTargets) {
  const source = navTargets && typeof navTargets === 'object' ? navTargets : {}
  const keys = Object.keys(Object.assign({}, source, {
    default: true,
    excellence: true,
    main_building: true,
    north_service: true,
    canteen: true,
    east_canteen: true,
    dining_hall: true,
    clean_plate: true,
    check_in: true,
    walk_start: true,
    walk_end: true,
    arts: true,
    recycle_market: true,
    reward_exchange: true,
    library: true
  }))

  return keys.reduce((result, key) => {
    if (CANTEEN_NAV_TARGET_KEYS.indexOf(key) >= 0) {
      result[key] = clone(SOUTH_EAST_CANTEEN_TARGET)
    } else if (ARTS_NAV_TARGET_KEYS.indexOf(key) >= 0) {
      result[key] = clone(SOUTH_ARTS_TARGET)
    } else {
      result[key] = clone(SOUTH_EXCELLENCE_TARGET)
    }
    return result
  }, {})
}

const defaultConfigs = {
  colleges: [
    '民族学与社会学学院',
    '蒙古学学院',
    '文学与新闻传播学院',
    '历史与旅游文化学院',
    '哲学学院',
    '马克思主义学院',
    '经济管理学院',
    '公共管理学院',
    '法学院',
    '纪检监察学院（监察官培训学院）',
    '外国语学院',
    '数学科学学院',
    '物理科学与技术学院',
    '化学化工学院',
    '生命科学学院',
    '生态与环境学院',
    '电子信息工程学院',
    '计算机学院（软件学院）',
    '人工智能学院',
    '交通学院',
    '体育学院',
    '求真学院（创新创业学院）',
    '国际教育学院',
    '继续教育学院',
    '满洲里学院'
  ],

  campusMap: {
    mapImage: '/assets/brand/campus-map-south.png',
    navTargets: {
      default: SOUTH_EXCELLENCE_TARGET,
      excellence: SOUTH_EXCELLENCE_TARGET,
      main_building: SOUTH_EXCELLENCE_TARGET,
      north_service: SOUTH_EXCELLENCE_TARGET,
      canteen: SOUTH_EAST_CANTEEN_TARGET,
      east_canteen: SOUTH_EAST_CANTEEN_TARGET,
      dining_hall: SOUTH_EAST_CANTEEN_TARGET,
      clean_plate: SOUTH_EAST_CANTEEN_TARGET,
      check_in: SOUTH_EXCELLENCE_TARGET,
      walk_start: SOUTH_ARTS_TARGET,
      walk_end: SOUTH_ARTS_TARGET,
      arts: SOUTH_ARTS_TARGET,
      recycle_market: SOUTH_EXCELLENCE_TARGET,
      reward_exchange: SOUTH_EXCELLENCE_TARGET,
      library: SOUTH_EXCELLENCE_TARGET
    },
    locations: [
      { id: 'check-in', name: '主楼签到点', type: '签到', note: '活动主签到点，开放时间 08:00-18:00。', icon: '签', color: '#2C9365', left: 89, top: 89, hotLeft: 85.5, hotTop: 84, hotWidth: 7, hotHeight: 10, navTarget: 'check_in' },
      { id: 'clean-plate', name: '北区食堂光盘点', type: '任务', note: '早餐、午餐和晚餐光盘任务提交点。', icon: '盘', color: '#D99A22', left: 42, top: 15, hotLeft: 38.5, hotTop: 10, hotWidth: 7, hotHeight: 10, navTarget: 'clean_plate' },
      { id: 'recycle-market', name: '循环集市', type: '集市', note: '旧书、旧衣和纸箱现场登记点。', icon: '循', color: '#E06E50', left: 51, top: 36, hotLeft: 47.5, hotTop: 31, hotWidth: 7, hotHeight: 10, navTarget: 'recycle_market' },
      { id: 'walk-start', name: '健步走起点', type: '绿行', note: '校园健步走起点二维码。', icon: '走', color: '#2C9365', left: 80, top: 89, hotLeft: 76.5, hotTop: 84, hotWidth: 7, hotHeight: 10, navTarget: 'walk_start' },
      { id: 'reward-exchange', name: '奖品兑换处', type: '兑换', note: '凭待核销兑换码领取活动奖品。', icon: '礼', color: '#6C77C8', left: 59, top: 36, hotLeft: 55.5, hotTop: 31, hotWidth: 7, hotHeight: 10, navTarget: 'reward_exchange' }
    ]
  },

  rules: {
    image: '/assets/rules/points-rules.png'
  },

  exchangeLocation: {
    name: '内蒙古大学南校区卓越楼',
    address: '内蒙古大学南校区卓越楼',
    latitude: 40.7589,
    longitude: 111.6859
  },

  stepChallenge: {
    startPoint: SOUTH_ARTS_TARGET,
    endPoint: SOUTH_ARTS_TARGET,
    campuses: [
      {
        id: 'imu-south-arts',
        name: '内蒙古大学艺术楼',
        label: '艺术楼起终点',
        latitude: 40.7599,
        longitude: 111.6764,
        scale: 17,
        address: '内蒙古大学南校区艺术楼',
        bounds: {
          minLatitude: 40.752,
          maxLatitude: 40.764,
          minLongitude: 111.671,
          maxLongitude: 111.694
        }
      }
    ],
    stepLevels: [
      { steps: 3000, points: 3 },
      { steps: 5000, points: 5 },
      { steps: 8000, points: 8 }
    ]
  }
}

const DEFAULT_COLLEGE = '计算机学院（软件学院）'
const COLLEGE_ALIASES = {
  计算机学院: DEFAULT_COLLEGE
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

const catalog = clone(defaultCatalog)
const configs = clone(defaultConfigs)

function normalizeList(value) {
  return Array.isArray(value) ? clone(value) : []
}

function withLocalCatalogDefaults(key, value) {
  const defaultList = defaultCatalog[key]
  if (!Array.isArray(defaultList)) return normalizeList(value)

  const defaultItems = defaultList.reduce((result, item) => {
    const itemKey = item.code || item.id
    if (itemKey) result[itemKey] = item
    return result
  }, {})
  const requiresItemKey = defaultList.some(item => item.code || item.id)

  return normalizeList(value).map(item => {
    const safeItem = item && typeof item === 'object' ? item : {}
    const itemKey = safeItem.code || safeItem.id
    if (requiresItemKey && !itemKey) return null
    const fallback = defaultItems[itemKey] || {}
    const nextItem = Object.assign({}, fallback, safeItem)
    if (key === 'zones') {
      nextItem.wordArt = safeItem.wordArt || fallback.wordArt || ''
    }
    return nextItem
  }).filter(Boolean)
}

function replaceList(key, value) {
  const nextList = withLocalCatalogDefaults(key, value)
  catalog[key].splice.apply(catalog[key], [0, catalog[key].length].concat(nextList))
}

function replaceConfigList(key, value) {
  configs[key].splice.apply(configs[key], [0, configs[key].length].concat(normalizeList(value)))
}

function mergeListByKey(defaultList, sourceList, keyName) {
  const defaults = (defaultList || []).reduce((result, item) => {
    const itemKey = item && item[keyName]
    if (itemKey !== undefined && itemKey !== null) result[String(itemKey)] = item
    return result
  }, {})

  return (sourceList || []).map(item => {
    const itemKey = item && item[keyName]
    return Object.assign({}, defaults[String(itemKey)] || {}, item)
  })
}

function withLocalConfigDefaults(key, value) {
  if (key === 'rules' && typeof value === 'string') {
    return { image: value || defaultConfigs.rules.image }
  }

  const fallback = defaultConfigs[key] || {}
  const source = value && typeof value === 'object' ? value : {}
  const nextValue = Object.assign({}, fallback, clone(source))

  if (key === 'campusMap') {
    nextValue.navTargets = normalizeCampusNavTargets(Object.assign({}, fallback.navTargets || {}, source.navTargets || {}))
    nextValue.locations = Array.isArray(source.locations) && source.locations.length
      ? mergeListByKey(fallback.locations, source.locations, 'id')
      : clone(fallback.locations || [])
  }

  if (key === 'exchangeLocation') {
    return clone(fallback)
  }

  if (key === 'stepChallenge') {
    nextValue.startPoint = clone(fallback.startPoint || SOUTH_ARTS_TARGET)
    nextValue.endPoint = clone(fallback.endPoint || SOUTH_ARTS_TARGET)
    nextValue.campuses = clone(fallback.campuses || [])
    nextValue.stepLevels = Array.isArray(source.stepLevels) && source.stepLevels.length
      ? mergeListByKey(fallback.stepLevels, source.stepLevels, 'steps')
      : clone(fallback.stepLevels || [])
  }

  return nextValue
}

function replaceObject(target, value) {
  Object.keys(target).forEach(key => {
    delete target[key]
  })
  Object.assign(target, clone(value || {}))
}

function getCatalog() {
  return {
    zones: clone(catalog.zones),
    tasks: clone(catalog.tasks),
    rewards: clone(catalog.rewards),
    personalRanking: clone(catalog.personalRanking),
    collegeRanking: clone(catalog.collegeRanking),
    news: clone(catalog.news),
    achievements: clone(catalog.achievements),
    cards: clone(catalog.cards)
  }
}

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source, key)
}

function mergeCatalog(nextCatalog) {
  const source = nextCatalog || {}
  ;['zones', 'tasks', 'rewards', 'personalRanking', 'collegeRanking', 'news', 'achievements', 'cards'].forEach(key => {
    if (hasOwn(source, key)) replaceList(key, source[key])
  })
  if (hasOwn(source, 'colleges')) replaceConfigList('colleges', source.colleges)
  if (hasOwn(source, 'campusMap')) replaceObject(configs.campusMap, withLocalConfigDefaults('campusMap', source.campusMap))
  if (hasOwn(source, 'rules')) replaceObject(configs.rules, withLocalConfigDefaults('rules', source.rules))
  if (hasOwn(source, 'exchangeLocation')) replaceObject(configs.exchangeLocation, withLocalConfigDefaults('exchangeLocation', source.exchangeLocation))
  if (hasOwn(source, 'stepChallenge')) replaceObject(configs.stepChallenge, withLocalConfigDefaults('stepChallenge', source.stepChallenge))
  return getCatalog()
}

function getConfig(key) {
  if (key === 'cards') return clone(catalog.cards)
  if (key === 'catalog') return getCatalog()
  return clone(configs[key] || null)
}

function normalizeCollegeName(value) {
  const college = String(value || '').trim()
  return COLLEGE_ALIASES[college] || college
}

function getColleges(value, extraValue) {
  const colleges = []
  const seen = {}
  ;[defaultConfigs.colleges, configs.colleges, value, [extraValue]].forEach(list => {
    if (!Array.isArray(list)) return
    list.forEach(item => {
      const college = normalizeCollegeName(item)
      if (!college || seen[college]) return
      seen[college] = true
      colleges.push(college)
    })
  })
  return colleges
}

function getDefaultCollegeIndex(colleges, selectedCollege) {
  const list = Array.isArray(colleges) ? colleges : []
  const normalizedSelected = normalizeCollegeName(selectedCollege)
  if (normalizedSelected) {
    const selectedIndex = list.indexOf(normalizedSelected)
    if (selectedIndex >= 0) return selectedIndex
  }
  return Math.max(0, list.indexOf(DEFAULT_COLLEGE))
}

module.exports = {
  zones: catalog.zones,
  tasks: catalog.tasks,
  rewards: catalog.rewards,
  personalRanking: catalog.personalRanking,
  collegeRanking: catalog.collegeRanking,
  news: catalog.news,
  achievements: catalog.achievements,
  cards: catalog.cards,
  colleges: configs.colleges,
  campusMap: configs.campusMap,
  rules: configs.rules,
  exchangeLocation: configs.exchangeLocation,
  stepChallenge: configs.stepChallenge,
  getCatalog,
  getConfig,
  getColleges,
  getDefaultCollegeIndex,
  normalizeCollegeName,
  mergeCatalog
}
