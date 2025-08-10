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
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 p-3 rounded-xl">
                <Rocket className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Performance Monitoring
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Automated Lighthouse CI reports from your team's GitHub Actions
                </p>
              </div>
            </div>
            <button
              onClick={fetchGithubReports}
              className="bg-white dark:bg-gray-700 px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              title="Refresh GitHub reports"
            >
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">Refresh</span>
            </button>
          </div>

          {/* Performance Overview Cards */}
          {overallMetrics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${getScoreColor(overallMetrics.averagePerformance)}`}>
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Performance</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{overallMetrics.averagePerformance}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${getScoreColor(overallMetrics.averageAccessibility)}`}>
                    <Accessibility className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Accessibility</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{overallMetrics.averageAccessibility}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${getScoreColor(overallMetrics.averageBestPractices)}`}>
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Best Practices</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{overallMetrics.averageBestPractices}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${getScoreColor(overallMetrics.averageSEO)}`}>
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">SEO</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{overallMetrics.averageSEO}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-6 text-center">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Ready for Performance Monitoring
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Push code changes to trigger Lighthouse CI and see your performance metrics here
              </p>
            </div>
          )}

          {/* Quick Stats */}
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
              <GitBranch className="w-4 h-4" />
              <span>{githubReports.length} workflow runs</span>
            </div>
            {overallMetrics && (
              <>
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
                  <BarChart3 className="w-4 h-4" />
                  <span>{overallMetrics.totalReports} performance reports</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
                  <Award className="w-4 h-4" />
                  <span>Last {overallMetrics.recentRuns} runs analyzed</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Reports Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Recent Performance Reports
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Automated Lighthouse audits from GitHub Actions workflow runs
          </p>
        </div>

      {/* GitHub Actions Reports */}
        <div className="space-y-4">
          {githubReports.length === 0 ? (
            <div className="text-center py-8">
              <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No GitHub Actions Lighthouse reports found. 
                Make sure your GitHub token is configured and workflows have run.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Reports will appear here when team members push changes that trigger Lighthouse CI.
              </p>
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
