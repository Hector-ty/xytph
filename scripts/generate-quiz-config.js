const fs = require('fs')
const path = require('path')

const topics = [
  { name: '绿色出行', correct: '步行或骑行', wrong: ['独自开燃油车', '短距离频繁叫车', '让车辆长时间怠速'], explain: '短距离步行或骑行几乎不产生直接碳排放，也能增加日常运动。' },
  { name: '公共交通', correct: '优先乘坐公交或地铁', wrong: ['每次都单人驾车', '为了方便空车绕行', '把车停在路边长时间开空调'], explain: '公共交通能提高单次出行承载人数，分摊能源消耗。' },
  { name: '拼车出行', correct: '同路线同学合理拼车', wrong: ['多人分别打车', '车辆空座也不共享', '为了凑里程绕远路'], explain: '在确需乘车时，合理拼车可以减少重复车辆出行。' },
  { name: '空调使用', correct: '夏季设置在二十六摄氏度左右', wrong: ['温度越低越好', '开窗同时开空调', '离开房间不关闭'], explain: '合理设置空调温度并关闭门窗，能明显减少电力消耗。' },
  { name: '宿舍断电', correct: '离开前关闭电器并拔掉闲置插头', wrong: ['只关一盏灯即可', '电脑一直待机', '充电器长期插在插座上'], explain: '很多电器待机也会耗电，拔掉闲置插头更节能也更安全。' },
  { name: '节能照明', correct: '使用节能灯并随手关灯', wrong: ['白天也开满所有灯', '没人时保持照明', '用高耗能灯具替代节能灯'], explain: '节能灯具和随手关灯是最容易坚持的低碳习惯。' },
  { name: '电脑节能', correct: '不用时启用睡眠或关机', wrong: ['屏幕常亮一整天', '下载完也不关机', '多台设备同时闲置运行'], explain: '电脑睡眠和关机能减少无效用电，延长设备寿命。' },
  { name: '手机充电', correct: '充满后及时拔掉充电器', wrong: ['整夜持续充电', '不用也插着充电头', '多个充电器长期空插'], explain: '及时拔掉充电器可以降低待机能耗和安全风险。' },
  { name: '节约用水', correct: '洗手打皂时关闭水龙头', wrong: ['水一直开着', '用大量清水反复冲洗', '发现滴漏不报修'], explain: '随手关水和及时报修漏水点，是校园节水的基础行动。' },
  { name: '一水多用', correct: '能回收的清水用于拖地或浇花', wrong: ['少量可用水直接倒掉', '把污水倒入绿地', '用饮用水冲洗地面'], explain: '一水多用能提高水资源利用效率，但要注意水质和卫生。' },
  { name: '可回收物', correct: '干净纸张和塑料瓶投入可回收物桶', wrong: ['和剩饭一起丢', '随手扔进任意垃圾桶', '把有害垃圾混进去'], explain: '可回收物保持清洁干燥，更利于后续回收利用。' },
  { name: '厨余垃圾', correct: '剩饭剩菜投入厨余垃圾桶', wrong: ['和纸杯混在一起', '倒进可回收物桶', '随意留在餐桌上'], explain: '厨余垃圾单独投放，有助于资源化处理和环境卫生。' },
  { name: '有害垃圾', correct: '废电池和过期药品投放到有害垃圾点', wrong: ['混入普通垃圾', '丢进草坪', '拆开后随意丢弃'], explain: '有害垃圾需要专门处理，避免污染土壤和水体。' },
  { name: '其他垃圾', correct: '污染严重且不可回收的物品投其他垃圾', wrong: ['都投可回收物桶', '都投厨余垃圾桶', '随意堆在楼道'], explain: '无法回收且不属于厨余、有害的垃圾，通常按其他垃圾处理。' },
  { name: '光盘行动', correct: '按需取餐并尽量吃完', wrong: ['先多拿再说', '只拍照不吃完', '剩饭直接留在桌上'], explain: '减少食物浪费能降低食物生产、运输和处理过程中的碳排放。' },
  { name: '食堂取餐', correct: '少量多次取餐', wrong: ['一次装满再丢掉', '为了排面多点很多菜', '不喜欢就整份倒掉'], explain: '少量多次更容易控制食量，也能减少浪费。' },
  { name: '一次性餐具', correct: '自带餐具或选择可重复使用餐具', wrong: ['每餐都拿多套餐具', '餐具未用就丢弃', '优先选择一次性用品'], explain: '减少一次性用品，可以减少原料消耗和垃圾产生。' },
  { name: '自带水杯', correct: '使用自己的水杯接水', wrong: ['每天购买多瓶瓶装水', '一次性纸杯用完就丢', '水杯脏了就换新的'], explain: '自带水杯能减少瓶装水和一次性杯子的使用。' },
  { name: '旧书流转', correct: '把旧书捐赠、交换或二手流转', wrong: ['直接丢弃', '长期堆放发霉', '能用也撕掉'], explain: '旧书继续使用，可以延长物品寿命并减少新书资源消耗。' },
  { name: '双面用纸', correct: '打印前选择双面打印', wrong: ['单面大量打印', '错一页就整本重打', '草稿纸只写一行就丢'], explain: '双面打印和草稿纸再利用能减少纸张消耗。' },
  { name: '电子资料', correct: '能电子阅读时优先使用电子版', wrong: ['所有资料都打印', '重复打印同一文件', '打印后不再使用'], explain: '电子阅读适合通知、课件和临时材料，可减少不必要打印。' },
  { name: '快递包装', correct: '拆包后分类回收纸箱和填充物', wrong: ['全部混入厨余垃圾', '纸箱完好也撕碎丢弃', '可复用包装直接扔掉'], explain: '快递纸箱和缓冲材料复用或回收，可以减少包装浪费。' },
  { name: '环保购物袋', correct: '购物时自带可重复使用的袋子', wrong: ['每次都拿新塑料袋', '买少量物品也套多层袋', '可重复袋用一次就扔'], explain: '重复使用购物袋能减少塑料制品消耗。' },
  { name: '旧衣处理', correct: '干净旧衣捐赠、改造或回收', wrong: ['还能穿也直接丢', '随意焚烧', '混入厨余垃圾'], explain: '旧衣循环利用能减少纺织品浪费和处理压力。' },
  { name: '二手交易', correct: '闲置物品通过校园二手平台流转', wrong: ['全都买新的', '闲置物品长期落灰', '能用物品直接报废'], explain: '二手流转让物品发挥更长价值，也减少新产品生产需求。' },
  { name: '校园绿植', correct: '爱护树木花草并参与养护', wrong: ['随意折枝', '踩踏绿地', '把垃圾埋进花坛'], explain: '校园绿植有助于改善环境，也能提升大家的低碳意识。' },
  { name: '草坪保护', correct: '走规定道路不踩踏草坪', wrong: ['为了近路穿越草坪', '在草坪乱扔垃圾', '随意破坏绿化牌'], explain: '保护草坪能减少修复维护成本，维护校园生态环境。' },
  { name: '碳足迹', correct: '记录出行、用电和消费产生的碳影响', wrong: ['只看价格不看消耗', '认为个人行为无影响', '把浪费当作正常现象'], explain: '了解碳足迹有助于发现可以改进的日常行为。' },
  { name: '碳中和', correct: '先减排，再通过碳汇等方式抵消剩余排放', wrong: ['只种树不减排', '排放越多越好', '和日常生活完全无关'], explain: '碳中和强调减排优先，抵消是补充手段。' },
  { name: '碳汇', correct: '森林、草地等生态系统吸收并固定二氧化碳', wrong: ['一次性塑料越多碳汇越大', '开空调可以形成碳汇', '垃圾堆放就是碳汇'], explain: '碳汇是生态系统吸收和储存碳的重要能力。' },
  { name: '新能源', correct: '优先使用太阳能、风能等清洁能源', wrong: ['优先浪费化石能源', '让设备空转耗电', '把节能设备闲置不用'], explain: '清洁能源能降低化石能源依赖，是低碳转型的重要方向。' },
  { name: '节能建筑', correct: '利用自然采光和保温措施降低能耗', wrong: ['白天拉窗帘开灯', '门窗长期漏风不管', '冬夏都让空调满负荷运行'], explain: '建筑节能需要采光、保温、通风和设备管理共同配合。' },
  { name: '雨水收集', correct: '将可用雨水用于绿化浇灌', wrong: ['把雨水管堵住', '用饮用水替代所有浇灌水', '雨水直接污染后排放'], explain: '合理收集雨水能节约自来水，也有利于校园海绵设施运行。' },
  { name: '海绵校园', correct: '通过透水铺装和绿地滞蓄雨水', wrong: ['所有地面都硬化', '堵塞排水沟', '破坏下凹绿地'], explain: '海绵校园能吸收、滞蓄和净化雨水，提升环境韧性。' },
  { name: '绿色采购', correct: '选择耐用、节能、可维修的产品', wrong: ['只买一次性产品', '频繁更换还能用的物品', '忽视能效标识'], explain: '绿色采购关注全生命周期，耐用和节能都很重要。' },
  { name: '低碳宣传', correct: '用准确知识带动身边同学参与', wrong: ['传播不实信息', '只喊口号不行动', '嘲笑他人的环保尝试'], explain: '低碳传播应真实、友善、可执行，才能形成持续影响。' },
  { name: '活动布置', correct: '重复使用展板、桌牌和装饰材料', wrong: ['每次活动都全新购买', '活动后直接丢弃可用物料', '大量使用不可回收装饰'], explain: '校园活动物料复用能明显减少一次性消耗。' },
  { name: '会议节能', correct: '会前确认人数并减少纸质材料', wrong: ['空房间长时间开灯', '每人多发几份纸质材料', '会议结束不关设备'], explain: '会议管理中的用电、用纸和设备关闭都能节能。' },
  { name: '实验室通风', correct: '按安全要求使用通风并及时关闭不用设备', wrong: ['无实验也一直开大风量', '随意关闭必要安全通风', '设备报警也不报修'], explain: '实验室低碳必须以安全为前提，避免无效运行。' },
  { name: '实验废弃物', correct: '按规定分类收集实验废弃物', wrong: ['倒入普通垃圾桶', '随意倒进下水道', '混放不同危险废物'], explain: '实验废弃物需要规范处理，不能为了省事随意处置。' },
  { name: '打印习惯', correct: '打印前预览并确认页数', wrong: ['不检查直接打印', '格式错了整份重打', '重复打印多个版本'], explain: '打印预览能减少错印和重复打印造成的纸张浪费。' },
  { name: '楼层通行', correct: '低楼层优先走楼梯', wrong: ['一层也乘电梯', '电梯门反复空开', '多人分散占用多部电梯'], explain: '低楼层走楼梯既节能，也有利于身体活动。' },
  { name: '洗衣晾晒', correct: '衣物集中清洗并自然晾晒', wrong: ['少量衣物多次机洗', '晴天也长时间烘干', '洗衣机空转'], explain: '集中洗衣和自然晾晒能减少水电消耗。' },
  { name: '外卖选择', correct: '备注少餐具并选择简约包装', wrong: ['每单都要多套餐具', '能堂食也频繁点外卖', '包装越复杂越好'], explain: '减少外卖餐具和过度包装，是日常低碳消费的一部分。' },
  { name: '饮食结构', correct: '适量增加植物性食物比例', wrong: ['每餐都大量浪费肉类', '只点不吃', '用高浪费方式备餐'], explain: '均衡饮食并减少浪费，有助于降低食物相关碳排放。' },
  { name: '本地食物', correct: '优先选择本地、当季食材', wrong: ['追求长距离空运食物', '反季食材越多越好', '忽视运输和保鲜消耗'], explain: '本地当季食材通常运输和储存压力更小。' },
  { name: '食物保存', correct: '合理保存剩余食物并及时食用', wrong: ['买了不吃直到变质', '剩菜随意丢弃', '冰箱塞满后不整理'], explain: '合理保存能减少食物浪费，也减少厨余处理压力。' },
  { name: '骑行安全', correct: '规范停放共享单车并佩戴必要防护', wrong: ['把车停在消防通道', '骑行时逆行抢道', '损坏车辆后不处理'], explain: '低碳出行也要安全有序，不能影响公共秩序。' },
  { name: '空瓶回收', correct: '喝完的饮料瓶清空后投入可回收物桶', wrong: ['带液体直接乱扔', '和厨余混在一起', '丢到草丛里'], explain: '空瓶清空后回收，更方便后续分拣和再利用。' },
  { name: '绿色承诺', correct: '把低碳目标拆成每天能做到的小行动', wrong: ['只在打卡时行动', '目标越空越好', '别人监督才行动'], explain: '低碳行为贵在持续，具体的小行动更容易形成习惯。' }
]

