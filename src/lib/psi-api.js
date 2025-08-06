/**
 * Google PageSpeed Insights API integration
 */

/**
 * Fetch PageSpeed Insights data for a URL
 * @param {string} url - The URL to analyze
 * @param {string} apiKey - Google PSI API key
 * @param {string} strategy - 'mobile' or 'desktop' (default: 'mobile')
 * @returns {Promise<Object>} Processed vitals data
 */
export async function fetchPageSpeedInsights(url, apiKey, strategy = 'mobile') {
  if (!apiKey) {
    throw new Error('Google PageSpeed Insights API key is required');
  }

  if (!url) {
    throw new Error('URL is required');
  }

  // Validate and normalize URL
  const normalizedUrl = normalizeUrl(url);
  
  const apiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  apiUrl.searchParams.set('url', normalizedUrl);
  apiUrl.searchParams.set('key', apiKey);
  apiUrl.searchParams.set('strategy', strategy);
  
  // Request all categories for comprehensive analysis
  // Note: PSI API v5 uses 'category' parameter multiple times or comma-separated
  const categories = ['PERFORMANCE', 'ACCESSIBILITY', 'BEST_PRACTICES', 'SEO'];
  categories.forEach(category => {
    apiUrl.searchParams.append('category', category);
  });

  try {
    const response = await fetch(apiUrl.toString());
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || 
        `API request failed with status ${response.status}`
      );
    }

    const data = await response.json();
    return processPageSpeedData(data);
  } catch (error) {
    console.error('PageSpeed Insights API error:', error);
    throw error;
  }
}

/**
 * Normalize URL for API request
 * @param {string} url - Raw URL input
 * @returns {string} Normalized URL
 */
function normalizeUrl(url) {
  try {
    // Add protocol if missing
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    
    const urlObj = new URL(url);
    return urlObj.toString();
  } catch (error) {
    throw new Error('Invalid URL format');
  }
}

/**
 * Process raw PageSpeed Insights data into our format
 * @param {Object} psiData - Raw PSI API response
 * @returns {Object} Processed vitals data
 */
function processPageSpeedData(psiData) {
  try {
    const lighthouse = psiData.lighthouseResult;
    
    if (!lighthouse) {
      throw new Error('Invalid PageSpeed Insights response: missing lighthouseResult');
    }
    
    const audits = lighthouse.audits || {};
    const categories = lighthouse.categories || {};
    
    // Determine strategy from configSettings or fallback
    let strategy = 'mobile'; // default
    if (lighthouse.configSettings?.emulatedFormFactor) {
      strategy = lighthouse.configSettings.emulatedFormFactor;
    } else if (lighthouse.configSettings?.formFactor) {
      strategy = lighthouse.configSettings.formFactor;
    }
    
    // Extract Core Web Vitals
    const vitals = {
      // Performance score (0-100) - handle missing performance category
      performance: categories.performance ? Math.round(categories.performance.score * 100) : null,
      
      // Core Web Vitals
      lcp: extractMetricValue(audits['largest-contentful-paint']),
      fcp: extractMetricValue(audits['first-contentful-paint']),
      cls: extractMetricValue(audits['cumulative-layout-shift']),
      ttfb: extractMetricValue(audits['server-response-time']),
      
      // Speed Index and other metrics
      speedIndex: extractMetricValue(audits['speed-index']),
      totalBlockingTime: extractMetricValue(audits['total-blocking-time']),
      
      // Additional scores - handle missing categories gracefully
      accessibility: categories.accessibility ? Math.round(categories.accessibility.score * 100) : null,
      bestPractices: categories['best-practices'] ? Math.round(categories['best-practices'].score * 100) : null,
      seo: categories.seo ? Math.round(categories.seo.score * 100) : null,
      
      // Metadata
      rawUrl: psiData.id || psiData.requestedUrl || psiData.finalUrl,
      strategy: strategy,
      analysisTimestamp: psiData.analysisUTCTimestamp || lighthouse.fetchTime || new Date().toISOString(),
      lighthouseVersion: lighthouse.lighthouseVersion,
      userAgent: lighthouse.userAgent,
    };

    // Try to extract INP if available (newer metric)
    if (audits['interaction-to-next-paint']) {
      vitals.inp = extractMetricValue(audits['interaction-to-next-paint']);
    } else if (audits['experimental-interaction-to-next-paint']) {
      // Fallback for older API responses
      vitals.inp = extractMetricValue(audits['experimental-interaction-to-next-paint']);
    } else if (audits['max-potential-fid']) {
      // Fallback to FID if INP not available
      vitals.inp = extractMetricValue(audits['max-potential-fid']);
    } else if (audits['first-input-delay']) {
      // Another fallback to FID
      vitals.inp = extractMetricValue(audits['first-input-delay']);
    }

    // Check if we got any performance data
    const hasPerformanceData = vitals.lcp !== null || vitals.fcp !== null || 
                               vitals.cls !== null || vitals.ttfb !== null || 
                               vitals.performance !== null;
    
    if (!hasPerformanceData) {
      console.warn('No performance data found in PageSpeed Insights response. This might be due to requesting only specific categories (e.g., SEO only).');
    }

    // Extract opportunities for improvement
    vitals.opportunities = extractOpportunities(lighthouse);
    
    return vitals;
  } catch (error) {
    console.error('Error processing PageSpeed data:', error);
    console.error('Raw PSI data:', psiData);
    throw new Error('Failed to process PageSpeed Insights data: ' + error.message);
  }
}

