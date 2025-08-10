module.exports = {
  ci: {
    collect: {
      // URLs to test - can be overridden by environment variables or GitHub Actions
      url: process.env.LIGHTHOUSE_URLS ? 
        process.env.LIGHTHOUSE_URLS.split(' ').filter(Boolean) : 
        [process.env.PRODUCTION_URL || 'https://webvitals.contentstackapps.com/'].filter(Boolean),
      
      // Lighthouse collection settings  
      numberOfRuns: 1, // Single run for faster CI (was 3)
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
      // Quality gates - CI will FAIL and block merges if scores are below thresholds
      assertions: {
        'categories:performance': ['error', { minScore: 0.6 }],
        'categories:accessibility': ['error', { minScore: 0.8 }],
        'categories:best-practices': ['error', { minScore: 0.7 }],
        'categories:seo': ['error', { minScore: 0.7 }]
      }
    },
    
    upload: {
      // Use temporary public storage for GitHub Actions CI
      target: 'temporary-public-storage'
    },
    
    // Also collect reports locally for artifact upload
    collect: {
      ...module.exports.ci.collect,
      outputDir: './lighthouse-results'
    }
  }
};