# Web Vitals Monitor

A comprehensive frontend-only web application built with Next.js and Tailwind CSS that provides enterprise-grade monitoring of Core Web Vitals for multiple websites using Google PageSpeed Insights API.

## ✨ Key Features

### 🌐 **Multi-URL Management**
- Add and monitor unlimited websites
- Domain-based organization and grouping
- Individual and bulk refresh capabilities
- URL health status at a glance

### 📊 **Comprehensive Performance Analytics**
- **Core Web Vitals**: LCP, FCP, CLS, TTFB, and INP tracking
- **Performance Metrics**: Speed Index, Total Blocking Time, Server Response Time
- **Quality Scores**: Performance, Accessibility, Best Practices, SEO (0-100)
- **Real-time Assessment**: Automatic Core Web Vitals evaluation with pass/fail status

### 🔍 **Advanced Performance Diagnosis**
- **AI-powered Issue Detection**: Identifies critical, moderate, and optimization opportunities
- **Detailed Recommendations**: Actionable improvement suggestions for each issue
- **Performance Bottleneck Analysis**: Pinpoints exact causes of poor performance
- **Priority Action Plans**: Guided remediation steps ranked by impact

### 📈 **Data Visualization & Insights**
- **Interactive Trend Charts**: Historical performance visualization with time-based filtering
- **Comparative Analysis**: Side-by-side metric comparisons
- **Portfolio Dashboard**: Aggregate performance overview across all monitored sites
- **Progress Tracking**: Monitor improvements over time

### 🎛️ **Dual View Modes**
- **Individual View**: Detailed per-site analysis with complete metric breakdown
- **Domain View**: Organized by domain with collapsible site details
- **Consistent Interface**: Same comprehensive features available in both views

### 🔄 **Intelligent Automation**
- **Auto-Refresh**: Scheduled 24-hour updates for all monitored sites
- **Smart Degradation Detection**: Automatic identification of performance regressions
- **Batch Processing**: Efficient bulk updates with rate limiting
- **Background Monitoring**: Passive performance tracking

### 🚨 **Multi-Channel Alerting**
- **Slack Integration**: Real-time notifications via webhooks
- **Email Alerts**: Detailed performance reports via EmailJS
- **Threshold-based Triggers**: Customizable alert conditions
- **Alert History**: Track notification history and responses

### 🎨 **Premium User Experience**
- **Dark/Light Themes**: Adaptive UI with system preference detection
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Collapsible Interface**: Clean, organized data presentation
- **Accessibility**: WCAG compliant with keyboard navigation
- **Smooth Animations**: Professional transitions and micro-interactions

### 💾 **Data Management**
- **Local Storage**: Complete browser-based data persistence
- **Export/Import**: Backup and restore configurations
- **Data Retention**: Intelligent historical data management (30 data points per URL)
- **Privacy-First**: No server storage or data collection

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Google PageSpeed Insights API key
- (Optional) Slack webhook URL for alerts
- (Optional) EmailJS account for email alerts

### Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Configuration

