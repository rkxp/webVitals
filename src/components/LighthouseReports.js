'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Clock, ExternalLink, FileText, TrendingUp, AlertTriangle, CheckCircle, Zap, Globe, Monitor, Accessibility, Download, GitBranch, Users, Loader, ChevronDown, ChevronUp, Eye } from 'lucide-react';

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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Lighthouse Reports
          </h2>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <GitBranch className="w-4 h-4" />
            <span>GitHub Actions Reports: {githubReports.length}</span>
          </div>
          <button
            onClick={fetchGithubReports}
            className="text-blue-600 hover:text-blue-700 transition-colors"
            title="Refresh GitHub reports"
          >
            <TrendingUp className="w-5 h-5" />
          </button>
        </div>
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
  );
}