/**
 * Extract metric value from audit result
 * @param {Object} audit - Lighthouse audit result
 * @returns {number|null} Metric value in appropriate units
 */
function extractMetricValue(audit) {
  if (!audit) {
    return null;
  }
  
  // Check for numericValue first, then fallback to displayValue parsing
  let numericValue = audit.numericValue;
  
  if (numericValue === undefined || numericValue === null) {
    // Try to extract numeric value from displayValue (e.g., "2.5 s" -> 2.5)
    if (audit.displayValue && typeof audit.displayValue === 'string') {
      const match = audit.displayValue.match(/^([\d.]+)/);
      if (match) {
        numericValue = parseFloat(match[1]);
        // If displayValue has units, handle conversion
        if (audit.displayValue.includes('ms')) {
          numericValue = numericValue / 1000; // Convert ms to seconds
        }
      }
    }
    
    if (numericValue === undefined || numericValue === null || isNaN(numericValue)) {
      return null;
    }
  }

  // Handle INP separately - keep in milliseconds
  if (audit.id && (
    audit.id.includes('interaction-to-next-paint') ||
    audit.id.includes('input-delay')
  )) {
    // INP should remain in milliseconds
    return Math.round(numericValue);
  }

  // Convert milliseconds to seconds for other time-based metrics
  if (audit.id && (
    audit.id.includes('paint') || 
    audit.id.includes('response-time') ||
    audit.id.includes('speed-index') ||
    audit.id.includes('blocking-time')
  )) {
    // If value is already very small, it might already be in seconds
    if (numericValue < 50) {
      return Math.round(numericValue * 1000) / 1000; // Already in seconds, just round
    }
    return Math.round(numericValue) / 1000; // Convert ms to seconds
  }

  // Return raw value for other metrics (CLS, scores, etc.)
  return Math.round(numericValue * 1000) / 1000; // Round to 3 decimal places
}

/**
 * Extract improvement opportunities
 * @param {Object} lighthouse - Lighthouse result
 * @returns {Array} Array of opportunities
 */
function extractOpportunities(lighthouse) {
  const opportunities = [];
  
  if (!lighthouse || !lighthouse.audits) return opportunities;

  // Key performance opportunities to track
  const opportunityAudits = [
    'unused-css-rules',
    'unused-javascript',
    'render-blocking-resources',
    'unminified-css',
    'unminified-javascript',
    'efficient-animated-content',
    'offscreen-images',
    'webp-images',
    'uses-optimized-images',
    'modern-image-formats',
    'uses-text-compression',
    'dom-size',
    'mainthread-work-breakdown',
    'bootup-time',
    'uses-passive-event-listeners',
    'font-display',
  ];

  opportunityAudits.forEach(auditId => {
    const audit = lighthouse.audits[auditId];
    if (!audit) return;
    
    // Calculate potential savings
    let savingsMs = 0;
    
    if (audit.details && audit.details.overallSavingsMs) {
      savingsMs = audit.details.overallSavingsMs;
    } else if (audit.numericValue && audit.id === 'dom-size') {
      // DOM size doesn't have overallSavingsMs but can impact performance
      const domNodes = audit.numericValue;
      if (domNodes > 3000) {
        savingsMs = Math.min((domNodes - 3000) * 0.1, 1000); // Estimate impact
      }
    } else if (audit.numericValue && (
      audit.id.includes('blocking') || 
      audit.id.includes('bootup') ||
      audit.id.includes('mainthread')
    )) {
      savingsMs = audit.numericValue; // These are already in ms
    }
    
    // Only include if there are meaningful savings or poor score
    if (savingsMs > 100 || (audit.score !== null && audit.score < 0.9)) {
      opportunities.push({
        id: auditId,
        title: audit.title || auditId,
        description: audit.description || 'Performance improvement opportunity',
        savings: Math.round(savingsMs / 1000), // Convert to seconds
        score: audit.score,
        displayValue: audit.displayValue,
      });
    }
  });

  return opportunities
    .sort((a, b) => b.savings - a.savings)
    .slice(0, 5); // Top 5 opportunities
}

