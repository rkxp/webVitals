#!/usr/bin/env node

/**
 * Deployment Detector
 * Automatically detects deployment URLs from various platforms
 */

const https = require('https');

/**
 * Detect deployment URL based on platform and environment
 */
async function detectDeploymentUrl() {
  const platform = process.env.DEPLOYMENT_PLATFORM || 'auto';
  const environment = process.env.GITHUB_EVENT_NAME;
  const branch = process.env.GITHUB_REF_NAME;
  const prNumber = process.env.PR_NUMBER;
  
  console.log(`🔍 Detecting deployment URL for platform: ${platform}, environment: ${environment}`);
  
  switch (platform.toLowerCase()) {
    case 'vercel':
      return await detectVercelUrl();
    case 'netlify':
      return await detectNetlifyUrl();
    case 'github-pages':
      return detectGitHubPagesUrl();
    case 'heroku':
      return detectHerokuUrl();
    case 'cloudflare-pages':
      return await detectCloudflareUrl();
    case 'auto':
    default:
      return await autoDetectDeploymentUrl();
  }
}

/**
 * Auto-detect deployment platform and URL
 */
async function autoDetectDeploymentUrl() {
  console.log('🤖 Auto-detecting deployment platform...');
  
  // Check for Vercel
  if (process.env.VERCEL_URL || process.env.VERCEL_TOKEN) {
    return await detectVercelUrl();
  }
  
  // Check for Netlify
  if (process.env.NETLIFY_SITE_ID || process.env.NETLIFY_AUTH_TOKEN) {
    return await detectNetlifyUrl();
  }
  
  // Check for GitHub Pages
  if (process.env.GITHUB_PAGES_URL) {
    return detectGitHubPagesUrl();
  }
  
  // Check for Heroku
  if (process.env.HEROKU_APP_NAME) {
    return detectHerokuUrl();
  }
  
  // Check for Cloudflare Pages
  if (process.env.CF_PAGES_URL || process.env.CLOUDFLARE_API_TOKEN) {
    return await detectCloudflareUrl();
  }
  
  // Fallback to production URL
  return process.env.PRODUCTION_URL || 'https://webvitals.contentstackapps.com/';
}

/**
 * Detect Vercel deployment URL
 */
async function detectVercelUrl() {
  console.log('🔺 Detecting Vercel deployment...');
  
  const vercelToken = process.env.VERCEL_TOKEN;
  const vercelProject = process.env.VERCEL_PROJECT || 'webVitals';
  
  if (!vercelToken || !vercelProject) {
    console.log('⚠️ Vercel token or project not configured, using fallback URL');
    return process.env.VERCEL_URL || process.env.PRODUCTION_URL;
  }
  
  try {
    const response = await makeHttpRequest(
      `https://api.vercel.com/v6/deployments?projectId=${vercelProject}&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.deployments && response.deployments.length > 0) {
      const deployment = response.deployments[0];
      const url = `https://${deployment.url}`;
      console.log(`✅ Found Vercel deployment: ${url}`);
      return url;
    }
  } catch (error) {
    console.log(`❌ Failed to fetch Vercel deployment: ${error.message}`);
  }
  
  return process.env.VERCEL_URL || process.env.PRODUCTION_URL;
}

/**
 * Detect Netlify deployment URL
 */
