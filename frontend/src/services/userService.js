import api from './api'

export const userService = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  uploadAvatar: (file) => {
    const form = new FormData()
    form.append('avatar', file)
    return api.post('/user/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  uploadResume: (file) => {
    const form = new FormData()
    form.append('resume', file)
    return api.post('/user/resume', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  getResume: () => api.get('/user/resume'),
  addSkill: (skill) => api.post('/user/skills', { skill }),
  removeSkill: (skill) => api.delete(`/user/skills/${skill}`),
  addEducation: (data) => api.post('/user/education', data),
  updateEducation: (id, data) => api.put(`/user/education/${id}`, data),
  removeEducation: (id) => api.delete(`/user/education/${id}`),
  addExperience: (data) => api.post('/user/experience', data),
  updateExperience: (id, data) => api.put(`/user/experience/${id}`, data),
  removeExperience: (id) => api.delete(`/user/experience/${id}`),
  addCertification: (data) => api.post('/user/certifications', data),
  removeCertification: (id) => api.delete(`/user/certifications/${id}`),
  getDashboardData: () => api.get('/user/dashboard'),
  changePassword: (data) => api.post('/user/change-password', data),
  updateNotifications: (settings) => api.put('/user/notifications', settings),
  deleteAccount: () => api.delete('/user/account'),
}
