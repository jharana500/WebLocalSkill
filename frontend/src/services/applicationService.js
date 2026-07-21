import api from './api'

export const applicationService = {
  applyToJob: (jobId, data) => api.post(`/applications`, { jobId, ...data }),
  getMyApplications: (params) => api.get('/applications/me', { params }),
  getApplicationById: (id) => api.get(`/applications/${id}`),
  withdrawApplication: (id) => api.patch(`/applications/${id}/withdraw`),
  getJobApplications: (jobId, params) => api.get(`/jobs/${jobId}/applications`, { params }),
  updateApplicationStatus: (id, status, notes) =>
    api.patch(`/applications/${id}/status`, { status, notes }),
  getSavedJobs: () => api.get('/saved-jobs'),
  saveJob: (jobId) => api.post(`/saved-jobs/${jobId}`),
  unsaveJob: (jobId) => api.delete(`/saved-jobs/${jobId}`),
  checkSaved: (jobId) => api.get(`/saved-jobs/${jobId}/check`),
  getCompanyApplications: (params) => api.get('/applications/company', { params }),
}
