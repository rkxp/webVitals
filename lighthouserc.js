module.exports = {
  ci: {
    collect: {
      // URLs to test - can be overridden by environment variables
      url: [
        process.env.PRODUCTION_URL || 'https://your-website.com',
        process.env.STAGING_URL || 'https://staging-your-website.com'
      ].filter(Boolean),
      
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
      // Performance budgets and assertions
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.8 }],
        'categories:seo': ['error', { minScore: 0.8 }],
        
        // Core Web Vitals thresholds
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'interaction-to-next-paint': ['error', { maxNumericValue: 200 }],
        
        // Additional performance metrics
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
        'speed-index': ['warn', { maxNumericValue: 3400 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        
        // Accessibility
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        'valid-lang': 'error',
        
        // Best Practices
        'is-on-https': 'error',
        'uses-responsive-images': 'warn',
        'efficient-animated-content': 'warn',
        
        // SEO
        'document-title': 'error',
        'meta-description': 'error',
        'crawlable-anchors': 'error'
      }
    },
    
    upload: {
      // Upload to Lighthouse CI server or GitHub
      target: 'temporary-public-storage',
      
      // If using LHCI server
      serverBaseUrl: process.env.LHCI_SERVER_URL,
      token: process.env.LHCI_TOKEN,
      
      // GitHub integration
      githubAppToken: process.env.LHCI_GITHUB_APP_TOKEN,
      githubToken: process.env.GITHUB_TOKEN,
      githubApiHost: process.env.GITHUB_API_HOST || 'api.github.com'
    },
    
    wizard: {
      // Lighthouse CI wizard settings
      preset: 'ci'
    }
  }
};