const topicContexts = {
  绿色出行: '校园出行',
  公共交通: '校园出行',
  拼车出行: '周末出行',
  空调使用: '宿舍日常',
  宿舍断电: '宿舍日常',
  节能照明: '教学楼课间',
  电脑节能: '图书馆学习',
  手机充电: '宿舍日常',
  节约用水: '校园用水',
  一水多用: '校园用水',
  可回收物: '垃圾分类',
  厨余垃圾: '食堂就餐',
  有害垃圾: '垃圾分类',
  其他垃圾: '垃圾分类',
  光盘行动: '食堂就餐',
  食堂取餐: '食堂就餐',
  一次性餐具: '食堂就餐',
  自带水杯: '校园饮水',
  旧书流转: '学习资料',
  双面用纸: '学习资料',
  电子资料: '学习资料',
  快递包装: '快递收取',
  环保购物袋: '校园消费',
  旧衣处理: '校园消费',
  二手交易: '校园消费',
  校园绿植: '校园生态',
  草坪保护: '校园生态',
  碳足迹: '低碳认知',
  碳中和: '低碳认知',
  碳汇: '校园生态',
  新能源: '低碳认知',
  节能建筑: '校园建筑',
  雨水收集: '校园用水',
  海绵校园: '校园用水',
  绿色采购: '校园消费',
  低碳宣传: '社团活动',
  活动布置: '校园活动',
  会议节能: '校园会议',
  实验室通风: '实验实训',
  实验废弃物: '实验实训',
  打印习惯: '学习资料',
  楼层通行: '教学楼课间',
  洗衣晾晒: '宿舍日常',
  外卖选择: '食堂就餐',
  饮食结构: '食堂就餐',
  本地食物: '食堂就餐',
  食物保存: '食堂就餐',
  骑行安全: '校园出行',
  空瓶回收: '垃圾分类',
  绿色承诺: '低碳行动'
}

