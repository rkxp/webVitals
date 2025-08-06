# Web Vitals Monitor - GitHub Integration Setup Guide

This guide will help you set up automated Web Vitals monitoring that runs on every merge to the main branch.

## 🚀 Features

- **Automated Performance Monitoring**: Runs on every push to main branch
- **Pull Request Analysis**: Performance checks on every PR
- **Performance Regression Detection**: Automatically detects and flags performance regressions
- **PR Comments**: Detailed performance reports posted as PR comments
- **Slack Notifications**: Optional Slack alerts for performance regressions
- **Historical Tracking**: Maintains performance history over time
- **Lighthouse Integration**: Comprehensive performance analysis

## 📋 Prerequisites

1. **Google PageSpeed Insights API Key**
2. **GitHub Repository with Actions enabled**
3. **Website URLs to monitor** (production and/or staging)
4. **Optional**: Slack webhook for notifications

## ⚙️ Setup Instructions

### 1. Get Google PageSpeed Insights API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the PageSpeed Insights API
4. Create credentials (API Key)
5. Copy the API key for later use

### 2. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

#### Required Secrets:
```
GOOGLE_PSI_API_KEY=your_google_psi_api_key_here
```

#### Optional Secrets:
```
SLACK_WEBHOOK_URL=your_slack_webhook_url_here
LHCI_GITHUB_APP_TOKEN=your_lighthouse_ci_token_here
LHCI_TOKEN=your_lighthouse_ci_server_token_here
```

### 3. Configure Repository Variables

Go to your GitHub repository → Settings → Secrets and variables → Actions → Variables

#### Required Variables:
```
PRODUCTION_URL=https://your-production-website.com
```

#### Optional Variables:
```
STAGING_URL=https://staging-your-website.com
PERFORMANCE_THRESHOLD_LCP=2.5
PERFORMANCE_THRESHOLD_CLS=0.1
PERFORMANCE_THRESHOLD_INP=200
```

### 4. Environment Configuration

Create a `.env.example` file in your repository root:

```bash
# Google PageSpeed Insights API
GOOGLE_PSI_API_KEY=your_api_key_here

# Website URLs
PRODUCTION_URL=https://your-website.com
STAGING_URL=https://staging-your-website.com

# Performance Thresholds
PERFORMANCE_THRESHOLD_LCP=2.5
PERFORMANCE_THRESHOLD_CLS=0.1
PERFORMANCE_THRESHOLD_INP=200

# Optional: Slack Integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Optional: Lighthouse CI
LHCI_GITHUB_APP_TOKEN=your_token_here
LHCI_TOKEN=your_server_token_here
```

## 🔧 Workflow Configuration

The GitHub Actions workflow (`web-vitals-monitoring.yml`) will:

### Triggers:
- **Push to main branch**: Monitor production deployment
- **Pull requests**: Analyze staging/preview deployments
- **Manual dispatch**: On-demand monitoring with custom URL
- **Scheduled**: Every 6 hours for continuous monitoring

### Actions Performed:
1. **Setup Environment**: Install Node.js and dependencies
2. **Wait for Deployment**: Allow time for deployment to complete
3. **Run Performance Analysis**: Execute Web Vitals monitoring script
4. **Generate Reports**: Create detailed performance reports
5. **Comment on PR**: Post performance results as PR comment
6. **Upload Artifacts**: Save reports for historical reference
7. **Fail on Regression**: Mark build as failed if performance regresses
8. **Send Notifications**: Alert team via Slack if configured

## 📊 Performance Report Format

### PR Comment Example:
```markdown
## 🚀 Web Vitals Performance Report

### Performance Summary
- **Performance Score**: 92/100
- **LCP**: 1.8s ✅
- **CLS**: 0.05 ✅
- **INP**: 150ms ✅

### ⚠️ Performance Regressions Detected
- **LCP**: +0.3s (significant)
- **Performance Score**: -5 points (minor)

### 🎉 Performance Improvements
- **CLS**: -0.02 (minor)

### 📊 Detailed Report
- **Accessibility**: 98/100
- **Best Practices**: 95/100
- **SEO**: 100/100

[View Lighthouse Report](https://storage.googleapis.com/lighthouse-reports/...)

*Report generated on: 2024-01-15T10:30:00.000Z*
```

## 🎯 Performance Thresholds

### Core Web Vitals Thresholds:
- **LCP (Largest Contentful Paint)**: ≤ 2.5s (Good), ≤ 4.0s (Needs Improvement), > 4.0s (Poor)
- **CLS (Cumulative Layout Shift)**: ≤ 0.1 (Good), ≤ 0.25 (Needs Improvement), > 0.25 (Poor)
- **INP (Interaction to Next Paint)**: ≤ 200ms (Good), ≤ 500ms (Needs Improvement), > 500ms (Poor)

### Lighthouse Scores:
- **Performance**: ≥ 90 (Good), ≥ 50 (Needs Improvement), < 50 (Poor)
- **Accessibility**: ≥ 90 (Good)
- **Best Practices**: ≥ 80 (Good)
- **SEO**: ≥ 80 (Good)

## 🔄 Local Testing

### Run monitoring locally:
```bash
# Set environment variables
export GOOGLE_PSI_API_KEY="your_api_key"
export PRODUCTION_URL="https://your-website.com"

# Run monitoring script
npm run monitor

# Run Lighthouse CI
npm run lighthouse:ci

# Run both performance tests
npm run performance:test
```

### Analyze specific URL:
```bash
# Set custom URL and run
export INPUT_URL="https://specific-page.com"
npm run monitor
```

## 📈 Interpreting Results

### Performance Regression Detection:
- **Significant**: > 10% change in Core Web Vitals or > 5 points in Lighthouse scores
- **Minor**: 5-10% change in metrics
- **Action Required**: Significant regressions will fail the CI build

### Historical Tracking:
- Last 50 performance runs are stored in `web-vitals-history.json`
- Baseline comparison uses the most recent successful run
- Trends can be analyzed over time

## 🚨 Troubleshooting

### Common Issues:

#### 1. API Rate Limits
- Google PSI API has rate limits (25,000 requests/day free tier)
- Solution: Reduce monitoring frequency or upgrade API quota

#### 2. Deployment Timing
- Tests might run before deployment is complete
- Solution: Adjust wait time in workflow or add deployment hooks

#### 3. Inconsistent Results
- Network conditions can affect results
- Solution: Lighthouse CI runs multiple tests and averages results

#### 4. Missing Permissions
- GitHub Actions needs proper permissions for PR comments
- Solution: Ensure `GITHUB_TOKEN` has appropriate permissions

### Debug Mode:
Enable debug logging by setting in workflow:
```yaml
env:
  DEBUG: true
```

## 🔐 Security Considerations

- **API Keys**: Store in GitHub Secrets, never commit to code
- **Webhook URLs**: Use GitHub Secrets for Slack webhooks
- **Permissions**: Limit GitHub token permissions to minimum required
- **Public Reports**: Lighthouse reports may be publicly accessible

## 📚 Additional Resources

- [Google PageSpeed Insights API Documentation](https://developers.google.com/speed/docs/insights/v5/get-started)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Core Web Vitals Guide](https://web.dev/vitals/)

## 🎉 What's Next?

After setup, you'll have:
- ✅ Automated performance monitoring on every deployment
- ✅ Performance regression detection and prevention
- ✅ Detailed performance reports in PR comments
- ✅ Historical performance tracking
- ✅ Team notifications for performance issues
- ✅ Continuous optimization workflow

Your development team will be notified of performance issues before they reach production, enabling proactive performance optimization!