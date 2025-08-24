/**
 * Contentstack CMS integration for dynamic content management
 */

import Contentstack from 'contentstack';

// Contentstack configuration
const CONTENTSTACK_CONFIG = {
  api_key: process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY || '',
  delivery_token: process.env.NEXT_PUBLIC_CONTENTSTACK_DELIVERY_TOKEN || '',
  environment: process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT || 'development',
  region: process.env.NEXT_PUBLIC_CONTENTSTACK_REGION || 'us', // 'us', 'eu', 'azure-na', 'azure-eu', 'gcp-na'
};

// Map environment region to Contentstack region
const getContentstackRegion = (envRegion) => {
  switch (envRegion?.toUpperCase()) {
    case 'NA':
    case 'US':
      return 'us';
    case 'EU':
      return 'eu';
    case 'AZURE-NA':
      return 'azure-na';
    case 'AZURE-EU':
      return 'azure-eu';
    case 'GCP-NA':
      return 'gcp-na';
    default:
      return 'us';
  }
};

// Initialize Contentstack Stack
let Stack = null;

if (typeof window !== 'undefined' && CONTENTSTACK_CONFIG.api_key && CONTENTSTACK_CONFIG.delivery_token) {
  try {
    const mappedRegion = getContentstackRegion(CONTENTSTACK_CONFIG.region);
    console.log('🌍 Contentstack region mapping:', CONTENTSTACK_CONFIG.region, '→', mappedRegion);
    
    Stack = Contentstack.Stack({
      api_key: CONTENTSTACK_CONFIG.api_key,
      delivery_token: CONTENTSTACK_CONFIG.delivery_token,
      environment: CONTENTSTACK_CONFIG.environment,
      region: mappedRegion,
    });
  } catch (error) {
    console.error('Failed to initialize Contentstack:', error);
  }
}

/**
 * Fetch header content from Contentstack
 * @returns {Promise<Object>} Header content data
 */
export async function fetchHeaderContent() {
  if (!Stack) {
    console.warn('Contentstack not initialized, using fallback content');
    return getHeaderFallback();
  }

  try {
    console.log('🔍 Fetching header content from Contentstack...');
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Contentstack API timeout')), 5000);
    });
    
    const Query = Stack.ContentType('header').Query();
    const fetchPromise = Query.toJSON().find();
    
    const result = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (result[0] && result[0].length > 0) {
      console.log('✅ Header content fetched successfully');
      return result[0][0]; // First entry
    }
    
    console.log('⚠️ No header content found, using fallback');
    return getHeaderFallback();
  } catch (error) {
    console.error('❌ Error fetching header content from Contentstack:', error);
    console.log('🔄 Falling back to default header content');
    return getHeaderFallback();
  }
}

/**
 * Fetch footer content from Contentstack
 * @returns {Promise<Object>} Footer content data
 */
export async function fetchFooterContent() {
  if (!Stack) {
    console.warn('Contentstack not initialized, using fallback content');
    return getFooterFallback();
  }

  try {
    console.log('🔍 Fetching footer content from Contentstack...');
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Contentstack API timeout')), 5000);
    });
    
    const Query = Stack.ContentType('footer').Query();
    const fetchPromise = Query.toJSON().find();
    
    const result = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (result[0] && result[0].length > 0) {
      console.log('✅ Footer content fetched successfully');
      return result[0][0]; // First entry
    }
    
    console.log('⚠️ No footer content found, using fallback');
    return getFooterFallback();
  } catch (error) {
    console.error('❌ Error fetching footer content from Contentstack:', error);
    console.log('🔄 Falling back to default footer content');
    return getFooterFallback();
  }
}

/**
 * Fallback header content when CMS is unavailable
 */
function getHeaderFallback() {
  return {
    title: 'Performance Dashboard',
    subtitle: 'Lighthouse CI & Web Vitals monitoring',
    modal_title: 'Performance Dashboard',
    modal_subtitle: 'Monitor Core Web Vitals & Lighthouse CI performance',
    api_key_tooltip: 'For Web Vitals monitoring via PageSpeed Insights',
    settings_aria_label: 'Open settings modal',
    updated_at: new Date().toISOString(),
  };
}

/**
 * Fallback footer content when CMS is unavailable
 */
function getFooterFallback() {
  return {
    main_title: 'Performance Dashboard',
    main_description: 'Monitor your website\'s Core Web Vitals and Lighthouse CI performance. Track performance, diagnose issues, and optimize user experience with actionable insights.',
    features: [
      {
        title: 'Automated Lighthouse CI',
        description: 'GitHub Actions integration for continuous performance monitoring'
      },
      {
        title: 'Real-time Web Vitals',
        description: 'Live Core Web Vitals tracking via Google PageSpeed Insights'
      },
      {
        title: 'Workflow Artifacts',
        description: 'Historical tracking and detailed performance reports'
      }
    ],
    information_title: 'Information',
    information_items: [
      {
        label: 'Lighthouse CI',
        value: 'GitHub Actions automation'
      },
      {
        label: 'Web Vitals API',
        value: 'Google PageSpeed Insights'
      },
      {
        label: 'Monitoring',
        value: 'Dual monitoring approach'
      }
    ],
    copyright: 'Built with Next.js, Lighthouse CI & GitHub Actions',
    status: 'Lighthouse CI enabled',
    updated_at: new Date().toISOString(),
  };
}

/**
 * Check if Contentstack is properly configured
 * @returns {boolean} True if Contentstack is configured
 */
export function isContentstackConfigured() {
  return !!(CONTENTSTACK_CONFIG.api_key && CONTENTSTACK_CONFIG.delivery_token);
}

/**
 * Get Contentstack configuration status
 * @returns {Object} Configuration status and details
 */
export function getContentstackStatus() {
  return {
    configured: isContentstackConfigured(),
    api_key: !!CONTENTSTACK_CONFIG.api_key,
    delivery_token: !!CONTENTSTACK_CONFIG.delivery_token,
    environment: CONTENTSTACK_CONFIG.environment,
    region: CONTENTSTACK_CONFIG.region,
    stack_initialized: !!Stack,
  };
}

/**
 * Test Contentstack connection
 * @returns {Promise<Object>} Connection test result
 */
export async function testContentstackConnection() {
  if (!Stack) {
    return {
      success: false,
      error: 'Contentstack not initialized. Check API key and delivery token.',
      status: getContentstackStatus(),
    };
  }

  try {
    // Try to fetch content types to test connection
    const Query = Stack.ContentType('header').Query();
    await Query.toJSON().find();
    
    return {
      success: true,
      message: 'Contentstack connection successful',
      status: getContentstackStatus(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to connect to Contentstack',
      status: getContentstackStatus(),
    };
  }
}

export default {
  fetchHeaderContent,
  fetchFooterContent,
  isContentstackConfigured,
  getContentstackStatus,
  testContentstackConnection,
};
