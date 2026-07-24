import api from './api'

export const contactService = {
  send: (data) => api.post('/contact', data),
}
