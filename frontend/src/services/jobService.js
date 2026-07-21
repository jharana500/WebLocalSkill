import api from './api'

export const jobService = {
  getJobs: (params) => api.get('/jobs', { params }),
  getJobById: (id) => api.get(`/jobs/${id}`),
  createJob: (data) => api.post('/jobs', data),
  updateJob: (id, data) => api.put(`/jobs/${id}`, data),
  deleteJob: (id) => api.delete(`/jobs/${id}`),
  toggleJobStatus: (id) => api.patch(`/jobs/${id}/toggle-status`),
  getJobAnalytics: (id) => api.get(`/jobs/${id}/analytics`),
  getFeaturedJobs: () => api.get('/jobs/featured'),
  getRecommendedJobs: () => api.get('/jobs/recommended'),
  getNearbyJobs: (district) => api.get('/jobs/nearby', { params: { district } }),
  getCategories: () => api.get('/jobs/categories'),
  searchJobs: (query, filters) => api.get('/jobs/search', { params: { q: query, ...filters } }),
  getCompanyJobs: (params) => api.get('/jobs/my', { params }),
}
