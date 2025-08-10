'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Clock, ExternalLink, FileText, TrendingUp, AlertTriangle, CheckCircle, Zap, Globe, Monitor, Accessibility, Download, GitBranch, Users, Loader, ChevronDown, ChevronUp, Eye, Target, Rocket, Award } from 'lucide-react';

export default function LighthouseReports() {
  const [githubReports, setGithubReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedReports, setExpandedReports] = useState(new Set());
  const [lighthouseData, setLighthouseData] = useState({});

  useEffect(() => {
    fetchGithubReports();
  }, []);



  const fetchGithubReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch GitHub Actions Lighthouse reports
      const response = await fetch('/api/github-lighthouse-reports');
      
      if (response.ok) {
        const data = await response.json();
        setGithubReports(data.reports || []);
        
        // Handle empty results
        if (!data.reports || data.reports.length === 0) {
          if (data.meta?.total_runs === 0) {
            setError({
              type: 'info',
              title: 'No workflow runs found',
              message: 'No Lighthouse CI workflows have been executed yet.',
              help: 'Push code changes to trigger your first Lighthouse CI run.',
              action: 'Try making a small change and pushing to your repository'
            });
          } else {
            setError({
              type: 'warning',
              title: 'No reports with artifacts',
              message: `Found ${data.meta.total_runs} workflow runs, but none have Lighthouse artifacts.`,
              help: 'This may happen if workflows were skipped or failed before generating reports.',
              action: 'Check your recent workflow runs in GitHub Actions'
            });
          }
        }
      } else {
        const errorData = await response.json();
        
        if (response.status === 401) {
          setError({
            type: 'error',
            title: 'GitHub Token Required',
            message: errorData.message || 'GitHub authentication failed',
            help: errorData.help || 'Please configure your GitHub token in environment variables',
            action: 'Set GITHUB_TOKEN in your .env.local file'
          });
        } else if (response.status === 403) {
          setError({
            type: 'error',
            title: 'Permission Denied',
            message: errorData.message || 'GitHub access forbidden',
            help: errorData.help || 'Token lacks required permissions',
            action: 'Ensure your GitHub token has "actions:read" permission'
          });
        } else if (response.status === 404) {
          setError({
            type: 'error',
            title: 'Repository Not Found',
            message: errorData.message || 'Repository or workflow not found',
            help: errorData.help || 'Check repository configuration',
            action: 'Verify GITHUB_REPOSITORY_OWNER and GITHUB_REPOSITORY_NAME'
          });
        } else if (response.status === 429) {
          setError({
            type: 'warning',
            title: 'Rate Limit Exceeded',
            message: errorData.message || 'Too many requests to GitHub API',
            help: errorData.help || 'Please wait before retrying',
            action: 'Try again in a few minutes'
          });
        } else {
          setError({
            type: 'error',
            title: 'API Error',
            message: errorData.message || 'Failed to fetch GitHub reports',
            help: errorData.help || 'Unknown error occurred',
            action: 'Check browser console for more details'
          });
        }
      }
    } catch (err) {
      console.error('GitHub reports fetch failed:', err);
      
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError({
          type: 'error',
          title: 'Network Error',
          message: 'Unable to connect to the API',
          help: 'Check your internet connection and server status',
          action: 'Ensure the development server is running'
        });
      } else {
        setError({
          type: 'error',
          title: 'Unexpected Error',
          message: err.message || 'An unexpected error occurred',
          help: 'This may be a temporary issue',
          action: 'Try refreshing the page or check browser console'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadLighthouseData = async (artifactId) => {
    try {
      console.log('🔍 Loading Lighthouse data for artifact:', artifactId);
      const response = await fetch(`/api/github-lighthouse-reports/extract/${artifactId}`);
      
      console.log('📡 Extract API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Extract API response data:', data);
        
        // Store both reports and metadata
        setLighthouseData(prev => ({
          ...prev,
          [artifactId]: {
            reports: data.reports || [],
            metadata: data.metadata,
            message: data.message,
            zipContents: data.zip_contents
          }
        }));
        return data.reports || [];
      } else {
        const errorData = await response.text();
        console.error('❌ Failed to extract Lighthouse data:', response.status, errorData);
        return [];
      }
    } catch (err) {
      console.error('💥 Error loading Lighthouse data:', err);
      return [];
    }
  };

  const toggleReportExpansion = async (runId, artifactId) => {
    const reportKey = `${runId}-${artifactId}`;
    
    if (expandedReports.has(reportKey)) {
      // Collapse
      setExpandedReports(prev => {
        const newSet = new Set(prev);
        newSet.delete(reportKey);
        return newSet;
      });
    } else {
      // Expand and load data if not already loaded
      setExpandedReports(prev => new Set([...prev, reportKey]));
      
      if (!lighthouseData[artifactId]) {
        await loadLighthouseData(artifactId);
      }
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreIcon = (score) => {
    if (score >= 90) return CheckCircle;
    if (score >= 50) return AlertTriangle;
    return AlertTriangle;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const CategoryIcon = ({ category }) => {
    switch (category) {
      case 'performance': return <Zap className="w-4 h-4" />;
      case 'accessibility': return <Accessibility className="w-4 h-4" />;
      case 'best-practices': return <CheckCircle className="w-4 h-4" />;
      case 'seo': return <Globe className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  // Calculate overall performance metrics from all reports
  const getOverallMetrics = () => {
    const allReports = Object.values(lighthouseData).flat();
    if (allReports.length === 0) return null;

    const metrics = {
      averagePerformance: 0,
      averageAccessibility: 0,
      averageSEO: 0,
      averageBestPractices: 0,
      totalReports: allReports.length,
      recentRuns: githubReports.slice(0, 3).length
    };

    allReports.forEach(report => {
      if (report.categories) {
        metrics.averagePerformance += (report.categories.performance?.score || 0) * 100;
        metrics.averageAccessibility += (report.categories.accessibility?.score || 0) * 100;
        metrics.averageSEO += (report.categories.seo?.score || 0) * 100;
        metrics.averageBestPractices += (report.categories['best-practices']?.score || 0) * 100;
      }
    });

    if (allReports.length > 0) {
      metrics.averagePerformance = Math.round(metrics.averagePerformance / allReports.length);
      metrics.averageAccessibility = Math.round(metrics.averageAccessibility / allReports.length);
      metrics.averageSEO = Math.round(metrics.averageSEO / allReports.length);
      metrics.averageBestPractices = Math.round(metrics.averageBestPractices / allReports.length);
    }

    return metrics;
  };

  // Calculate score changes between commits for a specific URL
  const getScoreChange = (currentReport, url, currentRunIndex) => {
    // Find the previous report for the same URL from a different commit
    for (let i = currentRunIndex + 1; i < githubReports.length; i++) {
      const previousRun = githubReports[i];
      for (const artifact of previousRun.artifacts.filter(a => a.name.includes('lighthouse-reports-'))) {
        const previousData = lighthouseData[artifact.id];
        const previousReports = previousData?.reports || previousData || [];
        const previousReport = previousReports.find(r => 
          r.finalDisplayedUrl === url || r.requestedUrl === url || 
          r.finalDisplayedUrl === currentReport.finalDisplayedUrl || 
          r.requestedUrl === currentReport.requestedUrl
        );
        if (previousReport) {
          const currentScore = currentReport.categories.performance.score * 100;
          const previousScore = previousReport.categories.performance.score * 100;
          const change = currentScore - previousScore;
          return {
            change: Math.round(change * 10) / 10, // Round to 1 decimal
            previous: Math.round(previousScore),
            current: Math.round(currentScore),
            trend: change > 0 ? 'up' : change < 0 ? 'down' : 'same'
          };
        }
      }
    }
    return null;
  };

  const overallMetrics = getOverallMetrics();

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <BarChart3 className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">
            Lighthouse Dashboard
          </h2>
        </div>
        <div className="text-center py-12">
          <div className="relative">
            <Loader className="w-10 h-10 animate-spin mx-auto mb-4 text-blue-400" />
            <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-pulse"></div>
          </div>
          <p className="text-gray-300 mb-2 text-lg font-medium">
            Loading Lighthouse Reports
          </p>
          <p className="text-gray-400 text-sm">
            Fetching performance data from GitHub Actions...
          </p>
          <div className="mt-6 flex justify-center">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const isErrorObject = typeof error === 'object';
    const errorType = isErrorObject ? error.type : 'error';
    const errorTitle = isErrorObject ? error.title : 'Error Loading Reports';
    const errorMessage = isErrorObject ? error.message : error;
    const errorHelp = isErrorObject ? error.help : null;
    const errorAction = isErrorObject ? error.action : null;
    
    const iconColors = {
      error: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400',
      warning: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400',
      info: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
    };
    
    const borderColors = {
      error: 'border-red-200 dark:border-red-800',
      warning: 'border-yellow-200 dark:border-yellow-800',
      info: 'border-blue-200 dark:border-blue-800'
    };
    
    return (
      <div className={`bg-gray-900 border ${borderColors[errorType] || borderColors.error} rounded-xl shadow-lg p-6`}>
        <div className="flex items-center space-x-3 mb-6">
          <div className={`p-3 rounded-full ${iconColors[errorType] || iconColors.error}`}>
            {errorType === 'info' ? (
              <HelpCircle className="h-6 w-6" />
            ) : errorType === 'warning' ? (
              <AlertTriangle className="h-6 w-6" />
            ) : (
              <AlertTriangle className="h-6 w-6" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">
              {errorTitle}
            </h2>
          </div>
        </div>
        <div className="space-y-4">
          <p className="text-gray-300 mb-4">{errorMessage}</p>
          
          {errorHelp && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-2">
                <strong>Help:</strong> {errorHelp}
              </p>
              {errorAction && (
                <p className="text-blue-400 text-sm">
                  <strong>Action:</strong> {errorAction}
                </p>
              )}
            </div>
          )}
          
          <div className="flex space-x-3">
            <button
              onClick={fetchGithubReports}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Retry</span>
            </button>
            
            {errorType === 'error' && (
              <a
                href="/.github/GITHUB_INTEGRATION_SETUP.md"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors flex items-center space-x-2"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Setup Guide</span>
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="space-y-8">
      {/* Apple-Style Dark Hero Section */}
      <div className="relative bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-800">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800/30 to-gray-900/30"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        
        <div className="relative p-8 md:p-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Clear Hero Content with Explanation */}
            <div className="flex items-start space-x-4">
              <div className="bg-blue-600/20 border border-blue-500/30 p-4 rounded-2xl shadow-lg">
                <TrendingUp className="w-10 h-10 text-blue-400" />
              </div>
              <div>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                  Lighthouse Dashboard
                </h2>
                <p className="text-gray-300 text-lg max-w-2xl leading-relaxed font-light mb-3">
                  Automated <strong className="text-blue-400">Google Lighthouse</strong> performance analysis for every code change.
                </p>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 max-w-2xl">
                  <p className="text-gray-400 text-sm leading-relaxed">
                    <strong className="text-white">What is Lighthouse?</strong> Google's open-source tool that measures website 
                    <strong className="text-green-400"> Performance</strong>, 
                    <strong className="text-blue-400"> Accessibility</strong>, 
                    <strong className="text-purple-400"> SEO</strong>, and 
                    <strong className="text-yellow-400"> Best Practices</strong> with scores from 0-100.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Apple-Style Action Button */}
            <div className="flex-shrink-0">
              <button
                onClick={fetchGithubReports}
                className="bg-blue-500 hover:bg-blue-400 text-white px-6 py-3 rounded-2xl font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-3 border border-blue-400/20"
                aria-label="Refresh Lighthouse reports from GitHub Actions"
                title="Refresh reports"
              >
                <TrendingUp className="w-5 h-5" />
                <span>Refresh Data</span>
              </button>
            </div>
          </div>

          {/* Apple-Style Performance Cards */}
          {overallMetrics ? (
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Performance Card */}
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 hover:bg-gray-750 transition-all duration-300 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-orange-500/20 border border-orange-500/30 p-3 rounded-xl">
                    <Zap className="w-6 h-6 text-orange-400" />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    overallMetrics.averagePerformance >= 90 ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    overallMetrics.averagePerformance >= 50 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                    'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {overallMetrics.averagePerformance >= 90 ? 'Great' : overallMetrics.averagePerformance >= 50 ? 'Good' : 'Poor'}
                  </span>
                </div>
                <h3 className="text-gray-400 font-medium mb-1">Performance</h3>
                <p className="text-3xl font-bold text-white">{overallMetrics.averagePerformance}</p>
              </div>

              {/* Accessibility Card */}
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 hover:bg-gray-750 transition-all duration-300 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-blue-500/20 border border-blue-500/30 p-3 rounded-xl">
                    <Accessibility className="w-6 h-6 text-blue-400" />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    overallMetrics.averageAccessibility >= 90 ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    overallMetrics.averageAccessibility >= 50 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                    'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {overallMetrics.averageAccessibility >= 90 ? 'Great' : overallMetrics.averageAccessibility >= 50 ? 'Good' : 'Poor'}
                  </span>
                </div>
                <h3 className="text-gray-400 font-medium mb-1">Accessibility</h3>
                <p className="text-3xl font-bold text-white">{overallMetrics.averageAccessibility}</p>
              </div>

              {/* Best Practices Card */}
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 hover:bg-gray-750 transition-all duration-300 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-green-500/20 border border-green-500/30 p-3 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    overallMetrics.averageBestPractices >= 90 ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    overallMetrics.averageBestPractices >= 50 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                    'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {overallMetrics.averageBestPractices >= 90 ? 'Great' : overallMetrics.averageBestPractices >= 50 ? 'Good' : 'Poor'}
                  </span>
                </div>
                <h3 className="text-gray-400 font-medium mb-1">Best Practices</h3>
                <p className="text-3xl font-bold text-white">{overallMetrics.averageBestPractices}</p>
              </div>

              {/* SEO Card */}
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 hover:bg-gray-750 transition-all duration-300 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-purple-500/20 border border-purple-500/30 p-3 rounded-xl">
                    <Globe className="w-6 h-6 text-purple-400" />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    overallMetrics.averageSEO >= 90 ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    overallMetrics.averageSEO >= 50 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                    'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {overallMetrics.averageSEO >= 90 ? 'Great' : overallMetrics.averageSEO >= 50 ? 'Good' : 'Poor'}
                  </span>
                </div>
                <h3 className="text-gray-400 font-medium mb-1">SEO</h3>
                <p className="text-3xl font-bold text-white">{overallMetrics.averageSEO}</p>
              </div>
            </div>
          ) : (
            <div className="mt-8 bg-gray-800 border border-gray-700 rounded-2xl p-8 text-center">
              <div className="bg-gray-700 border border-gray-600 p-4 rounded-2xl w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Target className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Ready to Monitor Performance
              </h3>
              <p className="text-gray-300 text-base leading-relaxed max-w-md mx-auto">
                Push code changes to trigger automated Lighthouse CI and see your team's performance metrics
              </p>
            </div>
          )}

          {/* Apple-Style Stats Bar */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center space-x-3 bg-gray-800/60 border border-gray-700/60 px-4 py-2 rounded-full backdrop-blur-sm">
              <GitBranch className="w-5 h-5 text-gray-300" />
              <span className="font-medium text-gray-300">{githubReports.length} Workflow Runs</span>
            </div>
            {overallMetrics && (
              <>
                <div className="flex items-center space-x-3 bg-gray-800/60 border border-gray-700/60 px-4 py-2 rounded-full backdrop-blur-sm">
                  <BarChart3 className="w-5 h-5 text-gray-300" />
                  <span className="font-medium text-gray-300">{overallMetrics.totalReports} Reports</span>
                </div>
                <div className="flex items-center space-x-3 bg-gray-800/60 border border-gray-700/60 px-4 py-2 rounded-full backdrop-blur-sm">
                  <Award className="w-5 h-5 text-gray-300" />
                  <span className="font-medium text-gray-300">{overallMetrics.recentRuns} Recent</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Apple-Style Reports Section */}
      <section className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden" aria-labelledby="recent-reports-heading">
        <div className="p-8 border-b border-gray-800">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-gray-800 border border-gray-700 p-3 rounded-xl">
              <FileText className="w-6 h-6 text-gray-300" />
            </div>
            <div>
              <h2 id="recent-reports-heading" className="text-2xl font-bold text-white tracking-tight">
                Recent Reports
              </h2>
              <p className="text-gray-400 text-base font-light">
                Latest Lighthouse audits from your team's GitHub Actions
              </p>
            </div>
          </div>
        </div>

      {/* GitHub Actions Reports */}
        <div className="p-8">
          {githubReports.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gray-800 border border-gray-700 p-6 rounded-3xl w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <GitBranch className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                No Reports Yet
              </h3>
              <p className="text-gray-400 mb-4 text-base leading-relaxed max-w-md mx-auto">
                GitHub Actions Lighthouse reports will appear here when your team pushes code changes.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 max-w-lg mx-auto">
                <p className="text-blue-400 text-sm">
                  💡 <strong>Tip:</strong> Make sure your GitHub token is configured and workflows are running
                </p>
              </div>
            </div>
          ) : (
            githubReports.map((run, index) => {
              const previousRun = index < githubReports.length - 1 ? githubReports[index + 1] : null;
              
              return (
                <div
                  key={run.run_id}
                  className="bg-gray-850 border border-gray-700 rounded-xl p-6 hover:bg-gray-800 transition-all duration-200 mb-4 shadow-lg"
                >
                  {/* Enhanced Run Header with Commit Details */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4">
                      {/* Status Indicator */}
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-2 shadow-sm ${
                        run.conclusion === 'success' ? 'bg-green-400 shadow-green-400/50' :
                        run.conclusion === 'failure' ? 'bg-red-400 shadow-red-400/50' :
                        'bg-yellow-400 shadow-yellow-400/50'
                      }`}></div>
                      
                      {/* Author Avatar & Details */}
                      <div className="flex items-start space-x-3">
                        <img 
                          src={run.commit_author?.avatar_url || `https://github.com/${run.triggered_by}.png`}
                          alt={run.commit_author?.name || run.triggered_by}
                          className="w-10 h-10 rounded-full border-2 border-gray-600 flex-shrink-0"
                        />
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-white text-lg">
                              {run.commit_author?.name || run.triggered_by}
                            </h3>
                            {run.pr_number && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                PR #{run.pr_number}
                              </span>
                            )}
                          </div>
                          
                          {/* Commit Message */}
                          <p className="text-gray-300 text-sm mb-2 leading-relaxed max-w-2xl">
                            {run.commit_message?.split('\n')[0] || 'No commit message available'}
                          </p>
                          
                          {/* Commit Meta */}
                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <span className="flex items-center space-x-1 bg-gray-700/50 px-2 py-1 rounded-md">
                              <GitBranch className="w-4 h-4" />
                              <span>{run.branch}</span>
                            </span>
                            <span className="flex items-center space-x-1 bg-gray-700/50 px-2 py-1 rounded-md">
                              <Clock className="w-4 h-4" />
                              <span>{formatTimestamp(run.created_at)}</span>
                            </span>
                            <span className="font-mono text-xs bg-gray-700/50 px-2 py-1 rounded-md">
                              {run.commit_sha.substring(0, 7)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Workflow Status */}
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-300 mb-1">
                        Run #{run.workflow_run_number}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        run.conclusion === 'success' 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : run.conclusion === 'failure'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {run.conclusion === 'success' ? '✓ Success' : 
                         run.conclusion === 'failure' ? '✗ Failed' : '⋯ Running'}
                      </div>
                    </div>
                  </div>

                {/* Clear Performance Analysis Dashboard */}
                <div className="space-y-4">
                  {/* Section Header with Clear Explanation */}
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <BarChart3 className="w-5 h-5 text-blue-400" />
                      <h4 className="text-lg font-semibold text-white">Performance Analysis Results</h4>
                    </div>
                    <p className="text-gray-400 text-sm">
                      This commit was analyzed for performance, accessibility, SEO, and best practices using Google Lighthouse.
                    </p>
                  </div>
                  
                  {run.artifacts
                    .filter(artifact => 
                      artifact.name.includes('lighthouse-reports-') || 
                      artifact.name.includes('lighthouse-summary-')
                    )
                    .map(artifact => {
                      const reportKey = `${run.run_id}-${artifact.id}`;
                      const isExpanded = expandedReports.has(reportKey);
                      const artifactData = lighthouseData[artifact.id];
                      const reports = artifactData?.reports || artifactData || [];
                      const isMainReport = artifact.name.includes('lighthouse-reports-');
                      const isSummary = artifact.name.includes('lighthouse-summary-');
                      
                      return (
                        <div key={artifact.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg">
                          <div className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-750 to-gray-800 hover:from-gray-700 hover:to-gray-750 transition-all duration-200">
                            <div className="flex items-center space-x-4">
                              {/* Clear Visual Indicators */}
                              <div className={`p-3 rounded-xl border flex items-center justify-center ${
                                isMainReport 
                                  ? (reports.length > 0 
                                    ? 'bg-green-600/20 border-green-500/30' 
                                    : 'bg-yellow-600/20 border-yellow-500/30')
                                  : 'bg-blue-600/20 border-blue-500/30'
                              }`}>
                                {isMainReport ? (
                                  reports.length > 0 ? (
                                    <TrendingUp className="w-6 h-6 text-green-400" />
                                  ) : (
                                    <AlertTriangle className="w-6 h-6 text-yellow-400" />
                                  )
                                ) : (
                                  <FileText className="w-6 h-6 text-blue-400" />
                                )}
                              </div>
                              
                              <div className="flex-1">
                                {/* Clear Titles and Descriptions */}
                                <div className="flex items-center space-x-3 mb-2">
                                  <h5 className="font-semibold text-white text-lg">
                                    {isMainReport ? '📊 Performance Scores & Metrics' : '📋 Workflow Execution Details'}
                                  </h5>
                                  
                                  {isMainReport && reports.length > 0 && (
                                    <span className="bg-green-600/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium border border-green-500/30">
                                      ✅ {reports.length} Page{reports.length !== 1 ? 's' : ''} Analyzed
                                    </span>
                                  )}
                                  
                                  {isMainReport && reports.length === 0 && (
                                    <span className="bg-yellow-600/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-medium border border-yellow-500/30">
                                      ⚠️ No Scores Available
                                    </span>
                                  )}
                                  
                                  {isSummary && (
                                    <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-sm font-medium border border-blue-500/30">
                                      ℹ️ Debug Info
                                    </span>
                                  )}
                                </div>
                                
                                <p className="text-gray-300 text-sm leading-relaxed">
                                  {isMainReport 
                                    ? (reports.length > 0 
                                      ? `View detailed performance scores (0-100), Core Web Vitals, and optimization recommendations for ${reports.length} page${reports.length !== 1 ? 's' : ''}` 
                                      : 'Performance analysis was attempted but no scores were generated (likely due to quality gate failures or testing issues)')
                                    : 'Technical details about the workflow execution, including exit codes, error messages, and troubleshooting information'
                                  }
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => toggleReportExpansion(run.run_id, artifact.id)}
                                className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 border shadow-sm ${
                                  isMainReport 
                                    ? (reports.length > 0 
                                      ? 'bg-green-600 hover:bg-green-500 text-white border-green-500/30 hover:border-green-400/50'
                                      : 'bg-yellow-600 hover:bg-yellow-500 text-white border-yellow-500/30 hover:border-yellow-400/50')
                                    : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500/30 hover:border-blue-400/50'
                                }`}
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="w-4 h-4" />
                                    <span>Hide Details</span>
                                  </>
                                ) : (
                                  <>
                                    {isMainReport ? (
                                      reports.length > 0 ? (
                                        <TrendingUp className="w-4 h-4" />
                                      ) : (
                                        <AlertTriangle className="w-4 h-4" />
                                      )
                                    ) : (
                                      <FileText className="w-4 h-4" />
                                    )}
                                    <span>
                                      {isMainReport 
                                        ? (reports.length > 0 ? 'View Performance Scores' : 'View Analysis Details')
                                        : 'View Execution Info'
                                      }
                                    </span>
                                    <ChevronDown className="w-4 h-4" />
                                  </>
                                )}
                              </button>
                              <a
                                href={artifact.download_url}
                                className="text-gray-400 hover:text-blue-400 transition-colors duration-200 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600 hover:border-blue-500/30"
                                title="Download ZIP"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                          
                          {/* Enhanced Expanded Reports with Score Tracking */}
                          {isExpanded && (
                            <div className="p-6 border-t border-gray-700 bg-gray-900">
                              {reports.length === 0 ? (
                                <div className="text-center py-8">
                                  {artifactData?.message || artifact.name.includes('lighthouse-summary-') ? (
                                    <div>
                                      <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                        <FileText className="w-8 h-8 text-blue-400" />
                                      </div>
                                      <h4 className="text-white font-medium mb-2">
                                        {artifactData?.message ? 'No Reports Available' : 'Workflow Summary'}
                                      </h4>
                                      <p className="text-gray-400 mb-4">
                                        {artifactData?.message || 'This workflow run was skipped or did not generate detailed Lighthouse reports.'}
                                      </p>
                                      
                                      {artifactData?.metadata && (
                                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 max-w-md mx-auto mb-4 text-left">
                                          <h5 className="text-white font-medium mb-2">Workflow Details:</h5>
                                          <div className="text-sm text-gray-400 space-y-1">
                                            {artifactData.metadata.lighthouse_exit_code && (
                                              <div>Exit Code: <span className="text-blue-400">{artifactData.metadata.lighthouse_exit_code}</span></div>
                                            )}
                                            {artifactData.metadata.urls_tested && (
                                              <div>URLs Tested: <span className="text-blue-400">{artifactData.metadata.urls_tested}</span></div>
                                            )}
                                            {artifactData.metadata.triggered_by && (
                                              <div>Triggered By: <span className="text-blue-400">{artifactData.metadata.triggered_by}</span></div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {artifactData?.zipContents && (
                                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 max-w-md mx-auto mb-4">
                                          <h5 className="text-white font-medium mb-2">Artifact Contents:</h5>
                                          <div className="text-xs text-gray-500 max-h-32 overflow-y-auto">
                                            {artifactData.zipContents.map((file, idx) => (
                                              <div key={idx}>{file}</div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 max-w-md mx-auto">
                                        <h5 className="text-white font-medium mb-2">Possible Reasons:</h5>
                                        <ul className="text-sm text-gray-400 space-y-1 text-left">
                                          <li>• No page-related changes detected</li>
                                          <li>• Workflow was cancelled or failed early</li>
                                          <li>• Only configuration files were modified</li>
                                          <li>• Lighthouse CI assertion failures</li>
                                        </ul>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <Loader className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-400" />
                                      <p className="text-gray-400">Loading Lighthouse reports...</p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-6">
                                  {reports.map((report, reportIndex) => {
                                    const scoreChange = getScoreChange(report, report.finalDisplayedUrl || report.requestedUrl, index);
                                    
                                    return (
                                      <div key={reportIndex} className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:bg-gray-750 transition-all duration-200">
                                        {/* Report Header with Score Change Tracking */}
                                        <div className="flex items-start justify-between mb-4">
                                          <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                              <h4 className="font-semibold text-white text-lg">
                                                {report.finalDisplayedUrl || report.requestedUrl || report.url}
                                              </h4>
                                              {scoreChange && (
                                                <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${
                                                  scoreChange.trend === 'up' 
                                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                                    : scoreChange.trend === 'down'
                                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                                }`}>
                                                  {scoreChange.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                                                  {scoreChange.trend === 'down' && <TrendingUp className="w-4 h-4 rotate-180" />}
                                                  {scoreChange.trend === 'same' && <span>—</span>}
                                                  <span>{scoreChange.change > 0 ? '+' : ''}{scoreChange.change}</span>
                                                </div>
                                              )}
                                            </div>
                                            <p className="text-gray-400 text-sm">
                                              Tested on {new Date(report.fetchTime).toLocaleString()}
                                            </p>
                                            {scoreChange && (
                                              <p className="text-gray-500 text-xs mt-1">
                                                Performance: {scoreChange.previous} → {scoreChange.current}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {/* Enhanced Performance Scores */}
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                          {Object.entries(report.categories || {}).map(([category, data]) => {
                                            const score = Math.round(data.score * 100);
                                            
                                            return (
                                              <div key={category} className="bg-gray-700 border border-gray-600 rounded-lg p-4 hover:bg-gray-650 transition-colors duration-200">
                                                <div className="flex items-center space-x-3 mb-2">
                                                  <div className={`p-2 rounded-lg ${
                                                    category === 'performance' ? 'bg-orange-500/20 border border-orange-500/30' :
                                                    category === 'accessibility' ? 'bg-blue-500/20 border border-blue-500/30' :
                                                    category === 'best-practices' ? 'bg-green-500/20 border border-green-500/30' :
                                                    'bg-purple-500/20 border border-purple-500/30'
                                                  }`}>
                                                    <CategoryIcon category={category} />
                                                  </div>
                                                  <div>
                                                    <p className="text-sm font-medium text-gray-300 capitalize">
                                                      {category.replace('-', ' ')}
                                                    </p>
                                                    <p className="text-2xl font-bold text-white">{score}</p>
                                                  </div>
                                                </div>
                                                <div className={`w-full h-2 rounded-full ${
                                                  score >= 90 ? 'bg-green-500/30' :
                                                  score >= 50 ? 'bg-yellow-500/30' : 'bg-red-500/30'
                                                }`}>
                                                  <div
                                                    className={`h-2 rounded-full transition-all duration-500 ${
                                                      score >= 90 ? 'bg-green-400' :
                                                      score >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                                                    }`}
                                                    style={{ width: `${score}%` }}
                                                  ></div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                        
                                        {/* Core Web Vitals with Enhanced Styling */}
                                        {report.audits && (
                                          <div className="bg-gray-750 border border-gray-600 rounded-lg p-4">
                                            <h5 className="text-white font-medium mb-3 flex items-center space-x-2">
                                              <Target className="w-4 h-4 text-blue-400" />
                                              <span>Core Web Vitals</span>
                                            </h5>
                                            <div className="grid grid-cols-3 gap-4">
                                              {report.audits['largest-contentful-paint'] && (
                                                <div className="text-center bg-gray-700 rounded-lg p-3 border border-gray-600">
                                                  <p className="font-medium text-white mb-1">LCP</p>
                                                  <p className="text-blue-400 font-mono text-sm">
                                                    {report.audits['largest-contentful-paint'].displayValue || 
                                                     `${Math.round(report.audits['largest-contentful-paint'].numericValue / 10) / 100}s`}
                                                  </p>
                                                </div>
                                              )}
                                              {report.audits['cumulative-layout-shift'] && (
                                                <div className="text-center bg-gray-700 rounded-lg p-3 border border-gray-600">
                                                  <p className="font-medium text-white mb-1">CLS</p>
                                                  <p className="text-green-400 font-mono text-sm">
                                                    {report.audits['cumulative-layout-shift'].displayValue || 
                                                     Math.round(report.audits['cumulative-layout-shift'].numericValue * 1000) / 1000}
                                                  </p>
                                                </div>
                                              )}
                                              {report.audits['interaction-to-next-paint'] && (
                                                <div className="text-center bg-gray-700 rounded-lg p-3 border border-gray-600">
                                                  <p className="font-medium text-white mb-1">INP</p>
                                                  <p className="text-orange-400 font-mono text-sm">
                                                    {report.audits['interaction-to-next-paint'].displayValue ||
                                                     `${Math.round(report.audits['interaction-to-next-paint'].numericValue)}ms`}
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {run.pr_number && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-sm text-gray-400">
                      Pull Request #{run.pr_number}
                    </p>
                  </div>
                )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
