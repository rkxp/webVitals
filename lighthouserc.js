module.exports = {
  ci: {
    collect: {
      // URLs to test - can be overridden by environment variables or GitHub Actions
      url: process.env.LIGHTHOUSE_URLS ? 
        process.env.LIGHTHOUSE_URLS.split(' ').filter(Boolean) : 
        [process.env.PRODUCTION_URL || 'https://webvitals.contentstackapps.com/'].filter(Boolean),
      
      // Lighthouse collection settings
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage --headless',
        preset: 'desktop', // or 'mobile'
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        skipAudits: [
          'screenshot-thumbnails',
          'final-screenshot',
          'largest-contentful-paint-element',
          'layout-shift-elements'
        ]
      }
    },
    
    assert: {
      // Relaxed assertions for initial testing - these can be tightened later
      assertions: {
        'categories:performance': ['warn', { minScore: 0.6 }],
        'categories:accessibility': ['warn', { minScore: 0.8 }],
        'categories:best-practices': ['warn', { minScore: 0.7 }],
        'categories:seo': ['warn', { minScore: 0.7 }]
      }
    },
    
    upload: {
      // For GitHub Actions, just store results temporarily without GitHub status integration
      target: 'temporary-public-storage'
    },
    
    wizard: {
      // Lighthouse CI wizard settings
      preset: 'ci'
    }
  }
};