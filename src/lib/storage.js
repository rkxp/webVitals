/**
 * Local storage utilities for web vitals tracking app
 */

// Storage keys
const STORAGE_KEYS = {
  TRACKED_URLS: 'webvitals_tracked_urls',
  SETTINGS: 'webvitals_settings',
  VITALS_DATA: 'webvitals_data',
};

// Default settings
const DEFAULT_SETTINGS = {
  googlePsiApiKey: '',
  slackWebhookUrl: '',
  emailJsServiceId: '',
  emailJsTemplateId: '',
  emailJsUserId: '',
  emailJsAccessToken: '',
  alertsEnabled: true,
  theme: 'dark', // 'light', 'dark', 'system'
  autoRefreshEnabled: true,
  autoRefreshInterval: 24, // hours
};

// Web vitals thresholds (Google's Core Web Vitals thresholds)
export const VITALS_THRESHOLDS = {
  lcp: { good: 2.5, poor: 4.0 }, // seconds
  fcp: { good: 1.8, poor: 3.0 }, // seconds
  cls: { good: 0.1, poor: 0.25 }, // unitless
  ttfb: { good: 0.8, poor: 1.8 }, // seconds
  inp: { good: 200, poor: 500 }, // milliseconds
  performance: { good: 90, poor: 50 }, // score out of 100
  accessibility: { good: 90, poor: 50 }, // score out of 100
  bestPractices: { good: 90, poor: 50 }, // score out of 100
  seo: { good: 90, poor: 50 }, // score out of 100
};

/**
 * Get the status color for a metric value
 * @param {string} metric - The metric name
 * @param {number} value - The metric value
 * @returns {string} - Color class ('green', 'yellow', 'red')
 */
export function getMetricStatus(metric, value) {
  if (value === null || value === undefined) return 'gray';
  
  const threshold = VITALS_THRESHOLDS[metric];
  if (!threshold) return 'gray';
  
  // Performance scores (higher is better)
  if (metric === 'performance' || metric === 'accessibility' || metric === 'bestPractices' || metric === 'seo') {
    if (value >= threshold.good) return 'green';
    if (value >= threshold.poor) return 'yellow';
    return 'red';
  }
  
  // Core Web Vitals and other metrics (lower is better)
  if (value <= threshold.good) return 'green';
  if (value <= threshold.poor) return 'yellow';
  return 'red';
}

/**
 * Get tracked URLs from localStorage
 * @returns {Array} Array of URL objects
 */
export function getTrackedUrls() {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TRACKED_URLS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading tracked URLs:', error);
    return [];
  }
}

/**
 * Save tracked URLs to localStorage
 * @param {Array} urls - Array of URL objects
 */
export function saveTrackedUrls(urls) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.TRACKED_URLS, JSON.stringify(urls));
  } catch (error) {
    console.error('Error saving tracked URLs:', error);
  }
}

/**
 * Add a new URL to track
 * @param {string} url - The URL to track
 * @param {string} name - Display name for the URL
 * @returns {boolean} - Success status
 */
export function addTrackedUrl(url, name) {
  try {
    const urls = getTrackedUrls();
    const existingUrl = urls.find(u => u.url === url);
    
    if (existingUrl) {
      return false; // URL already exists
    }
    
    const newUrl = {
      id: Date.now().toString(),
      url,
      name: name || url,
      addedAt: new Date().toISOString(),
      lastChecked: null,
      isActive: true,
    };
    
    urls.push(newUrl);
    saveTrackedUrls(urls);
    return true;
  } catch (error) {
    console.error('Error adding tracked URL:', error);
    return false;
  }
}

/**
 * Remove a tracked URL
 * @param {string} id - URL ID to remove
 */
export function removeTrackedUrl(id) {
  try {
    const urls = getTrackedUrls();
    const filteredUrls = urls.filter(u => u.id !== id);
    saveTrackedUrls(filteredUrls);
    
    // Also remove associated vitals data
    const vitalsData = getVitalsData();
    delete vitalsData[id];
    saveVitalsData(vitalsData);
  } catch (error) {
    console.error('Error removing tracked URL:', error);
  }
}

/**
 * Get app settings from localStorage
 * @returns {Object} Settings object
 */
export function getSettings() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error reading settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save app settings to localStorage
 * @param {Object} settings - Settings object
 */