const patterns = [
  (topic, context) => `在${context}中，关于${topic.name}，哪种做法更低碳？`,
  (topic, context) => `遇到${context}场景时，${topic.name}最推荐的做法是什么？`,
  (topic, context) => `下列哪项属于${topic.name}的正确行动？`,
  (topic, context) => `想减少${context}中${topic.name}相关的碳排放，优先选择哪一项？`
]

function getTopicContext(topic) {
  return topicContexts[topic.name]
}

function arrangeOptions(topic, index) {
  const options = [topic.correct].concat(topic.wrong)
  const shift = index % options.length
  const rotated = options.slice(shift).concat(options.slice(0, shift))
  return {
    options: rotated,
    answer: rotated.indexOf(topic.correct)
  }
}

const questions = []

topics.forEach(topic => {
  patterns.forEach((buildTitle, variant) => {
    const number = questions.length + 1
    const context = getTopicContext(topic)
    const arranged = arrangeOptions(topic, number)

    questions.push({
      id: `lc_${String(number).padStart(3, '0')}`,
      title: buildTitle(topic, context),
      options: arranged.options,
      answer: arranged.answer,
      explain: topic.explain
    })
  })
})

const quiz = {
  seedVersion: '2026-06-15-cn-v3',
  bankSize: 200,
  drawCount: 5,
  points: 5,
  questions
}

