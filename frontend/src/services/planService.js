import api from './api'

// Public, unauthenticated mirror of the same plan config the authenticated
// Billing page reads — keeps landing/pricing numbers in sync with billing.
export const planService = {
  getPublicPlans: () => api.get('/plans'),
}