export function saveSettings(settings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

/**
 * Get vitals data for all URLs
 * @returns {Object} Vitals data organized by URL ID
 */
export function getVitalsData() {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.VITALS_DATA);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error reading vitals data:', error);
    return {};
  }
}

/**
 * Save vitals data
 * @param {Object} data - Vitals data object
 */
export function saveVitalsData(data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.VITALS_DATA, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving vitals data:', error);
  }
}

/**
 * Add new vitals data for a URL
 * @param {string} urlId - URL ID
 * @param {Object} vitalsResult - PageSpeed Insights result
 */
export function addVitalsDataPoint(urlId, vitalsResult) {
  try {
    const allData = getVitalsData();
    
    if (!allData[urlId]) {
      allData[urlId] = [];
    }
    
    const dataPoint = {
      timestamp: new Date().toISOString(),
      ...vitalsResult,
    };
    
    allData[urlId].push(dataPoint);
    
    // Keep only last 30 data points to avoid storage bloat
    if (allData[urlId].length > 30) {
      allData[urlId] = allData[urlId].slice(-30);
    }
    
    saveVitalsData(allData);
    
    // Update last checked time for the URL
    const urls = getTrackedUrls();
    const urlIndex = urls.findIndex(u => u.id === urlId);
    if (urlIndex !== -1) {
      urls[urlIndex].lastChecked = new Date().toISOString();
      saveTrackedUrls(urls);
    }
  } catch (error) {
    console.error('Error adding vitals data point:', error);
  }
}

/**
 * Get the latest vitals data for a URL
 * @param {string} urlId - URL ID
 * @returns {Object|null} Latest vitals data or null
 */
export function getLatestVitalsData(urlId) {
  try {
    const allData = getVitalsData();
    const urlData = allData[urlId];
    
    if (!urlData || urlData.length === 0) {
      return null;
    }
    
    return urlData[urlData.length - 1];
  } catch (error) {
    console.error('Error getting latest vitals data:', error);
    return null;
  }
}

/**
 * Check if vitals have degraded compared to previous measurement
 * @param {string} urlId - URL ID
 * @param {Object} newVitals - New vitals data
 * @returns {Array} Array of degraded metrics
 */
export function checkForDegradation(urlId, newVitals) {
  try {
    const allData = getVitalsData();
    const urlData = allData[urlId];
    
    if (!urlData || urlData.length < 2) {
      return []; // Need at least 2 data points to compare
    }
    
    const previousVitals = urlData[urlData.length - 2];
    const degradedMetrics = [];
    
    // Check each metric for degradation
    const metricsToCheck = ['lcp', 'fcp', 'cls', 'ttfb', 'inp'];
    
    metricsToCheck.forEach(metric => {
      const newValue = newVitals[metric];
      const previousValue = previousVitals[metric];
      
      if (newValue && previousValue) {
        const threshold = VITALS_THRESHOLDS[metric];
        
        // Check if metric crossed from good to poor threshold
        const wasGood = previousValue <= threshold.good;
        const isPoor = newValue > threshold.poor;
        
        // Or if there's a significant increase (>20% for time-based metrics, >50% for CLS)
        const significantIncrease = metric === 'cls' 
          ? newValue > previousValue * 1.5 
          : newValue > previousValue * 1.2;
        
        if ((wasGood && isPoor) || significantIncrease) {
          degradedMetrics.push({
            metric,
            previousValue,
            newValue,
            threshold: threshold.poor,
          });
        }
      }
    });
    
    // Check performance score degradation (decrease of 10+ points)
    if (newVitals.performance && previousVitals.performance) {
      const scoreDrop = previousVitals.performance - newVitals.performance;
      if (scoreDrop >= 10) {
        degradedMetrics.push({
          metric: 'performance',
          previousValue: previousVitals.performance,
          newValue: newVitals.performance,
          threshold: VITALS_THRESHOLDS.performance.poor,
        });
      }
    }
    
    return degradedMetrics;
  } catch (error) {
    console.error('Error checking for degradation:', error);
    return [];
  }
}

/**
 * Clear all stored data (useful for development/testing)
 */
export function clearAllData() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.TRACKED_URLS);
    localStorage.removeItem(STORAGE_KEYS.VITALS_DATA);
    // Keep settings intact
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}