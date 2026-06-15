const store = require('../../utils/store')
const data = require('../../utils/data')

const ROLE_LABELS = {
  student: '学生',
  teacher: '老师',
  staff: '工作人员',
  admin: '管理员'
}

Page({
  data: {
    mode: 'login',
    roles: [
      { key: 'student', label: ROLE_LABELS.student, abbr: '学' },
      { key: 'teacher', label: ROLE_LABELS.teacher, abbr: '师' },
      { key: 'staff', label: ROLE_LABELS.staff, abbr: '工' },
      { key: 'admin', label: ROLE_LABELS.admin, abbr: '管' }
    ],
    role: 'student',
    loginRole: '',
    selectedRoleLabel: '',
    name: '',
    studentNo: '',
    phone: '',
    staffNo: '',
    inviteCode: '',
    collegeIndex: 0,
    colleges: [],
    loginLoading: false,
    submitting: false,
    redirect: '/pages/home/index'
  },

  onLoad(options) {
    const mode = options.mode === 'register' || options.mode === 'identity' ? options.mode : 'login'
    this.setData({
      redirect: options.redirect ? decodeURIComponent(options.redirect) : '/pages/home/index',
      mode
    })
    this.loadColleges()
  },

  loadColleges() {
    store.getConfigAsync('colleges').then(result => {
      const colleges = data.getColleges(result.value)
      this.setData({
        colleges,
        collegeIndex: data.getDefaultCollegeIndex(colleges)
      })
    }).catch(() => {
      const colleges = data.getColleges()
      this.setData({
        colleges,
        collegeIndex: data.getDefaultCollegeIndex(colleges)
      })
    })
  },

  showRegister() {
    this.setData({ mode: 'register' })
  },

  showIdentity() {
    this.setData({ mode: 'identity' })
  },

  showLogin() {
    this.setData({ mode: 'login' })
  },

  selectLoginRole(event) {
    const role = event.currentTarget.dataset.role || 'student'
    this.setData({
      role,
      loginRole: role,
      selectedRoleLabel: ROLE_LABELS[role] || ROLE_LABELS.student,
      mode: 'login'
    })
  },

  handleWechatLogin() {
    this.setData({ loginLoading: true })
    store.loginWithWeChatAsync(this.data.loginRole).then(result => {
      if (result.ok) {
        wx.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => wx.reLaunch({ url: this.data.redirect || '/pages/home/index' }), 300)
        return
      }

      if (result.code === 'IDENTITY_NOT_REGISTERED' || result.code === 'UNREGISTERED') {
        wx.showToast({ title: result.message || '该身份尚未注册，请先注册', icon: 'none' })
        this.setData({ mode: 'register' })
        return
      }

      wx.showToast({ title: result.message || '该身份暂不可用', icon: 'none' })
    }).catch(error => {
      wx.showToast({ title: error && error.message ? error.message : '登录失败', icon: 'none' })
    }).then(() => {
      this.setData({ loginLoading: false })
    })
  },

  selectRole(event) {
    const role = event.currentTarget.dataset.role || 'student'
    this.setData({
      role,
      loginRole: role,
      selectedRoleLabel: ROLE_LABELS[role] || ROLE_LABELS.student
    })
  },

  onNameInput(event) {
    this.setData({ name: event.detail.value })
  },

  onStudentNoInput(event) {
    this.setData({ studentNo: event.detail.value })
  },

  onPhoneInput(event) {
    this.setData({ phone: event.detail.value })
  },

  onStaffNoInput(event) {
    this.setData({ staffNo: event.detail.value })
  },

  onInviteInput(event) {
    this.setData({ inviteCode: String(event.detail.value || '').toUpperCase().slice(0, 8) })
  },

  onCollegeChange(event) {
    this.setData({ collegeIndex: Number(event.detail.value) })
  },

  submit() {
    const name = this.data.name.trim()
    const role = this.data.role
    const isTeacher = role === 'teacher'
    const isStaffRole = role === 'staff' || role === 'admin'
    const studentNo = this.data.studentNo.trim()
    const staffNo = this.data.staffNo.trim()
    const phone = this.data.phone.trim().replace(/\s+/g, '')
    const inviteCode = this.data.inviteCode.trim().toUpperCase()
    const college = this.data.colleges[this.data.collegeIndex]

    if (!name) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    if (!isTeacher && !college) {
      wx.showToast({ title: '学院未配置', icon: 'none' })
      return
    }
    if (role === 'student' && !studentNo) {
      wx.showToast({ title: '请输入学号', icon: 'none' })
      return
    }
    if (isStaffRole && !staffNo) {
      wx.showToast({ title: '请输入工号', icon: 'none' })
      return
    }
    if (isStaffRole && inviteCode.length !== 8) {
      wx.showToast({ title: '请输入8位邀请码', icon: 'none' })
      return
    }
    if (!phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    store.registerProfileAsync({
      role,
      name,
      college: isTeacher ? '' : college,
      studentNo: role === 'student' ? studentNo : '',
      staffNo: isStaffRole ? staffNo : '',
      phone,
      inviteCode: isStaffRole ? inviteCode : ''
    }).then(() => {
      wx.showToast({ title: '注册成功', icon: 'success' })
      setTimeout(() => wx.reLaunch({ url: this.data.redirect || '/pages/home/index' }), 350)
    }).catch(error => {
      wx.showToast({ title: error && error.message ? error.message : '注册失败', icon: 'none' })
    }).then(() => {
      this.setData({ submitting: false })
    })
  }
})