function assertQuizConfig(quiz) {
  if (quiz.questions.length !== 200) {
    throw new Error(`Expected 200 questions, got ${quiz.questions.length}`)
  }

  const missingContexts = topics
    .map(topic => topic.name)
    .filter(name => !topicContexts[name])

  if (missingContexts.length) {
    throw new Error(`Missing topic contexts: ${missingContexts.join(', ')}`)
  }

  const topicByQuestionIndex = []
  topics.forEach(topic => {
    patterns.forEach(() => topicByQuestionIndex.push(topic))
  })

  quiz.questions.forEach((question, index) => {
    const topic = topicByQuestionIndex[index]
    if (!question.title.includes(topic.name)) {
      throw new Error(`${question.id} title does not include topic ${topic.name}: ${question.title}`)
    }
    if (!Array.isArray(question.options) || question.options.length !== 4) {
      throw new Error(`${question.id} must have exactly 4 options`)
    }
    if (new Set(question.options).size !== question.options.length) {
      throw new Error(`${question.id} has duplicated options`)
    }
    if (question.answer < 0 || question.answer >= question.options.length) {
      throw new Error(`${question.id} has invalid answer index`)
    }
    if (question.options[question.answer] !== topic.correct) {
      throw new Error(`${question.id} answer does not match topic correct option`)
    }
  })
}

assertQuizConfig(quiz)

const output = `${JSON.stringify(quiz, null, 2)}\n`
const root = path.resolve(__dirname, '..')

fs.writeFileSync(path.join(root, 'shared', 'quiz-config-200.json'), output, 'utf8')
fs.writeFileSync(path.join(root, 'cloudfunctions', 'carbonApi', 'quiz-config-200.json'), output, 'utf8')

console.log(`wrote ${quiz.questions.length} questions`)
console.log(quiz.questions[0].title)
