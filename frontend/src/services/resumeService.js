import api from './api'

export const resumeService = {
  getMyResume: () => api.get('/resumes/me'),
  saveResume: (data) => api.post('/resumes/me', data),
  updateResume: (data) => api.patch('/resumes/me', data),
}
