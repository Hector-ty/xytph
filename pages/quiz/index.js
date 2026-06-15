const store = require('../../utils/store')

const DRAW_COUNT = 5
const optionLabels = ['A', 'B', 'C', 'D']

function prepareQuestion(question) {
  const source = question || { options: [] }
  return Object.assign({}, source, {
    options: (source.options || []).map((text, index) => ({
      text,
      label: optionLabels[index] || String(index + 1)
    }))
  })
}

Page({
  data: {
    index: 0,
    question: prepareQuestion(null),
    questionCount: 0,
    bankSize: 0,
    selected: -1,
    answered: false,
    isCorrect: false,
    correctCount: 0,
    finished: false,
    alreadyCompleted: false,
    quizPoints: 0,
    loading: false
  },

  onLoad() {
    if (!store.requireRole('student')) return
    this.questions = []
    this.loadQuizQuestions()
    this.setData({ alreadyCompleted: store.getState().quizCompleted })
    store.syncState().then(state => this.setData({ alreadyCompleted: state.quizCompleted })).catch(() => {})
  },

  loadQuizQuestions() {
    this.setData({ loading: true })
    return store.getQuizQuestionsAsync(DRAW_COUNT).then(result => {
      const questions = Array.isArray(result.questions) ? result.questions : []
      this.questions = questions
      this.setData({
        index: 0,
        question: prepareQuestion(questions[0]),
        questionCount: questions.length,
        bankSize: Number(result.total || 0),
        selected: -1,
        answered: false,
        isCorrect: false,
        correctCount: 0,
        finished: false,
        quizPoints: Number(result.points || 0),
        loading: false
      })
    }).catch(error => {
      this.questions = []
      this.setData({
        index: 0,
        question: prepareQuestion(null),
        questionCount: 0,
        bankSize: 0,
        selected: -1,
        answered: false,
        isCorrect: false,
        correctCount: 0,
        finished: false,
        quizPoints: 0,
        loading: false
      })
      wx.showToast({ title: error && error.message ? error.message : '题库加载失败', icon: 'none' })
    })
  },

  goBack() {
    wx.navigateBack()
  },

  selectOption(event) {
    if (this.data.answered || !this.data.questionCount) return
    const selected = Number(event.currentTarget.dataset.index)
    const isCorrect = selected === this.data.question.answer
    this.setData({
      selected,
      answered: true,
      isCorrect,
      correctCount: this.data.correctCount + (isCorrect ? 1 : 0)
    })
  },

  next() {
    const questionList = this.questions || []
    if (!questionList.length) {
      wx.showToast({ title: '题库未配置', icon: 'none' })
      return
    }
    if (this.data.index === questionList.length - 1) {
      store.finishQuizAsync().then(result => {
        this.setData({ finished: true, alreadyCompleted: !result.changed })
      }).catch(error => {
        wx.showToast({ title: error && error.message ? error.message : '提交失败', icon: 'none' })
      })
      return
    }
    const index = this.data.index + 1
    this.setData({
      index,
      question: prepareQuestion(questionList[index]),
      selected: -1,
      answered: false,
      isCorrect: false
    })
  },

  restart() {
    this.loadQuizQuestions()
  }
})
