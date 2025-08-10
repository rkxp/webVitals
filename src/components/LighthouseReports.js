'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Clock, ExternalLink, FileText, TrendingUp, AlertTriangle, CheckCircle, Zap, Globe, Monitor, Accessibility, Download, GitBranch, Users, Loader } from 'lucide-react';

export default function LighthouseReports() {
  const [reports, setReports] = useState([]);
  const [githubReports, setGithubReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('github'); // Only GitHub Actions reports
  const [syncingArtifacts, setSyncingArtifacts] = useState(new Set());

  useEffect(() => {
    fetchGithubReports();
  }, []);

  const fetchLighthouseReports = async () => {
    try {
      setLoading(true);
      // Fetch list of available reports
      const response = await fetch('/api/lighthouse-reports');
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      } else {
        setError('Failed to fetch Lighthouse reports');
      }
    } catch (err) {
      setError('Error loading Lighthouse reports: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGithubReports = async () => {
    try {
      // Fetch GitHub Actions Lighthouse reports
      const response = await fetch('/api/github-lighthouse-reports');
      if (response.ok) {
        const data = await response.json();
        setGithubReports(data.reports || []);
      } else {
        console.warn('GitHub reports not available (token may not be configured)');
      }
    } catch (err) {
      console.warn('GitHub reports fetch failed:', err.message);
    }
  };

  const syncArtifact = async (artifactId) => {
    try {
      setSyncingArtifacts(prev => new Set([...prev, artifactId]));
      
      const response = await fetch(`/api/github-lighthouse-reports/download/${artifactId}?sync=true`);
      const data = await response.json();
      
      if (data.success) {
        // Refresh local reports to include synced ones
        fetchLighthouseReports();
      } else {
        alert('Failed to sync artifact: ' + data.error);
      }
    } catch (err) {
      alert('Error syncing artifact: ' + err.message);
    } finally {
      setSyncingArtifacts(prev => {
        const newSet = new Set(prev);
        newSet.delete(artifactId);
        return newSet;
      });
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

  if (reports.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Lighthouse Reports
          </h2>
        </div>
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No Lighthouse reports found. Run a performance audit to generate reports.
          </p>
          <button
            onClick={() => {
              // Trigger a Lighthouse run
              window.open('/api/trigger-lighthouse', '_blank');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Run Lighthouse Audit
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
                {!process.env.GITHUB_TOKEN && ' GitHub token may not be configured.'}
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

                {/* Artifacts */}
                <div className="space-y-2">
                  {run.artifacts.map(artifact => (
                    <div
                      key={artifact.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-600 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <div>
                          <p className="font-medium text-sm">{artifact.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {(artifact.size_in_bytes / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => syncArtifact(artifact.id)}
                          disabled={syncingArtifacts.has(artifact.id)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {syncingArtifacts.has(artifact.id) ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                        <a
                          href={artifact.download_url}
                          className="text-blue-600 hover:text-blue-700 transition-colors"
                          title="Download artifact"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
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