1. **Click the Settings button** (gear icon) in the top-right corner
2. **Configure Google PageSpeed Insights API**:
   - Get an API key from [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the PageSpeed Insights API
   - Add the API key in settings
   - Click "Test" to verify

3. **Configure Slack Alerts** (Optional):
   - Create an Incoming Webhook in your Slack workspace
   - Add the webhook URL in settings
   - Click "Test" to verify

4. **Configure Email Alerts** (Optional):
   - Create an account at [EmailJS](https://www.emailjs.com/)
   - Set up an email service (Gmail, Outlook, etc.)
   - Create an email template using the provided template content
   - Add Service ID, Template ID, and Public Key in settings
   - Click "Test Email" to verify

## 🚀 Usage Guide

### Adding Websites

1. **Enter a website URL** (e.g., `https://example.com`)
2. **Add a display name** (optional but recommended)
3. **Click "Add URL"** to start monitoring

### Dashboard Interface

#### **View Mode Selection**
- **Individual View**: Full-featured analysis for each website separately
- **Domain View**: Organized by domain with expandable site details
- Toggle between views using the **Individual/By Domain** buttons

#### **Navigation & Controls**
- **Expand/Collapse**: Click chevron icons to show/hide detailed metrics
- **Refresh Options**: Individual site refresh or bulk "Refresh All Sites"
- **Quick Actions**: View trends, delete sites, or refresh specific domains

### Performance Monitoring

#### **Core Web Vitals Assessment**
Each site displays a comprehensive assessment with:
- **Overall Status**: Good, Needs Improvement, or Poor
- **Individual Metrics**: Color-coded status for LCP, CLS, INP
- **Pass/Fail Summary**: Clear indication of Core Web Vitals compliance

#### **Complete Metrics Dashboard**
Organized into three categories:

**🎯 Core Web Vitals**
- **LCP (Largest Contentful Paint)**: Loading performance
  - Good: ≤2.5s, Needs Improvement: ≤4.0s, Poor: >4.0s
- **CLS (Cumulative Layout Shift)**: Visual stability
  - Good: ≤0.1, Needs Improvement: ≤0.25, Poor: >0.25
- **INP (Interaction to Next Paint)**: Responsiveness
  - Good: ≤200ms, Needs Improvement: ≤500ms, Poor: >500ms

**⚡ Performance & Loading**
- **FCP (First Contentful Paint)**: Good: ≤1.8s, Poor: >3.0s
- **TTFB (Time to First Byte)**: Good: ≤0.8s, Poor: >1.8s
- **Speed Index**: Content rendering speed
- **Total Blocking Time**: Main thread blocking time

**🏆 Quality & Best Practices**
- **Performance Score**: Overall Lighthouse performance (0-100)
- **Accessibility**: Accessibility compliance score (0-100)
- **Best Practices**: Code quality and security score (0-100)
- **SEO**: Search engine optimization score (0-100)

### Advanced Features

#### **Performance Diagnosis**
- **Automatic Issue Detection**: Identifies performance bottlenecks
- **Severity Classification**: Critical, Moderate, or Opportunity
- **Actionable Recommendations**: Specific improvement suggestions
- **Priority Guidance**: Ranked action plan for maximum impact

#### **Trend Analysis**
- **Historical Charts**: Interactive time-based performance visualization
- **Progress Tracking**: Monitor improvements over time
- **Comparative Analysis**: Identify patterns and trends

#### **Smart Alerts**
The application automatically:
- **Monitors Degradation**: Detects performance regressions
- **Sends Notifications**: Via Slack or email when issues arise
- **Schedules Updates**: Auto-refreshes all sites every 24 hours
- **Tracks Improvements**: Celebrates performance gains

## Technology Stack

- **Next.js 15**: React framework with App Router
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: Interactive charts for data visualization
- **Lucide React**: Beautiful icons
- **EmailJS**: Client-side email sending
- **Google PageSpeed Insights API**: Performance data source

## Data Storage

All data is stored locally in your browser using localStorage:
- Website URLs and configurations
- Historical vitals data (last 30 data points per URL)
- User settings and API keys
- Theme preferences

## API Limits

Google PageSpeed Insights API has usage limits:
- **Free tier**: 25,000 queries per day
- **Rate limit**: ~400 queries per 100 seconds
- The app includes rate limiting (2-second delays between requests)

## Development

### Project Structure

```
src/
├── app/
│   ├── layout.js          # Root layout with theme provider
│   ├── page.js            # Main page component
│   └── globals.css        # Global styles, CSS variables & animations
├── components/
│   ├── Header.js          # Header with theme toggle, settings & add URL
│   ├── Footer.js          # Footer with app info and version
│   ├── VitalsDashboard.js # Advanced dashboard with dual view modes
│   │                      # - Individual & Domain views
│   │                      # - Complete performance metrics
│   │                      # - Core Web Vitals assessment
│   │                      # - Performance diagnosis
│   │                      # - Collapsible interface
│   ├── VitalsChart.js     # Interactive trend charts with filtering
│   ├── Settings.js        # Comprehensive configuration modal
│   └── WebVitalsApp.js    # Main orchestration component
├── context/
│   └── ThemeContext.js    # Theme management (dark/light/system)
└── lib/
    ├── storage.js         # Advanced localStorage with data management
    ├── psi-api.js         # Enhanced PageSpeed Insights integration
    └── alerts.js          # Multi-channel notification system
```

### Enhanced Architecture Features

#### **Component Design**
- **Modular Components**: Reusable, focused component architecture
- **State Management**: Efficient React state with optimized re-renders
- **Performance Optimized**: Lazy loading and memoization where appropriate
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints

#### **Data Flow**
- **Centralized State**: Main app state managed in WebVitalsApp.js
- **Local Storage**: Persistent data with intelligent caching
- **API Integration**: Rate-limited PageSpeed Insights requests
- **Real-time Updates**: Live UI updates during data refresh

#### **User Interface**
- **Progressive Disclosure**: Collapsible sections for clean information hierarchy
- **Dual View Modes**: Individual and Domain-organized layouts
- **Interactive Elements**: Smooth animations and micro-interactions
- **Accessibility**: WCAG compliant with proper ARIA labels

## 🎯 Key Interface Improvements

### **Collapsible Design System**
- **Default Collapsed State**: All detail sections start closed for clean overview
- **Progressive Disclosure**: Expand only the information you need
- **Visual Hierarchy**: Clear information organization with consistent spacing
- **Smooth Transitions**: Professional animations for expand/collapse actions

### **Enhanced Data Presentation**
- **Color-Coded Status**: Immediate visual feedback with green/yellow/red indicators
- **Metric Thresholds**: Clear good/improvement/poor boundaries displayed
- **Status Summaries**: Quick overview when sections are collapsed
- **Contextual Actions**: Relevant buttons and controls for each data section

### **Responsive Layouts**
- **Grid Systems**: Adaptive layouts that work on all screen sizes
- **Mobile Optimization**: Touch-friendly interfaces with appropriate spacing
- **Desktop Enhancement**: Multi-column layouts for efficient space usage
- **Consistent Experience**: Same features available across all devices

### Building for Production

```bash
npm run build
npm start
```

## 🔧 Troubleshooting

### Common Issues

1. **API Key Invalid**: Make sure the Google PageSpeed Insights API is enabled and the key is correct
2. **No Data Showing**: Check browser console for API errors and verify the URL format
3. **Alerts Not Working**: Test Slack webhook URL and EmailJS configuration in settings
4. **Charts Not Loading**: Ensure you have historical data by running multiple refreshes over time
5. **View Mode Issues**: Try refreshing the page if switching between Individual/Domain views doesn't work
6. **Collapsed Sections**: Click the chevron icons to expand collapsed performance details

### Storage Limits

Browser localStorage has size limits (~5-10MB). The app automatically:
- Keeps only the last 30 data points per URL
- Provides intelligent data cleanup for optimal performance
- Offers manual data management options in development mode

## 📋 Recent Enhancements

### **Version 2.0 - Enhanced Interface & Analytics**
- ✅ **Dual View Modes**: Individual and Domain-organized layouts
- ✅ **Complete Performance Metrics**: Comprehensive metric coverage beyond Core Web Vitals
- ✅ **Advanced Diagnosis**: AI-powered issue detection with actionable recommendations
- ✅ **Core Web Vitals Assessment**: Automated evaluation with pass/fail status
- ✅ **Collapsible Interface**: Clean, organized data presentation with progressive disclosure
- ✅ **Enhanced Responsiveness**: Improved mobile and tablet experience
- ✅ **Consistent Width**: Fixed layout inconsistencies between view modes
- ✅ **Default Collapsed State**: Cleaner initial interface with expandable details

### **Version 1.0 - Core Foundation**
- ✅ **Multi-URL Tracking**: Basic website monitoring capabilities
- ✅ **Core Web Vitals**: Essential performance metrics tracking
- ✅ **Trend Charts**: Historical data visualization
- ✅ **Smart Alerts**: Slack and email notifications
- ✅ **Dark/Light Mode**: Theme system implementation
- ✅ **Local Storage**: Browser-based data persistence

## 🤝 Contributing

This is a **frontend-only application** with no backend dependencies. All data processing happens in the browser, making it easy to:
- **Fork and customize** for your specific needs
- **Deploy anywhere** - static hosting, CDN, or local development
- **Extend functionality** with additional metrics or integrations
- **Modify the UI** with your branding and design preferences

### Development Setup
1. Clone the repository
2. `npm install` - Install dependencies
3. `npm run dev` - Start development server
4. `npm run build` - Build for production

## 📄 License

MIT License - Feel free to use, modify, and distribute for personal or commercial projects.

## 🆘 Support & Resources

### **API Documentation**
- **Google PageSpeed Insights**: [Official API Documentation](https://developers.google.com/speed/docs/insights/v5/get-started)
- **Slack Webhooks**: [Slack API Documentation](https://api.slack.com/messaging/webhooks)
- **EmailJS**: [EmailJS Documentation](https://www.emailjs.com/docs/)

### **Community & Help**
- **Issues**: Report bugs or request features via GitHub Issues
- **Performance Optimization**: Consult Google's [Web.dev](https://web.dev/) for improvement strategies
- **Core Web Vitals**: Learn more at [Web Vitals](https://web.dev/vitals/)

---

## 🏆 Why Choose Web Vitals Monitor?

✅ **No Backend Required** - Pure frontend solution  
✅ **Privacy-First** - All data stays in your browser  
✅ **Enterprise Features** - Professional-grade analytics  
✅ **Easy Deployment** - Works anywhere static sites can be hosted  
✅ **Comprehensive Coverage** - Beyond basic Core Web Vitals  
✅ **Modern Interface** - Clean, responsive, accessible design  
✅ **Smart Automation** - Intelligent monitoring and alerts  
✅ **Extensible** - Open source and customizable  

**Happy monitoring!** 🚀📊🎯