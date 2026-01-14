export const PRICING_CONFIG = {
  plans: {
    free: {
      name: 'Free',
      price: 0,
    },
    pro: {
      name: 'Pro',
      price: 10, // Regular price
      launchPrice: 5, // Launch special price
      isLaunchSpecial: true,
      launchDiscountPercentage: 50,
      trialDays: 15,
    },
  },
  features: {
    free: [
      'Up to 5 subjects',
      'Natal charts only',
      '5 AI interpretations/day',
      'Basic chart customization',
    ],
    pro: [
      'Unlimited birth charts',
      'All chart types (Transit, Synastry, Composite, Returns)',
      'AI-powered interpretations',
      'PDF export',
      'Timeline analysis',
      'Priority support',
    ],
  },
} as const