async function detectNetlifyUrl() {
  console.log('🌐 Detecting Netlify deployment...');
  
  const netlifyToken = process.env.NETLIFY_AUTH_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;
  
  if (!netlifyToken || !siteId) {
    console.log('⚠️ Netlify token or site ID not configured, using fallback URL');
    return process.env.NETLIFY_URL || process.env.PRODUCTION_URL;
  }
  
  try {
    const response = await makeHttpRequest(
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys?per_page=1`,
      {
        headers: {
          'Authorization': `Bearer ${netlifyToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response && response.length > 0) {
      const deployment = response[0];
      const url = deployment.ssl_url || deployment.url;
      console.log(`✅ Found Netlify deployment: ${url}`);
      return url;
    }
  } catch (error) {
    console.log(`❌ Failed to fetch Netlify deployment: ${error.message}`);
  }
  
  return process.env.NETLIFY_URL || process.env.PRODUCTION_URL;
}

/**
 * Detect GitHub Pages URL
 */
function detectGitHubPagesUrl() {
  console.log('📄 Detecting GitHub Pages deployment...');
  
  const repository = process.env.GITHUB_REPOSITORY;
  const [owner, repo] = repository?.split('/') || ['', ''];
  
  if (!owner || !repo) {
    return process.env.GITHUB_PAGES_URL || process.env.PRODUCTION_URL;
  }
  
  // Standard GitHub Pages URL format
  const url = `https://${owner}.github.io/${repo}`;
  console.log(`✅ GitHub Pages URL: ${url}`);
  return url;
}

/**
 * Detect Heroku deployment URL
 */
function detectHerokuUrl() {
  console.log('🟣 Detecting Heroku deployment...');
  
  const appName = process.env.HEROKU_APP_NAME;
  
  if (!appName) {
    return process.env.HEROKU_URL || process.env.PRODUCTION_URL;
  }
  
  const url = `https://${appName}.herokuapp.com`;
  console.log(`✅ Heroku URL: ${url}`);
  return url;
}

/**
 * Detect Cloudflare Pages URL
 */
async function detectCloudflareUrl() {
  console.log('☁️ Detecting Cloudflare Pages deployment...');
  
  const cfToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const projectName = process.env.CF_PAGES_PROJECT || 'webVitals';
  
  if (!cfToken || !accountId || !projectName) {
    console.log('⚠️ Cloudflare credentials not configured, using fallback URL');
    return process.env.CF_PAGES_URL || process.env.PRODUCTION_URL;
  }
  
  try {
    const response = await makeHttpRequest(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments?per_page=1`,
      {
        headers: {
          'Authorization': `Bearer ${cfToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.result && response.result.length > 0) {
      const deployment = response.result[0];
      const url = deployment.url;
      console.log(`✅ Found Cloudflare Pages deployment: ${url}`);
      return url;
    }
  } catch (error) {
    console.log(`❌ Failed to fetch Cloudflare deployment: ${error.message}`);
  }
  
  return process.env.CF_PAGES_URL || process.env.PRODUCTION_URL;
}

/**
 * Wait for deployment to be ready
 */
async function waitForDeployment(url, maxWaitTime = 300000, checkInterval = 10000) {
  console.log(`⏳ Waiting for deployment to be ready: ${url}`);
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await makeHttpRequest(url, { timeout: 10000 });
      
      if (response || response === '') {
        console.log(`✅ Deployment is ready: ${url}`);
        return true;
      }
    } catch (error) {
      console.log(`⏳ Deployment not ready yet, waiting... (${error.message})`);
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  console.log(`⚠️ Deployment readiness check timed out after ${maxWaitTime}ms`);
  return false;
}

/**
 * HTTP request helper
 */
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
    request.setTimeout(options.timeout || 30000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
    
    request.end();
  });
}

/**
 * Main function
 */
async function main() {
  try {
    const deploymentUrl = await detectDeploymentUrl();
    
    if (!deploymentUrl) {
      throw new Error('No deployment URL could be detected or configured');
    }
    
    console.log(`🎯 Final deployment URL: ${deploymentUrl}`);
    
    // Wait for deployment to be ready
    const isReady = await waitForDeployment(deploymentUrl);
    
    if (!isReady) {
      console.log('⚠️ Proceeding with performance testing despite readiness check timeout');
    }
    
    // Export URL for use in other scripts
    console.log(`DEPLOYMENT_URL=${deploymentUrl}`);
    
    return deploymentUrl;
    
  } catch (error) {
    console.error(`❌ Deployment detection failed: ${error.message}`);
    process.exit(1);
  }
}

// Export functions for testing
module.exports = {
  detectDeploymentUrl,
  detectVercelUrl,
  detectNetlifyUrl,
  detectGitHubPagesUrl,
  detectHerokuUrl,
  detectCloudflareUrl,
  waitForDeployment
};

// Run if called directly
if (require.main === module) {
  main();
}