'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp, Zap, Clock, Eye, Server, Smartphone, Globe, Trash2, FolderOpen, Folder, BarChart3 } from 'lucide-react';
import { getLatestVitalsData, getMetricStatus, VITALS_THRESHOLDS, removeTrackedUrl } from '@/lib/storage';
import { hasPerformanceData, getMissingCategories } from '@/lib/psi-api';
import VitalsChart from './VitalsChart';

export default function VitalsDashboard({ trackedUrls, onRefresh, onRefreshUrl, isRefreshing, onUrlsChange, onOpenAddWebsite }) {
  // Enhanced for component mapping test - Dashboard component
  const [vitalsData, setVitalsData] = useState({});
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [showChart, setShowChart] = useState(false);
  const [collapsedUrls, setCollapsedUrls] = useState(new Set());
  const [refreshingUrls, setRefreshingUrls] = useState(new Set());
  const [collapsedDiagnosis, setCollapsedDiagnosis] = useState(new Set());
  const [viewMode, setViewMode] = useState('individual'); // 'individual' or 'grouped'
  const [collapsedDomains, setCollapsedDomains] = useState(new Set());

  // Memoize the URL IDs to prevent unnecessary re-renders
  const urlIds = useMemo(() => trackedUrls.map(url => url.id), [trackedUrls]);
  const urlIdsString = useMemo(() => urlIds.join(','), [urlIds]);
  
  // Track previous URL IDs to detect actual changes
  const prevUrlIdsRef = useRef('');
  const prevCollapsedUrlIdsRef = useRef('');

  // Force reload trigger
  const [forceReload, setForceReload] = useState(0);
  
  // Function to reload vitals data
  const reloadVitalsData = () => {
    const data = {};
    trackedUrls.forEach(url => {
      const latest = getLatestVitalsData(url.id);
      if (latest) {
        data[url.id] = latest;
      }
    });
    setVitalsData(data);
  };

  // Load vitals data when URLs actually change or force reload is triggered
  useEffect(() => {
    if (prevUrlIdsRef.current !== urlIdsString || forceReload > 0) {
      reloadVitalsData();
      prevUrlIdsRef.current = urlIdsString;
    }
  }, [urlIdsString, forceReload]);
  
  // Expose reload function via ref or by listening to external events
  useEffect(() => {
    const handleDataRefresh = () => {
      setForceReload(prev => prev + 1);
    };
    
    // Listen for custom data refresh events
    window.addEventListener('vitalsDataRefresh', handleDataRefresh);
    
    return () => {
      window.removeEventListener('vitalsDataRefresh', handleDataRefresh);
    };
  }, []);

  // Track if this is the initial load
  const isInitialLoad = useRef(true);

  // Initialize collapsed state separately to avoid conflicts
  useEffect(() => {
    if (urlIds.length > 0 && prevCollapsedUrlIdsRef.current !== urlIdsString) {
      if (isInitialLoad.current) {
        // On initial load, set all URLs as collapsed
        setCollapsedUrls(new Set(urlIds));
        isInitialLoad.current = false;
        prevCollapsedUrlIdsRef.current = urlIdsString;
      } else {
        // On subsequent updates, preserve existing state but manage new/removed URLs
        setCollapsedUrls(prev => {
          const prevArray = Array.from(prev);
          const newIds = urlIds.filter(id => !prevArray.includes(id));
          
          // Add new URLs as collapsed
          if (newIds.length > 0) {
            const updatedSet = new Set(prev);
            newIds.forEach(id => updatedSet.add(id));
            prevCollapsedUrlIdsRef.current = urlIdsString;
            return updatedSet;
          }
          
          // Remove URLs that no longer exist
          const currentIds = new Set(urlIds);
          const filteredSet = new Set(prevArray.filter(id => currentIds.has(id)));
          if (filteredSet.size !== prev.size) {
            prevCollapsedUrlIdsRef.current = urlIdsString;
            return filteredSet;
          }
          
          // No changes needed
          return prev;
        });
      }
    }
  }, [urlIdsString]);

  // Also refresh data when component receives focus (to catch data updates)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && trackedUrls.length > 0) {
        const data = {};
        trackedUrls.forEach(url => {
          const latest = getLatestVitalsData(url.id);
          if (latest) {
            data[url.id] = latest;
          }
        });
        setVitalsData(data);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [urlIdsString]); // Only depend on urlIdsString since it's derived from trackedUrls

  const toggleUrlCollapse = (urlId) => {
    setCollapsedUrls(prev => {
      const newSet = new Set(prev);
      if (newSet.has(urlId)) {
        newSet.delete(urlId); // Expand (remove from collapsed set)
      } else {
        newSet.add(urlId); // Collapse (add to collapsed set)
      }
      return newSet;
    });
  };

  const toggleDiagnosisCollapse = (urlId) => {
    setCollapsedDiagnosis(prev => {
      const newSet = new Set(prev);
      if (newSet.has(urlId)) {
        newSet.delete(urlId); // Remove from set = expand (show content)
      } else {
        newSet.add(urlId); // Add to set = expand (show content)
      }
      return newSet;
    });
  };

  const handleIndividualRefresh = async (url) => {
    if (!onRefreshUrl) return;
    
    setRefreshingUrls(prev => new Set(prev).add(url.id));
    
    try {
      const newData = await onRefreshUrl(url);
      if (newData) {
        // Update vitals data for this specific URL and refresh the display
        setVitalsData(prev => ({
          ...prev,
          [url.id]: newData
        }));
        // The individual update above should be sufficient
        // No need for a full refresh as we just updated the specific URL
      }
    } catch (error) {
      console.error(`Failed to refresh ${url.url}:`, error);
    } finally {
      setRefreshingUrls(prev => {
        const newSet = new Set(prev);
        newSet.delete(url.id);
        return newSet;
      });
    }
  };

  const handleDeleteUrl = (url) => {
    const message = `Are you sure you want to remove "${url.name}"?\n\nThis will permanently delete:\n• All performance data and history\n• Monitoring alerts for this URL\n• All associated vitals metrics\n\nThis action cannot be undone.`;
    
    if (confirm(message)) {
      removeTrackedUrl(url.id);
      onUrlsChange && onUrlsChange();
    }
  };

  // Domain grouping functions
  const extractDomain = (url) => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return 'invalid-domain';
    }
  };

  const toggleDomainCollapse = (domain) => {
    setCollapsedDomains(prev => {
      const newSet = new Set(prev);
      if (newSet.has(domain)) {
        newSet.delete(domain);
      } else {
        newSet.add(domain);
      }
      return newSet;
    });
  };

  const getGroupedByDomain = () => {
    const grouped = {};
    trackedUrls.forEach(url => {
      const domain = extractDomain(url.url);
      if (!grouped[domain]) {
        grouped[domain] = {
          domain,
          urls: [],
          aggregatedData: null
        };
      }
      grouped[domain].urls.push(url);
    });

    // Calculate aggregated metrics for each domain
    Object.keys(grouped).forEach(domain => {
      const domainUrls = grouped[domain].urls;
      const domainData = domainUrls
        .map(url => vitalsData[url.id])
        .filter(data => data);

      if (domainData.length > 0) {
        // Calculate average metrics
        const avgMetrics = {};
        const metrics = ['performance', 'accessibility', 'bestPractices', 'seo', 'lcp', 'fcp', 'cls', 'ttfb', 'inp'];
        
        metrics.forEach(metric => {
          const values = domainData
            .map(data => data[metric])
            .filter(val => val !== null && val !== undefined);
          
          if (values.length > 0) {
            avgMetrics[metric] = values.reduce((sum, val) => sum + val, 0) / values.length;
          }
        });

        grouped[domain].aggregatedData = {
          ...avgMetrics,
          urlCount: domainUrls.length,
          lastUpdated: Math.max(...domainData.map(data => new Date(data.timestamp).getTime())),
          totalIssues: domainData.reduce((sum, data) => {
            const diagnosis = getPerformanceDiagnosis(data);
            return sum + diagnosis.filter(d => d.severity === 'high').length;
          }, 0)
        };
      }
    });

    return grouped;
  };

  const formatMetricValue = (metric, value) => {
    if (value === null || value === undefined) return 'N/A';
    
    switch (metric) {
      case 'lcp':
      case 'fcp':
      case 'ttfb':
        return `${value.toFixed(2)}s`;
      case 'cls':
        return value.toFixed(3);
      case 'inp':
        return `${Math.round(value)}ms`;
      case 'performance':
      case 'accessibility':
      case 'bestPractices':
      case 'seo':
        return `${value}/100`;
      default:
        return value.toString();
    }
  };

  const getMetricIcon = (metric, value) => {
    const status = getMetricStatus(metric, value);
    
    switch (status) {
      case 'green':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'yellow':
        return <AlertTriangle size={16} className="text-yellow-600" />;
      case 'red':
        return <XCircle size={16} className="text-red-600" />;
      default:
        return <Minus size={16} className="text-gray-400" />;
    }
  };

  const getStatusClassName = (metric, value) => {
    const status = getMetricStatus(metric, value);
    
    switch (status) {
      case 'green':
        return 'status-green';
      case 'yellow':
        return 'status-yellow';
      case 'red':
        return 'status-red';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getTrendIcon = (metric, currentValue, previousValue) => {
    if (!previousValue || !currentValue) return null;
    
    // Score-based metrics (higher is better)
    const isScoreMetric = ['performance', 'accessibility', 'bestPractices', 'seo'].includes(metric);
    const isImprovement = isScoreMetric 
      ? currentValue > previousValue  // Higher is better for scores
      : currentValue < previousValue; // Lower is better for time-based metrics
    
    if (Math.abs(currentValue - previousValue) < 0.1) {
      return <Minus size={14} className="text-gray-500" />;
    }
    
    return isImprovement 
      ? <TrendingUp size={14} className="text-green-600" />
      : <TrendingDown size={14} className="text-red-600" />;
  };

  const getThresholdDisplay = (metric) => {
    const threshold = VITALS_THRESHOLDS[metric];
    if (!threshold) return null;

    // Score-based metrics (higher is better)
    const isScoreMetric = ['performance', 'accessibility', 'bestPractices', 'seo'].includes(metric);
    
    if (isScoreMetric) {
      return (
        <div className="text-xs text-muted-foreground mt-1">
          Good: ≥{threshold.good} | Poor: &lt;{threshold.poor}
        </div>
      );
    }
    
    // Time-based and other metrics (lower is better)
    let unit = '';
    if (metric === 'inp') unit = 'ms';
    else if (['lcp', 'fcp', 'ttfb'].includes(metric)) unit = 's';
    
    return (
      <div className="text-xs text-muted-foreground mt-1">
        Good: ≤{threshold.good}{unit} | Poor: &gt;{threshold.poor}{unit}
      </div>
    );
  };

  const getCoreWebVitalsAssessment = (data) => {
    if (!data) return null;

    // Core Web Vitals metrics (the most important ones according to Google)
    const coreVitals = [
      { key: 'lcp', name: 'LCP', value: data.lcp },
      { key: 'cls', name: 'CLS', value: data.cls },
      { key: 'inp', name: 'INP', value: data.inp },
    ];

    // Count status for each vital
    let passCount = 0;
    let needsImprovementCount = 0;
    let failCount = 0;

    const vitalStatuses = coreVitals.map(vital => {
      if (vital.value === null || vital.value === undefined) {
        return { ...vital, status: 'unknown' };
      }
      
      const status = getMetricStatus(vital.key, vital.value);
      if (status === 'green') passCount++;
      else if (status === 'yellow') needsImprovementCount++;
      else if (status === 'red') failCount++;
      
      return { ...vital, status };
    });

    // Determine overall assessment
    let overallStatus, overallMessage, overallColor;
    
    if (failCount > 0) {
      overallStatus = 'Poor';
      overallMessage = `${failCount} vitals failing`;
      overallColor = 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400';
    } else if (needsImprovementCount > 0) {
      overallStatus = 'Needs Improvement';
      overallMessage = `${needsImprovementCount} vitals need improvement`;
      overallColor = 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400';
    } else if (passCount === coreVitals.length) {
      overallStatus = 'Good';
      overallMessage = 'All Core Web Vitals passing';
      overallColor = 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400';
    } else {
      overallStatus = 'Unknown';
      overallMessage = 'Insufficient data';
      overallColor = 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-400';
    }

    return {
      overallStatus,
      overallMessage,
      overallColor,
      vitalStatuses,
      passCount,
      needsImprovementCount,
      failCount,
      totalCount: coreVitals.filter(v => v.value !== null && v.value !== undefined).length
    };
  };

  const getDiagnosisForVital = (vital, value, opportunities = []) => {
    if (value === null || value === undefined) return null;
    
    const status = getMetricStatus(vital, value);
    if (status === 'green') return null; // No issues
    
    const diagnoses = [];
    
    switch (vital) {
      case 'lcp':
        if (value > 4.0) {
          diagnoses.push({
            severity: 'high',
            issue: 'Largest Contentful Paint is very slow',
            description: `LCP of ${value.toFixed(2)}s exceeds the "Poor" threshold of 4.0s`,
            recommendations: [
              'Optimize image loading and use modern formats (WebP, AVIF)',
              'Implement resource hints (preload, prefetch) for critical resources',
              'Reduce server response times (TTFB)',
              'Remove render-blocking JavaScript and CSS'
            ]
          });
        } else if (value > 2.5) {
          diagnoses.push({
            severity: 'medium',
            issue: 'Largest Contentful Paint needs improvement',
            description: `LCP of ${value.toFixed(2)}s is above the "Good" threshold of 2.5s`,
            recommendations: [
              'Compress and optimize images',
              'Use a Content Delivery Network (CDN)',
              'Eliminate render-blocking resources',
              'Improve server response times'
            ]
          });
        }
        break;
        
      case 'cls':
        if (value > 0.25) {
          diagnoses.push({
            severity: 'high',
            issue: 'Cumulative Layout Shift is causing poor user experience',
            description: `CLS of ${value.toFixed(3)} exceeds the "Poor" threshold of 0.25`,
            recommendations: [
              'Add size attributes to images and video elements',
              'Reserve space for ads and dynamic content',
              'Avoid inserting content above existing content',
              'Use CSS aspect-ratio for responsive images'
            ]
          });
        } else if (value > 0.1) {
          diagnoses.push({
            severity: 'medium',
            issue: 'Cumulative Layout Shift needs improvement',
            description: `CLS of ${value.toFixed(3)} is above the "Good" threshold of 0.1`,
            recommendations: [
              'Set explicit dimensions for images and embeds',
              'Avoid dynamically injected content',
              'Use font-display: swap for web fonts',
              'Ensure ads containers have reserved space'
            ]
          });
        }
        break;
        
      case 'inp':
        if (value > 500) {
          diagnoses.push({
            severity: 'high',
            issue: 'Interaction to Next Paint is very slow',
            description: `INP of ${Math.round(value)}ms exceeds the "Poor" threshold of 500ms`,
            recommendations: [
              'Reduce JavaScript execution time',
              'Avoid long-running main thread tasks',
              'Optimize event handlers and callbacks',
              'Use web workers for heavy computations'
            ]
          });
        } else if (value > 200) {
          diagnoses.push({
            severity: 'medium',
            issue: 'Interaction to Next Paint needs improvement',
            description: `INP of ${Math.round(value)}ms is above the "Good" threshold of 200ms`,
            recommendations: [
              'Debounce user input handlers',
              'Break up long JavaScript tasks',
              'Optimize third-party scripts',
              'Use requestIdleCallback for non-critical work'
            ]
          });
        }
        break;
    }
    
    return diagnoses.length > 0 ? diagnoses : null;
  };

  const getPerformanceDiagnosis = (data) => {
    if (!data) return null;
    
    const allDiagnoses = [];
    const opportunities = data.opportunities || [];
    
    // Analyze Core Web Vitals
    ['lcp', 'cls', 'inp'].forEach(vital => {
      const vitalDiagnoses = getDiagnosisForVital(vital, data[vital], opportunities);
      if (vitalDiagnoses) {
        allDiagnoses.push(...vitalDiagnoses);
      }
    });
    
    // Add top opportunities as diagnoses
    if (opportunities.length > 0) {
      opportunities.slice(0, 3).forEach(opp => {
        if (opp.savings > 0.5) { // Only show significant opportunities
          allDiagnoses.push({
            severity: opp.savings > 2 ? 'high' : 'medium',
            issue: opp.title,
            description: `Potential savings: ${opp.savings}s`,
            recommendations: [opp.description],
            isOpportunity: true
          });
        }
      });
    }
    
    // Performance score diagnosis
    if (data.performance !== null && data.performance < 50) {
      allDiagnoses.push({
        severity: 'high',
        issue: 'Overall Performance Score is Poor',
        description: `Performance score of ${data.performance}/100 needs immediate attention`,
        recommendations: [
          'Focus on Core Web Vitals improvements',
          'Optimize resource loading and delivery',
          'Minimize main thread work',
          'Reduce unused JavaScript and CSS'
        ]
      });
    } else if (data.performance !== null && data.performance < 90) {
      allDiagnoses.push({
        severity: 'medium',
        issue: 'Performance Score can be improved',
        description: `Performance score of ${data.performance}/100 has room for optimization`,
        recommendations: [
          'Implement performance best practices',
          'Optimize images and media',
          'Review third-party scripts',
          'Enable compression and caching'
        ]
      });
    }
    
    // Sort by severity
    const severityOrder = { high: 3, medium: 2, low: 1 };
    allDiagnoses.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);
    
    return allDiagnoses.slice(0, 5); // Return top 5 issues
  };

  // New helper function for dashboard overview
  const getDashboardOverview = () => {
    const urlsWithData = trackedUrls.filter(url => vitalsData[url.id]);
    
    if (urlsWithData.length === 0) {
      return {
        totalSites: trackedUrls.length,
        sitesWithData: 0,
        overallStatus: 'unknown',
        coreVitalsStats: { good: 0, needsImprovement: 0, poor: 0, unknown: trackedUrls.length },
        criticalIssues: 0,
        avgPerformanceScore: null,
        bestPerformer: null,
        worstPerformer: null
      };
    }

    let totalGood = 0, totalNeedsImprovement = 0, totalPoor = 0, totalUnknown = 0;
    let totalCriticalIssues = 0;
    let performanceScores = [];
    let bestScore = 0, worstScore = 100;
    let bestPerformer = null, worstPerformer = null;

    urlsWithData.forEach(url => {
      const data = vitalsData[url.id];
      const assessment = getCoreWebVitalsAssessment(data);
      const diagnosis = getPerformanceDiagnosis(data);
      
      if (assessment) {
        if (assessment.overallStatus === 'Good') totalGood++;
        else if (assessment.overallStatus === 'Needs Improvement') totalNeedsImprovement++;
        else if (assessment.overallStatus === 'Poor') totalPoor++;
        else totalUnknown++;
      } else {
        totalUnknown++;
      }

      if (diagnosis) {
        totalCriticalIssues += diagnosis.filter(d => d.severity === 'high').length;
      }

      if (data.performance !== null && data.performance !== undefined) {
        performanceScores.push(data.performance);
        if (data.performance > bestScore) {
          bestScore = data.performance;
          bestPerformer = url;
        }
        if (data.performance < worstScore) {
          worstScore = data.performance;
          worstPerformer = url;
        }
      }
    });

    const avgPerformanceScore = performanceScores.length > 0 
      ? Math.round(performanceScores.reduce((a, b) => a + b, 0) / performanceScores.length)
      : null;

    let overallStatus = 'unknown';
    if (totalPoor > 0) overallStatus = 'poor';
    else if (totalNeedsImprovement > 0) overallStatus = 'needs-improvement';
    else if (totalGood > 0) overallStatus = 'good';

    return {
      totalSites: trackedUrls.length,
      sitesWithData: urlsWithData.length,
      overallStatus,
      coreVitalsStats: { good: totalGood, needsImprovement: totalNeedsImprovement, poor: totalPoor, unknown: totalUnknown },
      criticalIssues: totalCriticalIssues,
      avgPerformanceScore,
      bestPerformer,
      worstPerformer,
      bestScore,
      worstScore
    };
  };

  const coreMetrics = [
    { key: 'performance', name: 'Performance Score', description: 'Overall performance score' },
    { key: 'lcp', name: 'Largest Contentful Paint', description: 'Time until largest content element loads' },
    { key: 'fcp', name: 'First Contentful Paint', description: 'Time until first content appears' },
    { key: 'cls', name: 'Cumulative Layout Shift', description: 'Visual stability of the page' },
    { key: 'ttfb', name: 'Time to First Byte', description: 'Server response time' },
    { key: 'inp', name: 'Interaction to Next Paint', description: 'Responsiveness to user input' },
  ];

  const additionalMetrics = [
    { key: 'accessibility', name: 'Accessibility', description: 'Accessibility best practices' },
    { key: 'bestPractices', name: 'Best Practices', description: 'Web development best practices' },
    { key: 'seo', name: 'SEO', description: 'Search engine optimization' },
  ];

  if (trackedUrls.length === 0) {
    return (
      <section className="text-center py-16" aria-labelledby="web-vitals-welcome-heading">
        <div className="bg-card border border-border rounded-lg p-8 shadow-sm max-w-4xl mx-auto">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full" aria-hidden="true">
              <Globe size={48} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 id="web-vitals-welcome-heading" className="text-xl font-semibold text-foreground mb-2">
                Welcome to Web Vitals Monitor
              </h2>
              <p className="text-muted-foreground text-base max-w-md">
                Start monitoring your websites&apos; performance by adding URLs to track their Core Web Vitals and other key metrics.
              </p>
            </div>
            <div className="space-y-4">
              <button
                onClick={onOpenAddWebsite}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg flex items-center space-x-3 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 font-medium"
              >
                <Globe size={20} />
                <span>Add Your First Website</span>
              </button>
              
              <div className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-4 max-w-lg">
                <div className="font-medium mb-2">What you&apos;ll get:</div>
                <ul className="space-y-1 text-left">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Core Web Vitals monitoring (LCP, CLS, INP)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Performance scores and recommendations</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Historical trends and insights</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Automated alerts for performance issues</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl font-semibold text-foreground">PageSpeed Insights (Secondary Feature)</h2>
          <p className="text-muted-foreground mt-1 text-sm">Google's real-world performance data for manual URL tracking</p>
        </div>
        
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* View Mode Toggle */}
          {trackedUrls.length > 0 && (
            <div className="flex items-center border border-border rounded-lg p-1 bg-card">
              <button
                onClick={() => setViewMode('individual')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  viewMode === 'individual' 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <Globe size={14} />
                <span>Individual</span>
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  viewMode === 'grouped' 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <Folder size={14} />
                <span>By Domain</span>
              </button>
            </div>
          )}
          
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Refreshing All Sites...' : 'Refresh All Sites'}</span>
          </button>
        </div>
      </div>



      {/* Portfolio Summary */}
      {trackedUrls.length > 0 && (() => {
        const overview = getDashboardOverview();
        
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Total Sites */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Server size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{overview.totalSites}</p>
                  <p className="text-sm text-muted-foreground">Total Sites</p>
                </div>
              </div>
            </div>

            {/* Health Status */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  overview.overallStatus === 'good' ? 'bg-green-100 dark:bg-green-900/30' :
                  overview.overallStatus === 'needs-improvement' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                  overview.overallStatus === 'poor' ? 'bg-red-100 dark:bg-red-900/30' :
                  'bg-gray-100 dark:bg-gray-900/30'
                }`}>
                  {overview.overallStatus === 'good' && <CheckCircle size={20} className="text-green-600 dark:text-green-400" />}
                  {overview.overallStatus === 'needs-improvement' && <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400" />}
                  {overview.overallStatus === 'poor' && <XCircle size={20} className="text-red-600 dark:text-red-400" />}
                  {overview.overallStatus === 'unknown' && <Clock size={20} className="text-gray-600 dark:text-gray-400" />}
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {overview.coreVitalsStats.good}/{overview.totalSites}
                  </p>
                  <p className="text-sm text-muted-foreground">Healthy Sites</p>
                </div>
              </div>
            </div>

            {/* Average Performance */}
            {overview.avgPerformanceScore && (
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <TrendingUp size={20} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{overview.avgPerformanceScore}</p>
                    <p className="text-sm text-muted-foreground">Avg Score</p>
                  </div>
                </div>
              </div>
            )}

            {/* Critical Issues */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  overview.criticalIssues > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'
                }`}>
                  {overview.criticalIssues > 0 ? (
                    <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
                  ) : (
                    <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                  )}
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{overview.criticalIssues}</p>
                  <p className="text-sm text-muted-foreground">Critical Issues</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Detailed Analysis */}
      {trackedUrls.length > 0 && (
        <div className="border-t border-border pt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Detailed Analysis</h2>
              <p className="text-sm text-muted-foreground">
                {viewMode === 'grouped' 
                  ? 'Performance metrics organized by domain for better overview'
                  : 'In-depth performance metrics and recommendations for each site'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content based on view mode */}
      {viewMode === 'individual' ? (
        // Individual URL view
        trackedUrls.map(url => {
        const data = vitalsData[url.id];
        const isCollapsed = collapsedUrls.has(url.id);
        const isRefreshingUrl = refreshingUrls.has(url.id);
        
        return (
          <div key={url.id} className="bg-card border border-border rounded-lg overflow-hidden">
            {/* Site Header */}
            <div className="p-6 border-b border-border">
              <div className="flex justify-between items-start">
                <div className="flex items-start space-x-3 flex-1">
                  {/* Collapse toggle button */}
                  <button
                    onClick={() => toggleUrlCollapse(url.id)}
                    className="p-1 hover:bg-secondary rounded transition-colors mt-1"
                    title={isCollapsed ? 'Expand details' : 'Collapse details'}
                  >
                    {isCollapsed ? (
                      <ChevronDown size={18} className="text-muted-foreground" />
                    ) : (
                      <ChevronUp size={18} className="text-muted-foreground" />
                    )}
                  </button>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{url.name}</h3>
                      {data && (() => {
                        const coreVitalsScores = [
                          { key: 'lcp', value: data.lcp, label: 'LCP', unit: 's' },
                          { key: 'cls', value: data.cls, label: 'CLS', unit: '' },
                          { key: 'inp', value: data.inp, label: 'INP', unit: 'ms' }
                        ];
                        
                        return (
                          <div className="flex items-center space-x-2">
                            {coreVitalsScores.map(metric => {
                              if (metric.value === null || metric.value === undefined) return null;
                              
                              const status = getMetricStatus(metric.key, metric.value);
                              const statusColor = 
                                status === 'Good' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                status === 'Needs Improvement' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                status === 'Poor' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
                              
                              return (
                                <span 
                                  key={metric.key}
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}
                                  title={`${metric.label}: ${formatMetricValue(metric.key, metric.value)} - ${status}`}
                                >
                                  {metric.label}: {formatMetricValue(metric.key, metric.value)}
                                </span>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                    <a 
                      href={url.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 underline break-all"
                    >
                      {url.url}
                    </a>
                    
                    {/* Status summary when collapsed */}
                    {isCollapsed && data && (() => {
                      const assessment = getCoreWebVitalsAssessment(data);
                      const diagnosis = getPerformanceDiagnosis(data);
                      return (
                        <div className="flex items-center space-x-4 mt-2">
                          {assessment && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              assessment.overallStatus === 'Good' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                              assessment.overallStatus === 'Needs Improvement' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                              assessment.overallStatus === 'Poor' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                            }`}>
                              {assessment.overallStatus === 'Good' && <CheckCircle size={12} className="mr-1" />}
                              {assessment.overallStatus === 'Needs Improvement' && <AlertTriangle size={12} className="mr-1" />}
                              {assessment.overallStatus === 'Poor' && <XCircle size={12} className="mr-1" />}
                              CWV: {assessment.overallStatus}
                            </span>
                          )}
                          {data.performance !== null && (
                            <span className="text-xs text-muted-foreground">
                              Performance: {data.performance}/100
                            </span>
                          )}
                          {diagnosis && diagnosis.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {diagnosis.filter(d => d.severity === 'high').length} critical issues
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    
                    {/* Last updated info */}
                    {data && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last updated: {new Date(data.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {/* Individual refresh button */}
                  <button
                    onClick={() => handleIndividualRefresh(url)}
                    disabled={isRefreshingUrl || isRefreshing}
                    className="btn-secondary text-sm flex items-center space-x-1 disabled:opacity-50"
                    title="Refresh this site"
                  >
                    <RefreshCw size={14} className={isRefreshingUrl ? 'animate-spin' : ''} />
                    <span className="hidden sm:inline">
                      {isRefreshingUrl ? 'Refreshing...' : 'Refresh'}
                    </span>
                  </button>
                  
                  {/* View trends button */}
                  {data && (
                    <button
                      onClick={() => {
                        setSelectedUrl(url.id);
                        setShowChart(true);
                      }}
                      className="btn-secondary text-sm"
                    >
                      Trends
                    </button>
                  )}
                  
                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteUrl(url)}
                    className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all duration-200"
                    title={`Remove ${url.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Collapsible content */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
              !isCollapsed ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="p-6 space-y-8">
                {!data ? (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground">
                      No data available. Click &quot;Refresh&quot; to fetch vitals.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                  {/* Show warning if performance data is missing */}
                  {!hasPerformanceData(data) && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                            Limited Data Available
                          </h5>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            Missing: {getMissingCategories(data).join(', ')}. 
                            This might be due to API limitations or category restrictions.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                
                
                {/* Core Web Vitals Assessment */}
                {(() => {
                  const assessment = getCoreWebVitalsAssessment(data);
                  if (!assessment) return null;
                  
                  return (
                    <div className={`border rounded-lg p-4 ${assessment.overallColor}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="text-sm font-semibold">
                              Core Web Vitals Assessment
                            </h4>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/20 dark:bg-black/20">
                              {assessment.overallStatus}
                            </span>
                          </div>
                          
                          <p className="text-sm mb-3">
                            {assessment.overallMessage}
                          </p>
                          
                          {/* Individual vital status indicators */}
                          <div className="flex flex-wrap gap-2">
                            {assessment.vitalStatuses.map(vital => (
                              <div
                                key={vital.key}
                                className={`px-2 py-1 rounded text-xs font-medium flex items-center space-x-1 ${
                                  vital.status === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                  vital.status === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                  vital.status === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                                }`}
                              >
                                {vital.status === 'green' && <CheckCircle size={12} />}
                                {vital.status === 'yellow' && <AlertTriangle size={12} />}
                                {vital.status === 'red' && <XCircle size={12} />}
                                {vital.status === 'unknown' && <Minus size={12} />}
                                <span>{vital.name}</span>
                                {vital.value !== null && vital.value !== undefined && (
                                  <span className="opacity-75">
                                    {formatMetricValue(vital.key, vital.value)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Summary stats */}
                        <div className="ml-4 text-right">
                          <div className="text-2xl font-bold">
                            {assessment.passCount}/{assessment.totalCount}
                          </div>
                          <div className="text-xs opacity-75">
                            passing
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Performance Diagnosis */}
                {(() => {
                  const diagnosis = getPerformanceDiagnosis(data);
                  if (!diagnosis || diagnosis.length === 0) return null;
                  
                  // Start collapsed by default for cleaner UI
                  const isDiagnosisCollapsed = !collapsedDiagnosis.has(url.id);
                  
                  return (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div 
                        className={`flex items-center justify-between mb-4 ${
                          isDiagnosisCollapsed ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 -m-2 p-2 rounded transition-colors' : ''
                        }`}
                        onClick={isDiagnosisCollapsed ? () => toggleDiagnosisCollapse(url.id) : undefined}
                        title={isDiagnosisCollapsed ? 'Click to expand diagnosis details' : undefined}
                      >
                        <div className="flex items-center space-x-2">
                          <Zap className="text-blue-600 dark:text-blue-400" size={16} />
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Performance Diagnosis
                          </h4>
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium">
                            {diagnosis.length} issue{diagnosis.length !== 1 ? 's' : ''} found
                          </span>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDiagnosisCollapse(url.id);
                          }}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title={isDiagnosisCollapsed ? 'Expand diagnosis' : 'Collapse diagnosis'}
                        >
                          {isDiagnosisCollapsed ? (
                            <ChevronDown size={16} className="text-gray-500 dark:text-gray-400" />
                          ) : (
                            <ChevronUp size={16} className="text-gray-500 dark:text-gray-400" />
                          )}
                        </button>
                      </div>
                      
                      {/* Collapsed state summary */}
                      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isDiagnosisCollapsed ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        <div className="text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center space-x-4">
                            {(() => {
                              const highIssues = diagnosis.filter(d => d.severity === 'high').length;
                              const mediumIssues = diagnosis.filter(d => d.severity === 'medium').length;
                              const opportunities = diagnosis.filter(d => d.isOpportunity).length;
                              
                              return (
                                <>
                                  {highIssues > 0 && (
                                    <span className="flex items-center space-x-1">
                                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                      <span>{highIssues} critical</span>
                                    </span>
                                  )}
                                  {mediumIssues > 0 && (
                                    <span className="flex items-center space-x-1">
                                      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                                      <span>{mediumIssues} moderate</span>
                                    </span>
                                  )}
                                  {opportunities > 0 && (
                                    <span className="flex items-center space-x-1">
                                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                      <span>{opportunities} opportunit{opportunities !== 1 ? 'ies' : 'y'}</span>
                                    </span>
                                  )}
                                  <span>Click to expand details</span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      
                      {/* Expanded diagnosis content */}
                      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                        !isDiagnosisCollapsed ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        <div className="space-y-4 pt-2">
                          {diagnosis.map((item, index) => (
                            <div key={index} className={`border-l-4 pl-4 py-3 rounded-r-lg ${
                              item.severity === 'high' ? 'border-l-red-500 bg-red-50 dark:bg-red-900/10' :
                              item.severity === 'medium' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10' :
                              'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10'
                            }`}>
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  {item.severity === 'high' && (
                                    <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
                                      <XCircle size={14} />
                                      <span className="text-xs font-bold">CRITICAL</span>
                                    </div>
                                  )}
                                  {item.severity === 'medium' && (
                                    <div className="flex items-center space-x-1 text-yellow-600 dark:text-yellow-400">
                                      <AlertTriangle size={14} />
                                      <span className="text-xs font-bold">MODERATE</span>
                                    </div>
                                  )}
                                  {item.isOpportunity && (
                                    <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                                      <Zap size={12} />
                                      <span className="text-xs font-bold">OPPORTUNITY</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <h5 className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                                {item.issue}
                              </h5>
                              
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                {item.description}
                              </p>
                              
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-gray-900 dark:text-white mb-1">
                                  Recommendations:
                                </div>
                                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                  {item.recommendations.slice(0, 3).map((rec, recIndex) => (
                                    <li key={recIndex} className="flex items-start space-x-2">
                                      <span className="text-blue-500 mt-1">•</span>
                                      <span>{rec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          ))}
                          
                          {diagnosis.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2 text-xs font-medium text-gray-900 dark:text-white">
                                  <Eye size={12} />
                                  <span>Action Plan Priority</span>
                                </div>
                                
                                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                  {(() => {
                                    const highIssues = diagnosis.filter(d => d.severity === 'high').length;
                                    const mediumIssues = diagnosis.filter(d => d.severity === 'medium').length;
                                    const opportunities = diagnosis.filter(d => d.isOpportunity).length;
                                    
                                    return (
                                      <>
                                        {highIssues > 0 && (
                                          <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                            <span>Address {highIssues} critical issue{highIssues !== 1 ? 's' : ''} immediately</span>
                                          </div>
                                        )}
                                        {mediumIssues > 0 && (
                                          <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                                            <span>Plan fixes for {mediumIssues} moderate issue{mediumIssues !== 1 ? 's' : ''}</span>
                                          </div>
                                        )}
                                        {opportunities > 0 && (
                                          <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            <span>Consider {opportunities} optimization opportunit{opportunities !== 1 ? 'ies' : 'y'}</span>
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                {/* All Metrics */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Performance Metrics
                  </h4>
                  
                  {/* Core Web Vitals - Priority Metrics */}
                  <div className="mb-6">
                    <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">
                      Core Web Vitals
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {coreMetrics.filter(m => ['lcp', 'cls', 'inp'].includes(m.key)).map(metric => {
                        const value = data[metric.key];
                        
                        return (
                          <div key={metric.key} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                {getMetricIcon(metric.key, value)}
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {metric.name}
                                </span>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClassName(metric.key, value)}`}>
                                {getMetricStatus(metric.key, value)}
                              </span>
                            </div>
                            
                            <div className="mb-2">
                              <span className="text-xl font-bold text-gray-900 dark:text-white">
                                {formatMetricValue(metric.key, value)}
                              </span>
                            </div>
                            
                            {getThresholdDisplay(metric.key)}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Other Performance Metrics */}
                  <div className="mb-6">
                    <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">
                      Performance & Loading
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {coreMetrics.filter(m => !['lcp', 'cls', 'inp'].includes(m.key)).map(metric => {
                        const value = data[metric.key];
                        
                        return (
                          <div key={metric.key} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                {getMetricIcon(metric.key, value)}
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {metric.name}
                                </span>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClassName(metric.key, value)}`}>
                                {getMetricStatus(metric.key, value)}
                              </span>
                            </div>
                            
                            <div className="mb-2">
                              <span className="text-xl font-bold text-gray-900 dark:text-white">
                                {formatMetricValue(metric.key, value)}
                              </span>
                            </div>
                            
                            {getThresholdDisplay(metric.key)}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quality Metrics */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">
                      Quality & Best Practices
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {additionalMetrics.map(metric => {
                        const value = data[metric.key];
                        
                        return (
                          <div key={metric.key} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                {getMetricIcon(metric.key, value)}
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {metric.name}
                                </span>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClassName(metric.key, value)}`}>
                                {getMetricStatus(metric.key, value)}
                              </span>
                            </div>
                            
                            <div className="mb-2">
                              <span className="text-xl font-bold text-gray-900 dark:text-white">
                                {formatMetricValue(metric.key, value)}
                              </span>
                            </div>
                            
                            {getThresholdDisplay(metric.key)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })
      ) : (
        // Domain grouped view
        Object.values(getGroupedByDomain()).map(domainGroup => {
          const isDomainCollapsed = collapsedDomains.has(domainGroup.domain);
          
          return (
            <div key={domainGroup.domain} className="bg-card border border-border rounded-lg overflow-hidden">
              {/* Domain Header */}
              <div className="p-6 border-b border-border bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-3 flex-1">
                    {/* Domain collapse toggle */}
                    <button
                      onClick={() => toggleDomainCollapse(domainGroup.domain)}
                      className="p-1 hover:bg-secondary rounded transition-colors mt-1"
                      title={isDomainCollapsed ? 'Expand domain' : 'Collapse domain'}
                    >
                      {isDomainCollapsed ? (
                        <ChevronDown size={18} className="text-muted-foreground" />
                      ) : (
                        <ChevronUp size={18} className="text-muted-foreground" />
                      )}
                    </button>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                          <Folder size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-foreground mb-1">{domainGroup.domain}</h3>
                          <div className="flex items-center space-x-2">
                            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 text-sm rounded-full font-medium">
                              {domainGroup.urls.length} {domainGroup.urls.length === 1 ? 'URL' : 'URLs'}
                            </span>
                            {domainGroup.aggregatedData && (
                              <span className="text-xs text-muted-foreground">
                                Last updated: {new Date(domainGroup.aggregatedData.lastUpdated).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Domain aggregated metrics */}
                      {domainGroup.aggregatedData && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className={`w-3 h-3 rounded-full ${
                                getMetricStatus('performance', domainGroup.aggregatedData.performance) === 'green' ? 'bg-green-500' :
                                getMetricStatus('performance', domainGroup.aggregatedData.performance) === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}></div>
                              <span className="text-sm font-medium text-muted-foreground">Performance</span>
                            </div>
                            <p className="text-lg font-bold text-foreground">
                              {domainGroup.aggregatedData.performance ? Math.round(domainGroup.aggregatedData.performance) : 'N/A'}
                              {domainGroup.aggregatedData.performance && '/100'}
                            </p>
                          </div>
                          
                          <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className={`w-3 h-3 rounded-full ${
                                getMetricStatus('lcp', domainGroup.aggregatedData.lcp) === 'green' ? 'bg-green-500' :
                                getMetricStatus('lcp', domainGroup.aggregatedData.lcp) === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}></div>
                              <span className="text-sm font-medium text-muted-foreground">LCP</span>
                            </div>
                            <p className="text-lg font-bold text-foreground">
                              {domainGroup.aggregatedData.lcp ? `${domainGroup.aggregatedData.lcp.toFixed(1)}s` : 'N/A'}
                            </p>
                          </div>
                          
                          <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className={`w-3 h-3 rounded-full ${
                                getMetricStatus('cls', domainGroup.aggregatedData.cls) === 'green' ? 'bg-green-500' :
                                getMetricStatus('cls', domainGroup.aggregatedData.cls) === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}></div>
                              <span className="text-sm font-medium text-muted-foreground">CLS</span>
                            </div>
                            <p className="text-lg font-bold text-foreground">
                              {domainGroup.aggregatedData.cls ? domainGroup.aggregatedData.cls.toFixed(3) : 'N/A'}
                            </p>
                          </div>
                          
                          <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center space-x-2 mb-2">
                              <AlertTriangle size={14} className={
                                domainGroup.aggregatedData.totalIssues > 0 ? 'text-red-500' : 'text-green-500'
                              } />
                              <span className="text-sm font-medium text-muted-foreground">Issues</span>
                            </div>
                            <p className="text-lg font-bold text-foreground">
                              {domainGroup.aggregatedData.totalIssues || 0}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 ml-4">
                    {/* Domain-level actions */}
                    <button
                      onClick={() => {
                        // Refresh all URLs in this domain
                        domainGroup.urls.forEach(url => handleIndividualRefresh(url));
                      }}
                      className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 text-sm flex items-center space-x-2 transition-all duration-200 font-medium"
                      title="Refresh all URLs in this domain"
                    >
                      <RefreshCw size={14} />
                      <span className="hidden sm:inline">Refresh Domain</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Domain URLs (collapsible) */}
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isDomainCollapsed ? 'max-h-0 opacity-0' : 'max-h-none opacity-100'
              }`}>
                <div className="py-6 bg-gray-50/50 dark:bg-gray-900/30">
                  {domainGroup.urls.map((url, index) => {
                    const data = vitalsData[url.id];
                    const isRefreshingUrl = refreshingUrls.has(url.id);
                    
                    return (
                      <div key={url.id} className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mx-6 shadow-sm hover:shadow-md transition-shadow duration-200 ${
                        index < domainGroup.urls.length - 1 ? 'mb-6' : ''
                      }`}>
                        {/* URL Header */}
                        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start space-x-3 flex-1">
                              {/* Collapse toggle button */}
                              <button
                                onClick={() => toggleUrlCollapse(url.id)}
                                className="p-1 hover:bg-secondary rounded transition-colors mt-1"
                                title={collapsedUrls.has(url.id) ? 'Expand details' : 'Collapse details'}
                              >
                                {collapsedUrls.has(url.id) ? (
                                  <ChevronDown size={18} className="text-muted-foreground" />
                                ) : (
                                  <ChevronUp size={18} className="text-muted-foreground" />
                                )}
                              </button>
                              
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-foreground truncate text-lg mb-1">{url.name}</h4>
                                <a 
                                  href={url.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-muted-foreground hover:text-primary underline break-all"
                                >
                                  {url.url}
                                </a>
                                
                                {/* Status summary when collapsed */}
                                {collapsedUrls.has(url.id) && data && (() => {
                                  const assessment = getCoreWebVitalsAssessment(data);
                                  const diagnosis = getPerformanceDiagnosis(data);
                                  return (
                                    <div className="flex items-center space-x-4 mt-2">
                                      {assessment && (
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                          assessment.overallStatus === 'Good' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                          assessment.overallStatus === 'Needs Improvement' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                          assessment.overallStatus === 'Poor' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                          'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                                        }`}>
                                          {assessment.overallStatus === 'Good' && <CheckCircle size={12} className="mr-1" />}
                                          {assessment.overallStatus === 'Needs Improvement' && <AlertTriangle size={12} className="mr-1" />}
                                          {assessment.overallStatus === 'Poor' && <XCircle size={12} className="mr-1" />}
                                          CWV: {assessment.overallStatus}
                                        </span>
                                      )}
                                      {data.performance !== null && (
                                        <span className="text-xs text-muted-foreground">
                                          Performance: {data.performance}/100
                                        </span>
                                      )}
                                      {diagnosis && diagnosis.length > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                          {diagnosis.filter(d => d.severity === 'high').length} critical issues
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                                
                                {/* Last updated info */}
                                {data && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Last updated: {new Date(data.timestamp).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 ml-4">
                              {/* Individual refresh button */}
                              <button
                                onClick={() => handleIndividualRefresh(url)}
                                disabled={isRefreshingUrl || isRefreshing}
                                className="btn-secondary text-sm flex items-center space-x-1 disabled:opacity-50"
                                title="Refresh this site"
                              >
                                <RefreshCw size={14} className={isRefreshingUrl ? 'animate-spin' : ''} />
                                <span className="hidden sm:inline">
                                  {isRefreshingUrl ? 'Refreshing...' : 'Refresh'}
                                </span>
                              </button>
                              
                              {/* View trends button */}
                              {data && (
                                <button
                                  onClick={() => {
                                    setSelectedUrl(url.id);
                                    setShowChart(true);
                                  }}
                                  className="btn-secondary text-sm"
                                >
                                  Trends
                                </button>
                              )}
                              
                              {/* Delete button */}
                              <button
                                onClick={() => handleDeleteUrl(url)}
                                className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all duration-200"
                                title={`Remove ${url.name}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Collapsible content */}
                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                          !collapsedUrls.has(url.id) ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                        }`}>
                          <div className="p-6 space-y-8">
                            {!data ? (
                              <div className="text-center py-8">
                                <div className="text-muted-foreground">
                                  No data available. Click &quot;Refresh&quot; to fetch vitals.
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-6">
                              {/* Show warning if performance data is missing */}
                              {!hasPerformanceData(data) && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                  <div className="flex items-start space-x-3">
                                    <AlertTriangle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                        Limited Data Available
                                      </h5>
                                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                        Missing: {getMissingCategories(data).join(', ')}. 
                                        This might be due to API limitations or category restrictions.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            
                            
                            {/* Core Web Vitals Assessment */}
                            {(() => {
                              const assessment = getCoreWebVitalsAssessment(data);
                              if (!assessment) return null;
                              
                              return (
                                <div className={`border rounded-lg p-4 ${assessment.overallColor}`}>
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <h4 className="text-sm font-semibold">
                                          Core Web Vitals Assessment
                                        </h4>
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/20 dark:bg-black/20">
                                          {assessment.overallStatus}
                                        </span>
                                      </div>
                                      
                                      <p className="text-sm mb-3">
                                        {assessment.overallMessage}
                                      </p>
                                      
                                      {/* Individual vital status indicators */}
                                      <div className="flex flex-wrap gap-2">
                                        {assessment.vitalStatuses.map(vital => (
                                          <div
                                            key={vital.key}
                                            className={`px-2 py-1 rounded text-xs font-medium flex items-center space-x-1 ${
                                              vital.status === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                              vital.status === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                              vital.status === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                              'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                                            }`}
                                          >
                                            {vital.status === 'green' && <CheckCircle size={12} />}
                                            {vital.status === 'yellow' && <AlertTriangle size={12} />}
                                            {vital.status === 'red' && <XCircle size={12} />}
                                            {vital.status === 'unknown' && <Minus size={12} />}
                                            <span>{vital.name}</span>
                                            {vital.value !== null && vital.value !== undefined && (
                                              <span className="opacity-75">
                                                {formatMetricValue(vital.key, vital.value)}
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    
                                    {/* Summary stats */}
                                    <div className="ml-4 text-right">
                                      <div className="text-2xl font-bold">
                                        {assessment.passCount}/{assessment.totalCount}
                                      </div>
                                      <div className="text-xs opacity-75">
                                        passing
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                            
                            {/* Performance Diagnosis */}
                            {(() => {
                              const diagnosis = getPerformanceDiagnosis(data);
                              if (!diagnosis || diagnosis.length === 0) return null;
                              
                              // Start collapsed by default for cleaner UI
                              const isDiagnosisCollapsed = !collapsedDiagnosis.has(url.id);
                              
                              return (
                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                  <div 
                                    className={`flex items-center justify-between mb-4 ${
                                      isDiagnosisCollapsed ? 'cursor-pointer hover:bg-secondary/30 -m-2 p-2 rounded transition-colors' : ''
                                    }`}
                                    onClick={isDiagnosisCollapsed ? () => toggleDiagnosisCollapse(url.id) : undefined}
                                    title={isDiagnosisCollapsed ? 'Click to expand diagnosis details' : undefined}
                                  >
                                    <div className="flex items-center space-x-2">
                                      <Zap className="text-blue-600 dark:text-blue-400" size={16} />
                                      <h4 className="text-sm font-semibold text-foreground">
                                        Performance Diagnosis
                                      </h4>
                                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium">
                                        {diagnosis.length} issue{diagnosis.length !== 1 ? 's' : ''} found
                                      </span>
                                    </div>
                                    
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleDiagnosisCollapse(url.id);
                                      }}
                                      className="p-1 hover:bg-secondary rounded transition-colors"
                                      title={isDiagnosisCollapsed ? 'Expand diagnosis' : 'Collapse diagnosis'}
                                    >
                                      {isDiagnosisCollapsed ? (
                                        <ChevronDown size={16} className="text-muted-foreground" />
                                      ) : (
                                        <ChevronUp size={16} className="text-muted-foreground" />
                                      )}
                                    </button>
                                  </div>
                                  
                                  {/* Collapsed state summary */}
                                  <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                                    isDiagnosisCollapsed ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'
                                  }`}>
                                    <div className="text-xs text-muted-foreground pt-2 border-t border-gray-200 dark:border-gray-700">
                                      <div className="flex items-center space-x-4">
                                        {(() => {
                                          const highIssues = diagnosis.filter(d => d.severity === 'high').length;
                                          const mediumIssues = diagnosis.filter(d => d.severity === 'medium').length;
                                          const opportunities = diagnosis.filter(d => d.isOpportunity).length;
                                          
                                          return (
                                            <>
                                              {highIssues > 0 && (
                                                <span className="flex items-center space-x-1">
                                                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                                  <span>{highIssues} critical</span>
                                                </span>
                                              )}
                                              {mediumIssues > 0 && (
                                                <span className="flex items-center space-x-1">
                                                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                                                  <span>{mediumIssues} moderate</span>
                                                </span>
                                              )}
                                              {opportunities > 0 && (
                                                <span className="flex items-center space-x-1">
                                                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                                  <span>{opportunities} opportunit{opportunities !== 1 ? 'ies' : 'y'}</span>
                                                </span>
                                              )}
                                              <span>Click to expand details</span>
                                            </>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Expanded diagnosis content */}
                                  <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                                    !isDiagnosisCollapsed ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                                  }`}>
                                    <div className="space-y-4 pt-2">
                                      {diagnosis.map((item, index) => (
                                        <div key={index} className={`border-l-4 pl-4 py-3 rounded-r-lg bg-gradient-to-r ${
                                          item.severity === 'high' ? 'border-l-red-500 from-red-50/50 to-transparent dark:from-red-900/10' :
                                          item.severity === 'medium' ? 'border-l-yellow-500 from-yellow-50/50 to-transparent dark:from-yellow-900/10' :
                                          'border-l-blue-500 from-blue-50/50 to-transparent dark:from-blue-900/10'
                                        }`}>
                                          <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center space-x-2">
                                              {item.severity === 'high' && (
                                                <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
                                                  <XCircle size={14} />
                                                  <span className="text-xs font-bold">CRITICAL</span>
                                                </div>
                                              )}
                                              {item.severity === 'medium' && (
                                                <div className="flex items-center space-x-1 text-yellow-600 dark:text-yellow-400">
                                                  <AlertTriangle size={14} />
                                                  <span className="text-xs font-bold">MODERATE</span>
                                                </div>
                                              )}
                                              {item.isOpportunity && (
                                                <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                                                  <Zap size={12} />
                                                  <span className="text-xs font-bold">OPPORTUNITY</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          
                                          <h5 className="font-medium text-sm text-foreground mb-1">
                                            {item.issue}
                                          </h5>
                                          
                                          <p className="text-xs text-muted-foreground mb-3">
                                            {item.description}
                                          </p>
                                          
                                          <div className="space-y-1">
                                            <div className="text-xs font-medium text-foreground mb-1">
                                              Recommendations:
                                            </div>
                                            <ul className="text-xs text-muted-foreground space-y-1">
                                              {item.recommendations.slice(0, 3).map((rec, recIndex) => (
                                                <li key={recIndex} className="flex items-start space-x-2">
                                                  <span className="text-blue-500 mt-1">•</span>
                                                  <span>{rec}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        </div>
                                      ))}
                                      
                                      {diagnosis.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                                          <div className="space-y-2">
                                            <div className="flex items-center space-x-2 text-xs font-medium text-foreground">
                                              <Eye size={12} />
                                              <span>Action Plan Priority</span>
                                            </div>
                                            
                                            <div className="text-xs text-muted-foreground space-y-1">
                                              {(() => {
                                                const highIssues = diagnosis.filter(d => d.severity === 'high').length;
                                                const mediumIssues = diagnosis.filter(d => d.severity === 'medium').length;
                                                const opportunities = diagnosis.filter(d => d.isOpportunity).length;
                                                
                                                return (
                                                  <>
                                                    {highIssues > 0 && (
                                                      <div className="flex items-center space-x-2">
                                                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                                        <span>Address {highIssues} critical issue{highIssues !== 1 ? 's' : ''} immediately</span>
                                                      </div>
                                                    )}
                                                    {mediumIssues > 0 && (
                                                      <div className="flex items-center space-x-2">
                                                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                                                        <span>Plan fixes for {mediumIssues} moderate issue{mediumIssues !== 1 ? 's' : ''}</span>
                                                      </div>
                                                    )}
                                                    {opportunities > 0 && (
                                                      <div className="flex items-center space-x-2">
                                                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                                        <span>Consider {opportunities} optimization opportunit{opportunities !== 1 ? 'ies' : 'y'}</span>
                                                      </div>
                                                    )}
                                                  </>
                                                );
                                              })()}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                            
                            {/* All Metrics */}
                            <div>
                              <h4 className="text-lg font-semibold text-foreground mb-4">
                                Performance Metrics
                              </h4>
                              
                              {/* Core Web Vitals - Priority Metrics */}
                              <div className="mb-6">
                                <h5 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                                  Core Web Vitals
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {coreMetrics.filter(m => ['lcp', 'cls', 'inp'].includes(m.key)).map(metric => {
                                    const value = data[metric.key];
                                    
                                    return (
                                      <div key={metric.key} className="bg-secondary/50 border border-border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center space-x-2">
                                            {getMetricIcon(metric.key, value)}
                                            <span className="text-sm font-medium text-foreground">
                                              {metric.name}
                                            </span>
                                          </div>
                                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClassName(metric.key, value)}`}>
                                            {getMetricStatus(metric.key, value)}
                                          </span>
                                        </div>
                                        
                                        <div className="mb-2">
                                          <span className="text-xl font-bold text-foreground">
                                            {formatMetricValue(metric.key, value)}
                                          </span>
                                        </div>
                                        
                                        {getThresholdDisplay(metric.key)}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Other Performance Metrics */}
                              <div className="mb-6">
                                <h5 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                                  Performance & Loading
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {coreMetrics.filter(m => !['lcp', 'cls', 'inp'].includes(m.key)).map(metric => {
                                    const value = data[metric.key];
                                    
                                    return (
                                      <div key={metric.key} className="bg-secondary/50 border border-border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center space-x-2">
                                            {getMetricIcon(metric.key, value)}
                                            <span className="text-sm font-medium text-foreground">
                                              {metric.name}
                                            </span>
                                          </div>
                                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClassName(metric.key, value)}`}>
                                            {getMetricStatus(metric.key, value)}
                                          </span>
                                        </div>
                                        
                                        <div className="mb-2">
                                          <span className="text-xl font-bold text-foreground">
                                            {formatMetricValue(metric.key, value)}
                                          </span>
                                        </div>
                                        
                                        {getThresholdDisplay(metric.key)}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Quality Metrics */}
                              <div>
                                <h5 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                                  Quality & Best Practices
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {additionalMetrics.map(metric => {
                                    const value = data[metric.key];
                                    
                                    return (
                                      <div key={metric.key} className="bg-secondary/50 border border-border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center space-x-2">
                                            {getMetricIcon(metric.key, value)}
                                            <span className="text-sm font-medium text-foreground">
                                              {metric.name}
                                            </span>
                                          </div>
                                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClassName(metric.key, value)}`}>
                                            {getMetricStatus(metric.key, value)}
                                          </span>
                                        </div>
                                        
                                        <div className="mb-2">
                                          <span className="text-xl font-bold text-foreground">
                                            {formatMetricValue(metric.key, value)}
                                          </span>
                                        </div>
                                        
                                        {getThresholdDisplay(metric.key)}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                            
                            </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Chart Modal */}
      {showChart && selectedUrl && (
        <VitalsChart
          urlId={selectedUrl}
          urlName={trackedUrls.find(u => u.id === selectedUrl)?.name}
          onClose={() => {
            setShowChart(false);
            setSelectedUrl(null);
          }}
        />
      )}
    </div>
  );
}