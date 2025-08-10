#!/usr/bin/env node

/**
 * Comprehensive Lighthouse System Validator
 * Tests all components, APIs, and edge cases
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 LIGHTHOUSE SYSTEM VALIDATOR');
console.log('===============================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(description, testFn) {
  totalTests++;
  try {
    const result = testFn();
    if (result === true || result === undefined) {
      console.log(`✅ ${description}`);
      passedTests++;
    } else {
      console.log(`❌ ${description}: ${result}`);
      failedTests++;
    }
  } catch (error) {
    console.log(`❌ ${description}: ${error.message}`);
    failedTests++;
  }
}

// Test 1: Configuration Files
console.log('📋 CONFIGURATION VALIDATION\n');

test('lighthouserc.js exists and is valid', () => {
  const configPath = path.join(__dirname, 'lighthouserc.js');
  if (!fs.existsSync(configPath)) {
    return 'Configuration file not found';
  }
  
  try {
    const config = require(configPath);
    if (!config.ci || !config.ci.collect || !config.ci.assert) {
      return 'Invalid configuration structure';
    }
    return true;
  } catch (error) {
    return `Configuration syntax error: ${error.message}`;
  }
});

test('package.json has required dependencies', () => {
  const packagePath = path.join(__dirname, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const required = ['@lhci/cli', 'adm-zip'];
  const missing = required.filter(dep => 
    !pkg.dependencies?.[dep] && !pkg.devDependencies?.[dep]
  );
  
  if (missing.length > 0) {
    return `Missing dependencies: ${missing.join(', ')}`;
  }
  return true;
});

test('GitHub workflow exists', () => {
  const workflowPath = path.join(__dirname, '.github/workflows/lighthouse.yml');
  if (!fs.existsSync(workflowPath)) {
    return 'Lighthouse workflow file not found';
  }
  
  const content = fs.readFileSync(workflowPath, 'utf8');
  if (!content.includes('lighthouse-ci') && !content.includes('lhci autorun')) {
    return 'Workflow does not contain Lighthouse CI commands';
  }
  return true;
});

test('Change detection script exists and is executable', () => {
  const scriptPath = path.join(__dirname, 'scripts/get-changed-pages.sh');
  if (!fs.existsSync(scriptPath)) {
    return 'Change detection script not found';
  }
  
  const stats = fs.statSync(scriptPath);
  if (!(stats.mode & parseInt('100', 8))) {
    return 'Script is not executable';
  }
  return true;
});

// Test 2: API Endpoints Structure
console.log('\n🔌 API ENDPOINT VALIDATION\n');

test('GitHub reports API endpoint exists', () => {
  const apiPath = path.join(__dirname, 'src/app/api/github-lighthouse-reports/route.js');
  if (!fs.existsSync(apiPath)) {
    return 'API endpoint file not found';
  }
  
  const content = fs.readFileSync(apiPath, 'utf8');
  if (!content.includes('export async function GET')) {
    return 'GET handler not found';
  }
  return true;
});

test('Artifact extraction API exists', () => {
  const extractPath = path.join(__dirname, 'src/app/api/github-lighthouse-reports/extract/[artifact_id]/route.js');
  if (!fs.existsSync(extractPath)) {
    return 'Extract API endpoint not found';
  }
  return true;
});

test('Download API exists', () => {
  const downloadPath = path.join(__dirname, 'src/app/api/github-lighthouse-reports/download/[artifact_id]/route.js');
  if (!fs.existsSync(downloadPath)) {
    return 'Download API endpoint not found';
  }
  return true;
});

// Test 3: Component Structure
console.log('\n🧩 COMPONENT VALIDATION\n');

test('LighthouseReports component exists', () => {
  const componentPath = path.join(__dirname, 'src/components/LighthouseReports.js');
  if (!fs.existsSync(componentPath)) {
    return 'LighthouseReports component not found';
  }
  
  const content = fs.readFileSync(componentPath, 'utf8');
  if (!content.includes('fetchGithubReports') || !content.includes('useState')) {
    return 'Component structure appears incomplete';
  }
  return true;
});

test('WebVitalsApp includes LighthouseReports', () => {
  const appPath = path.join(__dirname, 'src/components/WebVitalsApp.js');
  if (!fs.existsSync(appPath)) {
    return 'WebVitalsApp component not found';
  }
  
  const content = fs.readFileSync(appPath, 'utf8');
  if (!content.includes('LighthouseReports')) {
    return 'LighthouseReports not imported/used in main app';
  }
  return true;
});

// Test 4: Environment Setup
console.log('\n🔧 ENVIRONMENT VALIDATION\n');

test('Environment variables documented', () => {
  const setupPath = path.join(__dirname, '.github/GITHUB_INTEGRATION_SETUP.md');
  if (!fs.existsSync(setupPath)) {
    return 'Setup documentation not found';
  }
  
  const content = fs.readFileSync(setupPath, 'utf8');
  if (!content.includes('GITHUB_TOKEN') || !content.includes('GITHUB_REPOSITORY')) {
    return 'Environment variables not properly documented';
  }
  return true;
});

test('Dynamic routes mapping exists', () => {
  const mappingPath = path.join(__dirname, 'dynamic-routes-map.json');
  if (!fs.existsSync(mappingPath)) {
    return 'Dynamic routes mapping file not found';
  }
  
  try {
    const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    if (typeof mapping !== 'object' || Object.keys(mapping).length === 0) {
      return 'Invalid or empty dynamic routes mapping';
    }
    return true;
  } catch (error) {
    return `Invalid JSON in dynamic routes mapping: ${error.message}`;
  }
});

// Test 5: Workflow Quality Gates
console.log('\n🚦 QUALITY GATES VALIDATION\n');

test('Quality gates are configured as errors (blocking)', () => {
  const config = require('./lighthouserc.js');
  const assertions = config.ci.assert.assertions;
  
  const categories = ['categories:performance', 'categories:accessibility', 'categories:best-practices', 'categories:seo'];
  const nonBlocking = categories.filter(cat => 
    !assertions[cat] || assertions[cat][0] !== 'error'
  );
  
  if (nonBlocking.length > 0) {
    return `Non-blocking assertions found: ${nonBlocking.join(', ')}`;
  }
  return true;
});

test('Workflow handles artifacts upload on failure', () => {
  const workflowPath = path.join(__dirname, '.github/workflows/lighthouse.yml');
  const content = fs.readFileSync(workflowPath, 'utf8');
  
  if (!content.includes('if: always()') || !content.includes('upload-artifact')) {
    return 'Workflow does not guarantee artifact upload on failure';
  }
  return true;
});

// Summary
console.log('\n📊 TEST RESULTS');
console.log('================');
console.log(`Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);

if (failedTests === 0) {
  console.log('\n🎉 ALL TESTS PASSED! Your Lighthouse system is properly configured.');
} else {
  console.log(`\n⚠️  ${failedTests} test(s) failed. Please fix the issues above.`);
  process.exit(1);
}

console.log('\n🚀 RECOMMENDATIONS:');
console.log('==================');
console.log('1. Set up environment variables (.env.local):');
console.log('   - GITHUB_TOKEN=your_github_token');
console.log('   - GITHUB_REPOSITORY_OWNER=your_username');
console.log('   - GITHUB_REPOSITORY_NAME=your_repo_name');
console.log('');
console.log('2. Test the system:');
console.log('   - Make a small code change');
console.log('   - Push to trigger Lighthouse CI');
console.log('   - Check your dashboard at http://localhost:3000');
console.log('');
console.log('3. Monitor quality gates:');
console.log('   - Performance: ≥60%');
console.log('   - Accessibility: ≥80%');
console.log('   - Best Practices: ≥70%');
console.log('   - SEO: ≥70%');
