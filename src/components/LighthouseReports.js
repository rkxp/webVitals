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
      // Fetch GitHub Actions Lighthouse reports
      const response = await fetch('/api/github-lighthouse-reports');
      if (response.ok) {
        const data = await response.json();
        setGithubReports(data.reports || []);
        setError(null);
      } else {
        console.warn('GitHub reports not available (token may not be configured)');
        setError('GitHub reports not available. Check GitHub token configuration.');
      }
    } catch (err) {
      console.warn('GitHub reports fetch failed:', err.message);
      setError('Failed to fetch GitHub reports: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLighthouseData = async (artifactId) => {
    try {
      const response = await fetch(`/api/github-lighthouse-reports/extract/${artifactId}`);
      if (response.ok) {
        const data = await response.json();
        setLighthouseData(prev => ({
          ...prev,
          [artifactId]: data.reports || []
        }));
        return data.reports || [];
      } else {
        console.error('Failed to extract Lighthouse data');
        return [];
      }
    } catch (err) {
      console.error('Error loading Lighthouse data:', err);
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

  const overallMetrics = getOverallMetrics();

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Lighthouse Reports
          </h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading reports...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Lighthouse Reports
          </h2>
        </div>
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchLighthouseReports}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
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
            {/* Hero Content */}
            <div className="flex items-start space-x-4">
              <div className="bg-gray-800 border border-gray-700 p-4 rounded-2xl shadow-lg">
                <Rocket className="w-10 h-10 text-blue-400" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                  Performance Hub
                </h1>
                <p className="text-gray-300 text-lg max-w-2xl leading-relaxed font-light">
                  Real-time Lighthouse CI monitoring powered by GitHub Actions. 
                  Track performance, accessibility, and SEO across your team.
                </p>
              </div>
            </div>
            
            {/* Apple-Style Action Button */}
            <div className="flex-shrink-0">
              <button
                onClick={fetchGithubReports}
                className="bg-blue-500 hover:bg-blue-400 text-white px-6 py-3 rounded-2xl font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-3 border border-blue-400/20"
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
      <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-gray-800">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-gray-800 border border-gray-700 p-3 rounded-xl">
              <FileText className="w-6 h-6 text-gray-300" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
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
            githubReports.map((run, index) => (
              <div
                key={run.run_id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <GitBranch className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        Run #{run.workflow_run_number} - {run.branch}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {run.triggered_by} • {new Date(run.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      run.conclusion === 'success' 
                        ? 'bg-green-100 text-green-800' 
                        : run.conclusion === 'failure'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {run.conclusion}
                    </span>
                  </div>
                </div>

                {/* Lighthouse Reports */}
                <div className="space-y-2">
                  {run.artifacts
                    .filter(artifact => artifact.name.includes('lighthouse-reports-'))
                    .map(artifact => {
                      const reportKey = `${run.run_id}-${artifact.id}`;
                      const isExpanded = expandedReports.has(reportKey);
                      const reports = lighthouseData[artifact.id] || [];
                      
                      return (
                        <div key={artifact.id} className="border border-gray-200 dark:border-gray-600 rounded-lg">
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-600 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <BarChart3 className="w-4 h-4 text-blue-600" />
                              <div>
                                <p className="font-medium text-sm">Lighthouse Reports</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {reports.length > 0 ? `${reports.length} URLs tested` : 'Click to view reports'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => toggleReportExpansion(run.run_id, artifact.id)}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center space-x-1"
                              >
                                <Eye className="w-4 h-4" />
                                <span>{isExpanded ? 'Hide' : 'View'}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                              <a
                                href={artifact.download_url}
                                className="text-blue-600 hover:text-blue-700 transition-colors"
                                title="Download ZIP"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                          
                          {/* Expanded Lighthouse Reports */}
                          {isExpanded && (
                            <div className="p-4 border-t border-gray-200 dark:border-gray-600">
                              {reports.length === 0 ? (
                                <div className="text-center py-4">
                                  <Loader className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Loading Lighthouse reports...</p>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {reports.map((report, reportIndex) => (
                                    <div key={reportIndex} className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                                      <div className="flex items-center justify-between mb-3">
                                        <div>
                                          <h4 className="font-medium text-gray-900 dark:text-white">{report.url}</h4>
                                          <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {new Date(report.timestamp).toLocaleString()}
                                          </p>
                                        </div>
                                      </div>
                                      
                                      {/* Performance Scores */}
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                        {Object.entries(report.categories || {}).map(([category, data]) => {
                                          const score = Math.round(data.score * 100);
                                          
                                          return (
                                            <div
                                              key={category}
                                              className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${getScoreColor(score)}`}
                                            >
                                              <CategoryIcon category={category} />
                                              <div>
                                                <p className="text-xs font-medium capitalize">
                                                  {category.replace('-', ' ')}
                                                </p>
                                                <p className="text-sm font-bold">{score}</p>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                      
                                      {/* Core Web Vitals */}
                                      {report.audits && (
                                        <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                            Core Web Vitals
                                          </p>
                                          <div className="grid grid-cols-3 gap-3 text-sm">
                                            {report.audits['largest-contentful-paint'] && (
                                              <div className="text-center">
                                                <p className="font-medium">LCP</p>
                                                <p className="text-gray-600 dark:text-gray-400">
                                                  {report.audits['largest-contentful-paint'].displayValue || 
                                                   `${Math.round(report.audits['largest-contentful-paint'].numericValue / 10) / 100}s`}
                                                </p>
                                              </div>
                                            )}
                                            {report.audits['cumulative-layout-shift'] && (
                                              <div className="text-center">
                                                <p className="font-medium">CLS</p>
                                                <p className="text-gray-600 dark:text-gray-400">
                                                  {report.audits['cumulative-layout-shift'].displayValue || 
                                                   Math.round(report.audits['cumulative-layout-shift'].numericValue * 1000) / 1000}
                                                </p>
                                              </div>
                                            )}
                                            {report.audits['interaction-to-next-paint'] && (
                                              <div className="text-center">
                                                <p className="font-medium">INP</p>
                                                <p className="text-gray-600 dark:text-gray-400">
                                                  {report.audits['interaction-to-next-paint'].displayValue ||
                                                   `${Math.round(report.audits['interaction-to-next-paint'].numericValue)}ms`}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {run.pr_number && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Pull Request #{run.pr_number}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
