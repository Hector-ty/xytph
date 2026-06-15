const data = require('../../utils/data')
const store = require('../../utils/store')

const statusLabels = {
  NOT_STARTED: '尚未完成',
  IN_PROGRESS: '正在进行',
  PENDING_REVIEW: '等待复审',
  READY_TO_CLAIM: '待领取积分',
  COMPLETED: '已领取积分',
  REJECTED: '审核未通过',
  LIMIT_REACHED: '已达今日上限',
  EXPIRED: '任务已过期'
}

Page({
  data: {
    task: {},
    zone: {},
    status: 'NOT_STARTED',
    statusLabel: '尚未完成',
    evidence: '',
    evidenceSubmitted: false,
    aiReview: null,
    aiReviewLabel: '',
    canSubmitEvidence: false,
    submitting: false,
    claiming: false,
    canClaim: false,
    claimedPoints: 0,
    isStepChallenge: false
  },

  onLoad(options) {
    this.taskId = options.id
    if (!store.requireRole('student')) return
    this.refresh()
    store.syncCatalog().then(() => this.refresh()).catch(() => this.refresh())
    store.syncState().then(() => this.refresh()).catch(() => this.refresh())
  },

  onShow() {
    if (!store.requireRole('student')) return
    if (this.taskId) {
      this.refresh()
      store.syncCatalog().then(() => this.refresh()).catch(() => this.refresh())
      store.syncState().then(() => this.refresh()).catch(() => this.refresh())
    }
  },

  refresh() {
    const task = data.tasks.find(item => item.id === this.taskId) || {}
    if (!task.id) {
      this.setData({
        task: {},
        zone: {},
        status: 'NOT_STARTED',
        statusLabel: statusLabels.NOT_STARTED,
        evidence: '',
        evidenceSubmitted: false,
        aiReview: null,
        aiReviewLabel: '',
        canSubmitEvidence: false,
        canClaim: false,
        claimedPoints: 0,
        isStepChallenge: false
      })
      return
    }
    const zone = data.zones.find(item => item.code === task.zone)
    const state = store.getState()
    const status = state.taskStates[task.id] || 'NOT_STARTED'
    const evidenceRecord = (state.taskEvidence || {})[task.id] || null
    const existingEvidence = evidenceRecord && (evidenceRecord.tempFilePath || evidenceRecord.imageUrl || evidenceRecord.fileId)
    const localDraft = this.data.evidence && !this.data.evidenceSubmitted ? this.data.evidence : ''
    const evidence = localDraft || existingEvidence || ''
    const evidenceSubmitted = Boolean(existingEvidence) && !localDraft
    const aiReview = evidenceSubmitted ? evidenceRecord.aiReview || null : null
    const claimedPoints = Number((state.taskPoints || {})[task.id] || 0)
    const pendingWithPoints = status === 'PENDING_REVIEW' && claimedPoints > 0
    const canClaim = status === 'READY_TO_CLAIM' || (status === 'COMPLETED' && !claimedPoints)
    const canSubmitEvidence = task.type === 'PHOTO'
      && Boolean(evidence)
      && !evidenceSubmitted
      && status !== 'PENDING_REVIEW'
      && status !== 'READY_TO_CLAIM'
      && status !== 'COMPLETED'
    const isStepChallenge = task.id === 'green_steps'
    this.setData({
      task,
      zone,
      status,
      statusLabel: pendingWithPoints ? '积分已到账，等待复审' : (isStepChallenge && status !== 'COMPLETED' ? '开始挑战' : (statusLabels[status] || statusLabels.NOT_STARTED)),
      evidence,
      evidenceSubmitted,
      aiReview,
      aiReviewLabel: this.getAiReviewLabel(aiReview),
      canSubmitEvidence,
      canClaim,
      claimedPoints,
      isStepChallenge
    })
  },

  getAiReviewLabel(aiReview) {
    if (!aiReview) return ''
    if (aiReview.passed === true) return 'AI初审通过，等待管理员复审'
    if (aiReview.passed === false) return 'AI初审提示异常，等待管理员复审'
    return aiReview.label || '已进入人工复审'
  },

  goBack() {
    wx.navigateBack()
  },

  chooseEvidence() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: result => {
        this.setData({
          evidence: result.tempFiles[0].tempFilePath,
          evidenceSubmitted: false,
          aiReview: null,
          aiReviewLabel: '',
          canSubmitEvidence: true
        })
      }
    })
  },

  previewEvidence() {
    wx.previewImage({ urls: [this.data.evidence] })
  },

  removeEvidence() {
    if (!this.data.evidenceSubmitted) {
      this.setData({
        evidence: '',
        aiReview: null,
        aiReviewLabel: '',
        canSubmitEvidence: false
      })
      this.refresh()
      return
    }

    this.setData({ submitting: true })
    store.deleteEvidenceAsync(this.data.task)
      .then(result => {
        this.setData({
          submitting: false,
          evidence: '',
          evidenceSubmitted: false,
          aiReview: null,
          aiReviewLabel: '',
          canSubmitEvidence: false
        })
        const deducted = Number(result.deductedPoints || 0)
        wx.showToast({
          title: deducted ? `已删除，扣回 ${deducted} 分` : '已删除凭证',
          icon: 'none'
        })
        this.refresh()
      })
      .catch(() => {
        this.setData({ submitting: false })
        wx.showToast({ title: '删除失败，请稍后重试', icon: 'none' })
      })
  },

  goStepChallenge() {
    wx.navigateTo({ url: '/pages/step-challenge/index' })
  },

  submitEvidence() {
    if (!this.data.evidence) {
      wx.showToast({ title: '请先添加一张照片', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    store.uploadEvidence(this.data.evidence, this.data.task.id)
      .then(uploadResult => store.submitEvidenceAsync(this.data.task, {
        fileId: uploadResult.fileID || uploadResult.fileId || '',
        tempFilePath: uploadResult.tempFilePath || this.data.evidence,
        localOnly: Boolean(uploadResult.localOnly),
        uploadError: uploadResult.error || ''
      }))
      .then(result => {
        if (result.code === 'LIMIT_REACHED') {
          this.setData({ submitting: false })
          wx.showToast({ title: '今日专区积分已达上限', icon: 'none' })
          this.refresh()
          return
        }
        const aiReview = result.aiReview || null
        let title = result.changed ? `提交成功 +${result.points || this.data.task.points}` : '请勿重复提交'
        if (aiReview && aiReview.status === 'SKIPPED') title = result.changed ? `已提交复审 +${result.points || this.data.task.points}` : '已提交人工复审'
        this.setData({
          submitting: false,
          evidenceSubmitted: true,
          aiReview,
          aiReviewLabel: this.getAiReviewLabel(aiReview),
          canSubmitEvidence: false
        })
        wx.showToast({ title, icon: result.changed ? 'success' : 'none' })
        this.refresh()
      })
      .catch(() => {
        this.setData({ submitting: false })
        wx.showToast({ title: '提交失败，请稍后重试', icon: 'none' })
      })
  },

  handleAction() {
    const task = this.data.task
    if (this.data.isStepChallenge) {
      this.goStepChallenge()
      return
    }
    if (this.data.status === 'READY_TO_CLAIM') {
      this.claimPoints()
      return
    }
    if (this.data.status === 'COMPLETED' || this.data.status === 'PENDING_REVIEW') {
      wx.showToast({ title: this.data.statusLabel, icon: 'none' })
      return
    }
    if (task.type === 'PHOTO') {
      this.chooseEvidence()
      return
    }
    if (task.type === 'STAFF_ENTRY') {
      wx.showModal({
        title: '现场登记任务',
        content: '请携带物品前往循环集市，向工作人员出示个人码。工作人员登记后，系统会按后台规则计算积分。',
        confirmText: '知道了',
        showCancel: false
      })
      return
    }
    if (task.type === 'QR') {
      this.scanTaskCode()
      return
    }
    this.completeNow()
  },

  scanTaskCode() {
    wx.scanCode({
      scanType: ['qrCode'],
      success: result => {
        store.completeScannedTaskAsync(this.data.task, result.result || result.path || '')
          .then(response => {
            if (!response.ok) {
              wx.showToast({ title: 'QR code invalid', icon: 'none' })
              return
            }
            if (response.code === 'LIMIT_REACHED') {
              wx.showToast({ title: '今日专区积分已达上限', icon: 'none' })
              this.refresh()
              return
            }
            wx.showToast({
              title: response.changed ? `任务完成 +${response.points || this.data.task.points}` : '任务已完成',
              icon: response.changed ? 'success' : 'none'
            })
            this.refresh()
          })
      },
      fail: () => {
        wx.showToast({ title: '未扫描到有效活动二维码', icon: 'none' })
      }
    })
  },

  completeNow() {
    if (this.data.task && this.data.task.type === 'QR') {
      wx.showToast({ title: '请扫描有效二维码完成任务', icon: 'none' })
      return
    }
    store.completeTaskAsync(this.data.task, 'COMPLETED').then(result => {
      if (result.code === 'LIMIT_REACHED') {
        wx.showToast({ title: '今日专区积分已达上限', icon: 'none' })
        this.refresh()
        return
      }
      wx.showToast({
        title: result.changed ? `任务完成 +${result.points || this.data.task.points}` : '任务已完成',
        icon: result.changed ? 'success' : 'none'
      })
      this.refresh()
    })
  },

  claimPoints() {
    if (!this.data.canClaim) {
      wx.showToast({ title: this.data.claimedPoints ? '已经领取过啦' : this.data.statusLabel, icon: 'none' })
      return
    }
    this.setData({ claiming: true })
    store.claimTaskPointsAsync(this.data.task).then(result => {
      this.setData({ claiming: false })
      if (result.code === 'LIMIT_REACHED') {
        wx.showToast({ title: '今日专区积分已达上限', icon: 'none' })
        this.refresh()
        return
      }
      wx.showToast({
        title: result.changed ? `领取成功 +${result.points || this.data.task.points}` : '已经领取过啦',
        icon: result.changed ? 'success' : 'none'
      })
      this.refresh()
    }).catch(() => {
      this.setData({ claiming: false })
      wx.showToast({ title: '领取失败，请稍后重试', icon: 'none' })
    })
  }
})
