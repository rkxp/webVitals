#!/usr/bin/env node

/**
 * Web Vitals Monitor - GitHub Actions Integration
 * Automated performance monitoring for every deployment
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  psiApiKey: process.env.GOOGLE_PSI_API_KEY,
  productionUrl: process.env.PRODUCTION_URL,
  stagingUrl: process.env.STAGING_URL,
  customUrl: process.env.INPUT_URL,
  thresholds: {
    lcp: parseFloat(process.env.PERFORMANCE_THRESHOLD_LCP) || 2.5,
    cls: parseFloat(process.env.PERFORMANCE_THRESHOLD_CLS) || 0.1,
    inp: parseFloat(process.env.PERFORMANCE_THRESHOLD_INP) || 200,
    performance: 90
  },
  github: {
    eventName: process.env.GITHUB_EVENT_NAME,
    sha: process.env.GITHUB_SHA,
    ref: process.env.GITHUB_REF,
    prNumber: process.env.PR_NUMBER
  }
};

// Utility functions
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function makeHttpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          resolve(data);
        }
      });
    });
    
    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
    
    request.end();
  });
}

async function fetchPageSpeedInsights(url) {
  const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${config.psiApiKey}&strategy=mobile&category=performance&category=accessibility&category=best-practices&category=seo`;
  
  log(`Fetching PageSpeed Insights for: ${url}`);
  
  try {
    const response = await makeHttpRequest(psiUrl);
    
    if (response.error) {
      throw new Error(`PSI API Error: ${response.error.message}`);
    }
    
    const lighthouse = response.lighthouseResult;
    const loadingExperience = response.loadingExperience;
    
    // Extract Core Web Vitals
    const lcp = lighthouse.audits['largest-contentful-paint']?.numericValue / 1000 || null;
    const cls = lighthouse.audits['cumulative-layout-shift']?.numericValue || null;
    const inp = lighthouse.audits['interaction-to-next-paint']?.numericValue || null;
    
    // Extract scores
    const performance = Math.round(lighthouse.categories.performance.score * 100);
    const accessibility = Math.round(lighthouse.categories.accessibility.score * 100);
    const bestPractices = Math.round(lighthouse.categories['best-practices'].score * 100);
    const seo = Math.round(lighthouse.categories.seo.score * 100);
    
    // Field data (if available)
    const fieldData = loadingExperience?.metrics || {};
    
    return {
      url,
      timestamp: new Date().toISOString(),
      lcp,
      cls,
      inp,
      performance,
      accessibility,
      bestPractices,
      seo,
      fieldData,
      audits: lighthouse.audits,
      opportunities: lighthouse.audits,
      diagnostics: lighthouse.audits
    };
    
  } catch (error) {
    log(`Failed to fetch PageSpeed Insights: ${error.message}`, 'error');
    throw error;
  }
}

function getMetricStatus(metric, value) {
  const thresholds = {
    lcp: { good: 2.5, poor: 4.0 },
    cls: { good: 0.1, poor: 0.25 },
    inp: { good: 200, poor: 500 },
    performance: { good: 90, poor: 50 }
  };
  
  if (!thresholds[metric] || value === null) return 'unknown';
  
  const { good, poor } = thresholds[metric];
  
  if (metric === 'performance') {
    return value >= good ? 'good' : value >= poor ? 'needs-improvement' : 'poor';
  } else {
    return value <= good ? 'good' : value <= poor ? 'needs-improvement' : 'poor';
  }
}

function compareWithBaseline(current, baseline) {
  if (!baseline) return { regressions: [], improvements: [] };
  
  const regressions = [];
  const improvements = [];
  
  const metrics = ['lcp', 'cls', 'inp', 'performance'];
  
  metrics.forEach(metric => {
    if (current[metric] !== null && baseline[metric] !== null) {
      const currentValue = current[metric];
      const baselineValue = baseline[metric];
      const threshold = config.thresholds[metric];
      
      let change, impact;
      
      if (metric === 'performance') {
        change = currentValue - baselineValue;
        impact = Math.abs(change) >= 5 ? 'significant' : 'minor';
        
        if (change < -5) {
          regressions.push({ metric, change: `${change.toFixed(1)}`, impact });
        } else if (change > 5) {
          improvements.push({ metric, change: `+${change.toFixed(1)}`, impact });
        }
      } else {
        change = currentValue - baselineValue;
        const percentChange = (change / baselineValue) * 100;
        impact = Math.abs(percentChange) >= 10 ? 'significant' : 'minor';
        
        if ((metric === 'lcp' || metric === 'inp') && change > threshold * 0.1) {
          regressions.push({ metric, change: `+${change.toFixed(3)}`, impact });
        } else if (metric === 'cls' && change > threshold * 0.1) {
          regressions.push({ metric, change: `+${change.toFixed(3)}`, impact });
        } else if (change < 0 && Math.abs(percentChange) >= 10) {
          improvements.push({ metric, change: `${change.toFixed(3)}`, impact });
        }
      }
    }
  });
  
  return { regressions, improvements };
}

function loadHistoricalData() {
  const historyFile = 'web-vitals-history.json';
  
  if (fs.existsSync(historyFile)) {
    try {
      return JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    } catch (error) {
      log(`Failed to load historical data: ${error.message}`, 'warn');
    }
  }
  
  return { runs: [] };
}

function saveHistoricalData(data) {
  const historyFile = 'web-vitals-history.json';
  
  try {
    fs.writeFileSync(historyFile, JSON.stringify(data, null, 2));
    log('Historical data saved successfully');
  } catch (error) {
    log(`Failed to save historical data: ${error.message}`, 'error');
  }
}

function generateReport(results, comparison, githubContext) {
  const report = {
    timestamp: new Date().toISOString(),
    github: githubContext,
    results,
    comparison,
    summary: {
      totalUrls: results.length,
      averagePerformance: results.reduce((sum, r) => sum + (r.performance || 0), 0) / results.length,
      regressions: comparison.regressions?.length || 0,
      improvements: comparison.improvements?.length || 0
    }
  };
  
  // Save detailed report
  fs.writeFileSync('performance-report.json', JSON.stringify(report, null, 2));
  
  // Create regression flag if needed
  if (comparison.regressions && comparison.regressions.length > 0) {
    fs.writeFileSync('performance-regression.flag', 'true');
  }
  
  log('Performance report generated successfully', 'success');
  return report;
}

async function runLighthouseCheck(url) {
  log(`Running Lighthouse analysis for: ${url}`);
  
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    const lighthouse = spawn('npx', [
      'lighthouse',
      url,
      '--only-categories=performance,accessibility,best-practices,seo',
      '--chrome-flags="--headless --no-sandbox --disable-dev-shm-usage"',
      '--output=html',
      '--output-path=lighthouse-report.html',
      '--quiet'
    ]);
    
    lighthouse.on('close', (code) => {
      if (code === 0) {
        log('Lighthouse analysis completed', 'success');
        resolve();
      } else {
        reject(new Error(`Lighthouse failed with code ${code}`));
      }
    });
    
    lighthouse.on('error', reject);
  });
}

async function main() {
  try {
    log('🚀 Starting Web Vitals monitoring...');
    
    // Validate configuration
    if (!config.psiApiKey) {
      throw new Error('GOOGLE_PSI_API_KEY environment variable is required');
    }
    
    // Determine URLs to test
    const urlsToTest = [];
    
    if (config.customUrl) {
      urlsToTest.push(config.customUrl);
    } else {
      if (config.github.eventName === 'push' && config.github.ref === 'refs/heads/main') {
        // Production deployment
        if (config.productionUrl) urlsToTest.push(config.productionUrl);
      } else if (config.github.eventName === 'pull_request') {
        // Staging or PR preview
        if (config.stagingUrl) urlsToTest.push(config.stagingUrl);
      } else {
        // Scheduled run - test production
        if (config.productionUrl) urlsToTest.push(config.productionUrl);
      }
    }
    
    if (urlsToTest.length === 0) {
      throw new Error('No URLs configured for testing');
    }
    
    log(`Testing ${urlsToTest.length} URL(s): ${urlsToTest.join(', ')}`);
    
    // Load historical data
    const history = loadHistoricalData();
    
    // Run performance tests
    const results = [];
    for (const url of urlsToTest) {
      try {
        const result = await fetchPageSpeedInsights(url);
        results.push(result);
        
        // Run Lighthouse for additional analysis
        await runLighthouseCheck(url);
        
        log(`✅ Completed analysis for ${url} - Performance: ${result.performance}/100`, 'success');
      } catch (error) {
        log(`❌ Failed to analyze ${url}: ${error.message}`, 'error');
        results.push({
          url,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Compare with baseline (most recent successful run)
    const baseline = history.runs
      .filter(run => run.results.length > 0 && !run.results[0].error)
      .pop();
    
    let comparison = { regressions: [], improvements: [] };
    if (baseline && results.length > 0 && !results[0].error) {
      comparison = compareWithBaseline(results[0], baseline.results[0]);
    }
    
    // Generate report
    const report = generateReport(results, comparison, config.github);
    
    // Update historical data
    history.runs.push({
      timestamp: new Date().toISOString(),
      github: config.github,
      results,
      comparison
    });
    
    // Keep only last 50 runs
    if (history.runs.length > 50) {
      history.runs = history.runs.slice(-50);
    }
    
    saveHistoricalData(history);
    
    // Summary
    log('📊 Performance monitoring completed', 'success');
    log(`Results: ${results.length} URLs tested`);
    if (comparison.regressions.length > 0) {
      log(`⚠️ ${comparison.regressions.length} performance regression(s) detected`, 'warn');
    }
    if (comparison.improvements.length > 0) {
      log(`🎉 ${comparison.improvements.length} performance improvement(s) detected`, 'success');
    }
    
  } catch (error) {
    log(`❌ Monitoring failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run the monitoring
if (require.main === module) {
  main();
}

module.exports = {
  fetchPageSpeedInsights,
  compareWithBaseline,
  generateReport,
  getMetricStatus
};