/**
 * Check if vitals data contains performance metrics
 * @param {Object} vitalsData - Processed vitals data
 * @returns {boolean} Whether performance data is present
 */
export function hasPerformanceData(vitalsData) {
  return !!(vitalsData.lcp !== null || 
           vitalsData.fcp !== null || 
           vitalsData.cls !== null || 
           vitalsData.ttfb !== null || 
           vitalsData.performance !== null);
}

/**
 * Get list of missing categories from vitals data
 * @param {Object} vitalsData - Processed vitals data
 * @returns {Array} Array of missing category names
 */
export function getMissingCategories(vitalsData) {
  const missing = [];
  if (vitalsData.performance === null) missing.push('Performance');
  if (vitalsData.accessibility === null) missing.push('Accessibility');
  if (vitalsData.bestPractices === null) missing.push('Best Practices');
  if (vitalsData.seo === null) missing.push('SEO');
  return missing;
}

/**
 * Validate API key by making a test request
 * @param {string} apiKey - Google PSI API key
 * @returns {Promise<boolean>} Whether the API key is valid
 */
export async function validateApiKey(apiKey) {
  if (!apiKey) return false;

  try {
    const testUrl = 'https://example.com';
    const vitalsData = await fetchPageSpeedInsights(testUrl, apiKey);
    
    // Warn if API key works but no performance data is received
    if (!hasPerformanceData(vitalsData)) {
      const missing = getMissingCategories(vitalsData);
      console.warn(`API key is valid but missing categories: ${missing.join(', ')}. This might be due to API quota limitations or restricted category access.`);
    }
    
    return true;
  } catch (error) {
    console.error('API key validation failed:', error);
    return false;
  }
}

/**
 * Get API quota information (estimate based on usage)
 * Note: Google doesn't provide direct quota information via API
 * @param {string} apiKey - Google PSI API key
 * @returns {Object} Quota estimation
 */
export function getApiQuotaInfo(apiKey) {
  // Google PSI API has limits but doesn't expose quota directly
  // Default quotas: 25,000 queries per day, 400 queries per 100 seconds
  return {
    dailyLimit: 25000,
    perMinuteLimit: 240, // Approximation based on 400 per 100 seconds
    note: 'Limits are estimates. Check Google Cloud Console for exact quotas.',
  };
}

/**
 * Batch multiple URL checks with rate limiting
 * @param {Array} urls - Array of URL objects with {id, url}
 * @param {string} apiKey - Google PSI API key
 * @param {Function} progressCallback - Called with progress updates
 * @returns {Promise<Array>} Array of results
 */
export async function batchFetchPageSpeedInsights(urls, apiKey, progressCallback) {
  const results = [];
  const delay = 2000; // 2 second delay between requests to respect rate limits
  
  for (let i = 0; i < urls.length; i++) {
    const urlObj = urls[i];
    
    try {
      if (progressCallback) {
        progressCallback({
          current: i + 1,
          total: urls.length,
          url: urlObj.url,
          status: 'processing',
        });
      }

      const vitals = await fetchPageSpeedInsights(urlObj.url, apiKey);
      results.push({
        id: urlObj.id,
        url: urlObj.url,
        success: true,
        data: vitals,
      });

      if (progressCallback) {
        progressCallback({
          current: i + 1,
          total: urls.length,
          url: urlObj.url,
          status: 'completed',
        });
      }
    } catch (error) {
      console.error(`Failed to fetch data for ${urlObj.url}:`, error);
      results.push({
        id: urlObj.id,
        url: urlObj.url,
        success: false,
        error: error.message,
      });

      if (progressCallback) {
        progressCallback({
          current: i + 1,
          total: urls.length,
          url: urlObj.url,
          status: 'error',
          error: error.message,
        });
      }
    }

    // Rate limiting delay (except for the last request)
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return results;
}