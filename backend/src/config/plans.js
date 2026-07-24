// Single source of truth for company subscription plans. Both the public
// pricing page and the authenticated billing page read from this list (via
// the /api/plans and /api/company/billing/plans endpoints) so the numbers
// shown to a visitor and the numbers shown to a signed-in company can never
// drift apart the way the old hardcoded frontend copies did.
const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    monthlyAmount: 0,
    yearlyAmount: 0,
    currency: 'NPR',
    features: ['1 active job post', '10 candidate views/month', 'Basic company profile'],
  },
  {
    id: 'STARTER',
    name: 'Starter',
    monthlyAmount: 2999,
    yearlyAmount: 2299,
    currency: 'NPR',
    features: ['3 active job posts', '50 candidate views/month', 'Basic applicant tracking', 'Email support'],
  },
  {
    id: 'GROWTH',
    name: 'Growth',
    monthlyAmount: 7999,
    yearlyAmount: 6199,
    currency: 'NPR',
    popular: true,
    features: [
      '10 active job posts',
      'Unlimited candidate views',
      'Advanced applicant tracking',
      'Analytics dashboard',
      'Verified company badge',
      'Priority support',
    ],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    monthlyAmount: 19999,
    yearlyAmount: 15999,
    currency: 'NPR',
    custom: true,
    features: [
      'Unlimited job posts',
      'Dedicated account manager',
      'Custom integrations',
      'Custom analytics reports',
      'SLA guarantees',
    ],
  },
]

function getPlanById(id) {
  return PLANS.find((p) => p.id === String(id || '').toUpperCase()) || null
}

module.exports = { PLANS, getPlanById }
