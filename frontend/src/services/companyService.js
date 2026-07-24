import api from './api'

export const companyService = {
  getProfile: () => api.get('/company/profile'),
  updateProfile: (data) => api.put('/company/profile', data),
  uploadLogo: (file) => {
    const form = new FormData()
    form.append('logo', file)
    return api.post('/company/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  submitVerification: (data) => api.post('/company/verification', data),
  getVerificationStatus: () => api.get('/company/verification/status'),
  getDashboardStats: () => api.get('/company/dashboard'),
  getAnalytics: (range) => api.get('/company/analytics', { params: { range } }),
  getBillingHistory: () => api.get('/company/billing/history'),
  getPlans: () => api.get('/company/billing/plans'),
  getSubscription: () => api.get('/company/subscription'),
  updateSubscription: (plan) => api.post('/company/subscription', { plan }),
  getPublicCompanies: (params) => api.get('/companies', { params }),
  getPublicCompanyById: (id) => api.get(`/companies/${id}`),
}
