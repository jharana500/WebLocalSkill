import api from './api'

export const adminService = {
  getDashboardStats: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deactivateUser: (id) => api.patch(`/admin/users/${id}/deactivate`),
  activateUser: (id) => api.patch(`/admin/users/${id}/activate`),
  getCompanies: (params) => api.get('/admin/companies', { params }),
  getCompanyById: (id) => api.get(`/admin/companies/${id}`),
  updateCompanyStatus: (id, status) => api.patch(`/admin/companies/${id}/status`, { status }),
  getVerificationQueue: (params) => api.get('/admin/verification-queue', { params }),
  reviewVerification: (id, decision, notes) =>
    api.post(`/admin/verification/${id}/review`, { decision, notes }),
  getJobs: (params) => api.get('/admin/jobs', { params }),
  updateJobStatus: (id, status) => api.patch(`/admin/jobs/${id}/status`, { status }),
  getAnalytics: (range) => api.get('/admin/analytics', { params: { range } }),
  getRevenue: (range) => api.get('/admin/revenue', { params: { range } }),
  getReports: (type, range) => api.get('/admin/reports', { params: { type, range } }),
}
