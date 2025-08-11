'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Loader, ChevronDown, ChevronUp, Globe, Zap, CheckCircle, Accessibility, Target, ExternalLink } from 'lucide-react';

export default function LighthouseReports() {
  const [githubReports, setGithubReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lighthouseData, setLighthouseData] = useState({});
  const [activeTab, setActiveTab] = useState('lighthouse');
  const [urlBasedData, setUrlBasedData] = useState({});

  useEffect(() => {
    fetchGithubReports();
  }, []);

  useEffect(() => {
    // Organize data by URLs whenever githubReports or lighthouseData changes
    organizeDataByUrls();
  }, [githubReports, lighthouseData]);

  const organizeDataByUrls = () => {
    const urlData = {};
    
    githubReports.forEach(run => {
      run.artifacts
        .filter(artifact => artifact.name.includes('lighthouse-reports-'))
        .forEach(artifact => {
          const artifactData = lighthouseData[artifact.id];
          const reports = artifactData?.reports || [];
          
          if (reports.length > 0) {
            // We have actual Lighthouse reports
            reports.forEach(report => {
              const url = report.finalDisplayedUrl || report.requestedUrl || report.url;
              if (url) {
                if (!urlData[url]) {
                  urlData[url] = [];
                }
                urlData[url].push({
                  ...report,
                  runId: run.run_id,
                  timestamp: run.created_at,
                  commit: {
                    sha: run.commit_sha,
                    message: run.commit_message,
                    author: run.commit_author
                  },
                  branch: run.branch,
                  status: run.conclusion
                });
              }
            });
          } else if (artifactData?.metadata?.urls_tested) {
            // No reports but we have URLs that were tested (but failed/skipped)
            const testedUrls = artifactData.metadata.urls_tested.split(' ').filter(Boolean);
            testedUrls.forEach(url => {
              if (!urlData[url]) {
                urlData[url] = [];
              }
              urlData[url].push({
                isSkipped: true,
                url: url,
                runId: run.run_id,
                timestamp: run.created_at,
                commit: {
                  sha: run.commit_sha,
                  message: run.commit_message,
                  author: run.commit_author
                },
                branch: run.branch,
                status: run.conclusion,
                metadata: artifactData.metadata,
                message: artifactData.message
              });
            });
          }
        });
    });

    // Sort reports by timestamp (newest first) for each URL
    Object.keys(urlData).forEach(url => {
      urlData[url].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    });

    setUrlBasedData(urlData);
  };

  const fetchGithubReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/github-lighthouse-reports');
      
      if (response.ok) {
        const data = await response.json();
        setGithubReports(data.reports || []);
        
        if (!data.reports || data.reports.length === 0) {
          if (data.meta?.total_runs === 0) {
            setError({
              type: 'info',
              title: 'No workflow runs found',
              message: 'No Lighthouse CI workflows have been executed yet.',
              help: 'Push code changes to trigger your first Lighthouse CI run.',
              action: 'Try making a small change and pushing to your repository'
            });
          }
        }
      } else {
        const errorData = await response.json();
        setError({
          type: 'error',
          title: 'API Error',
          message: errorData.message || 'Failed to fetch GitHub reports',
          help: errorData.help || 'Unknown error occurred',
          action: 'Check browser console for more details'
        });
      }
    } catch (err) {
      console.error('GitHub reports fetch failed:', err);
      setError({
        type: 'error',
        title: 'Network Error',
        message: 'Unable to connect to the API',
        help: 'Check your internet connection and server status',
        action: 'Ensure the development server is running'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLighthouseData = async (artifactId) => {
    try {
      console.log('🔍 Loading Lighthouse data for artifact:', artifactId);
      const response = await fetch(`/api/github-lighthouse-reports/extract/${artifactId}`);
      
      if (response.ok) {
        const data = await response.json();
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
        console.error('❌ Failed to extract Lighthouse data:', response.status);
        return [];
      }
    } catch (err) {
      console.error('💥 Error loading Lighthouse data:', err);
      return [];
    }
  };

  // Auto-load lighthouse data for all artifacts
  useEffect(() => {
    if (githubReports.length > 0) {
      githubReports.forEach(run => {
        run.artifacts
          .filter(artifact => artifact.name.includes('lighthouse-reports-'))
          .forEach(artifact => {
            if (!lighthouseData[artifact.id]) {
              loadLighthouseData(artifact.id);
            }
          });
      });
    }
  }, [githubReports]);

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <BarChart3 className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-semibold text-white">
            Performance Dashboard
          </h1>
        </div>
        <div className="text-center py-12">
          <Loader className="w-10 h-10 animate-spin mx-auto mb-4 text-blue-400" />
          <p className="text-gray-300 mb-2 text-lg font-medium">
            Loading Performance Data
          </p>
          <p className="text-gray-400 text-sm">
            Fetching GitHub Actions Lighthouse results...
          </p>
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
    
    return (
      <div className="bg-gray-900 border border-red-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          <h1 className="text-xl font-semibold text-white">
            {errorTitle}
          </h1>
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
          
          <button
            onClick={fetchGithubReports}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-8" aria-labelledby="performance-dashboard-heading">
      {/* Clean Header */}
      <header className="bg-gray-900 border border-gray-800 rounded-2xl p-6" role="banner">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-600/20 border border-blue-500/30 p-3 rounded-xl" aria-hidden="true">
              <BarChart3 className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 id="performance-dashboard-heading" className="text-2xl font-bold text-white">
                Performance Dashboard
              </h1>
              <p className="text-gray-400 text-sm">
                GitHub Actions Lighthouse CI Results - Fixed Configuration
              </p>
            </div>
          </div>
          <button
            onClick={fetchGithubReports}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Refresh reports"
          >
            <TrendingUp className="w-4 h-4" aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="border-b border-gray-800">
          <nav className="flex" role="tablist" aria-label="Performance analysis tabs">
            <button
              onClick={() => setActiveTab('lighthouse')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                activeTab === 'lighthouse'
                  ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              role="tab"
              aria-selected={activeTab === 'lighthouse'}
              aria-controls="lighthouse-panel"
            >
              <div className="flex items-center justify-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>Lighthouse Scores</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('webvitals')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                activeTab === 'webvitals'
                  ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              role="tab"
              aria-selected={activeTab === 'webvitals'}
              aria-controls="webvitals-panel"
            >
              <div className="flex items-center justify-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Web Vitals</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Lighthouse Tab */}
          {activeTab === 'lighthouse' && (
            <div id="lighthouse-panel" role="tabpanel" aria-labelledby="lighthouse-tab">
              {githubReports.length === 0 ? (
                <div className="max-w-4xl mx-auto text-center py-16">
                  <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Target className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No GitHub Workflow Runs</h3>
                  <p className="text-gray-400 mb-4">No GitHub Actions workflow runs found.</p>
                  <button
                    onClick={fetchGithubReports}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg"
                  >
                    Refresh Data
                  </button>
                </div>
              ) : (
                <div className="max-w-6xl mx-auto space-y-6">
                  {/* Summary Stats */}
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Workflow Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">{githubReports.length}</div>
                        <div className="text-sm text-gray-400">Total Runs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {githubReports.filter(r => r.conclusion === 'success').length}
                        </div>
                        <div className="text-sm text-gray-400">Successful</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">
                          {githubReports.filter(r => r.conclusion === 'failure').length}
                        </div>
                        <div className="text-sm text-gray-400">Failed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">
                          {githubReports.reduce((sum, r) => sum + r.artifacts.length, 0)}
                        </div>
                        <div className="text-sm text-gray-400">Artifacts</div>
                      </div>
                    </div>
                  </div>

                  {/* Workflow Runs List */}
                  <div className="space-y-4">
                    {githubReports.map((run) => (
                      <WorkflowRunCard 
                        key={run.run_id} 
                        run={run} 
                        lighthouseData={lighthouseData}
                        onLoadArtifact={loadLighthouseData}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Web Vitals Tab */}
          {activeTab === 'webvitals' && (
            <div id="webvitals-panel" role="tabpanel" aria-labelledby="webvitals-tab">
              {Object.keys(urlBasedData).length === 0 ? (
                <div className="max-w-4xl mx-auto text-center py-16">
                  <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <BarChart3 className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No Web Vitals Data</h3>
                  <p className="text-gray-400">Core Web Vitals data extracted from Lighthouse CI results</p>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-6">
                  {Object.entries(urlBasedData).map(([url, reports]) => (
                    <div key={url} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <Globe className="w-5 h-5 text-blue-400" />
                        <h4 className="text-lg font-semibold text-white">{url}</h4>
                      </div>
                      
                      {reports.length > 0 && reports[0].audits && !reports[0].isSkipped ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* LCP */}
                          {reports[0].audits['largest-contentful-paint'] && (
                            <div className="bg-gray-750 border border-gray-600 rounded-lg p-4">
                              <h5 className="text-sm font-medium text-gray-300 mb-2">Largest Contentful Paint</h5>
                              <p className="text-2xl font-bold text-white">
                                {reports[0].audits['largest-contentful-paint'].displayValue || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-400">Loading performance</p>
                            </div>
                          )}
                          
                          {/* CLS */}
                          {reports[0].audits['cumulative-layout-shift'] && (
                            <div className="bg-gray-750 border border-gray-600 rounded-lg p-4">
                              <h5 className="text-sm font-medium text-gray-300 mb-2">Cumulative Layout Shift</h5>
                              <p className="text-2xl font-bold text-white">
                                {reports[0].audits['cumulative-layout-shift'].displayValue || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-400">Visual stability</p>
                            </div>
                          )}
                          
                          {/* FCP */}
                          {reports[0].audits['first-contentful-paint'] && (
                            <div className="bg-gray-750 border border-gray-600 rounded-lg p-4">
                              <h5 className="text-sm font-medium text-gray-300 mb-2">First Contentful Paint</h5>
                              <p className="text-2xl font-bold text-white">
                                {reports[0].audits['first-contentful-paint'].displayValue || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-400">Loading performance</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                            <div>
                              <h5 className="text-yellow-200 font-medium mb-1">No Web Vitals Data Available</h5>
                              <p className="text-yellow-300 text-sm">
                                Lighthouse analysis was skipped or failed for this URL. Web Vitals data is only available from successful Lighthouse runs.
                              </p>
                            </div>
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
      </div>
    </section>
  );
}

// Workflow Run Card Component
function WorkflowRunCard({ run, lighthouseData, onLoadArtifact }) {
  const [expanded, setExpanded] = useState(false);
  const [loadingArtifacts, setLoadingArtifacts] = useState({});

  const handleLoadArtifact = async (artifactId) => {
    setLoadingArtifacts(prev => ({ ...prev, [artifactId]: true }));
    try {
      await onLoadArtifact(artifactId);
    } finally {
      setLoadingArtifacts(prev => ({ ...prev, [artifactId]: false }));
    }
  };

  const getStatusIcon = (conclusion) => {
    switch (conclusion) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failure':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default:
        return <Target className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (conclusion) => {
    switch (conclusion) {
      case 'success':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failure':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {getStatusIcon(run.conclusion)}
            <div>
              <h3 className="text-lg font-semibold text-white">
                Run #{run.workflow_run_number}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <span>{new Date(run.created_at).toLocaleDateString()}</span>
                <span>•</span>
                <span className={`px-2 py-1 rounded border text-xs font-medium ${getStatusColor(run.conclusion)}`}>
                  {run.conclusion}
                </span>
                <span>•</span>
                <span>{run.artifacts.length} artifacts</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>{expanded ? 'Collapse' : 'Expand'}</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-6 space-y-6">
          {/* Commit Info */}
          <div className="bg-gray-750 border border-gray-600 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Commit Details</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400">SHA:</span>
                <code className="text-xs bg-gray-800 px-2 py-1 rounded text-blue-400">
                  {run.commit_sha.substring(0, 8)}
                </code>
              </div>
              <div>
                <span className="text-xs text-gray-400">Message:</span>
                <p className="text-sm text-white mt-1">
                  {run.commit_message?.split('\n')[0] || 'No commit message'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400">Author:</span>
                <span className="text-sm text-white">{run.commit_author?.name || run.triggered_by}</span>
                <span className="text-xs text-gray-400">on</span>
                <span className="text-sm text-blue-400">{run.branch}</span>
              </div>
            </div>
          </div>

          {/* Artifacts */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">Artifacts ({run.artifacts.length})</h4>
            <div className="space-y-3">
              {run.artifacts.map((artifact) => {
                const artifactData = lighthouseData[artifact.id];
                const isLoading = loadingArtifacts[artifact.id];
                
                return (
                  <div key={artifact.id} className="bg-gray-750 border border-gray-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h5 className="text-sm font-medium text-white">{artifact.name}</h5>
                        <p className="text-xs text-gray-400">
                          {(artifact.size_in_bytes / 1024).toFixed(1)} KB • 
                          Created {new Date(artifact.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleLoadArtifact(artifact.id)}
                          disabled={isLoading}
                          className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white px-3 py-1 rounded text-xs font-medium transition-colors flex items-center space-x-1"
                        >
                          {isLoading ? (
                            <>
                              <Loader className="w-3 h-3 animate-spin" />
                              <span>Loading...</span>
                            </>
                          ) : (
                            <>
                              <BarChart3 className="w-3 h-3" />
                              <span>View</span>
                            </>
                          )}
                        </button>
                        <a
                          href={artifact.download_url}
                          className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                        >
                          Download
                        </a>
                      </div>
                    </div>

                    {/* Artifact Content */}
                    {artifactData && (
                      <div className="mt-4 pt-4 border-t border-gray-600">
                        {artifactData.reports && artifactData.reports.length > 0 ? (
                          <div>
                            <h6 className="text-xs font-medium text-green-400 mb-2">
                              ✅ {artifactData.reports.length} Lighthouse Report(s) Found
                            </h6>
                            <div className="space-y-2">
                              {artifactData.reports.map((report, idx) => (
                                <div key={idx} className="bg-gray-800 rounded p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-blue-400">{report.url}</span>
                                    <span className="text-xs text-gray-400">
                                      {new Date(report.timestamp).toLocaleString()}
                                    </span>
                                  </div>
                                  {report.categories && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                      {Object.entries(report.categories).map(([category, data]) => {
                                        const score = Math.round(data.score * 100);
                                        return (
                                          <div key={category} className="text-center">
                                            <div className={`text-sm font-bold ${
                                              score >= 90 ? 'text-green-400' :
                                              score >= 50 ? 'text-yellow-400' :
                                              'text-red-400'
                                            }`}>
                                              {score}
                                            </div>
                                            <div className="text-xs text-gray-400 capitalize">
                                              {category.replace('-', ' ')}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <h6 className="text-xs font-medium text-yellow-400 mb-2">
                              ⚠️ No Lighthouse Reports (Metadata Only)
                            </h6>
                            {artifactData.metadata && (
                              <div className="bg-gray-800 rounded p-3 text-xs">
                                <div className="grid grid-cols-2 gap-2 text-gray-400">
                                  <div>Exit Code: <span className="text-white">{artifactData.metadata.lighthouse_exit_code}</span></div>
                                  <div>URLs Tested: <span className="text-white">{artifactData.metadata.urls_tested || artifactData.metadata.custom_urls}</span></div>
                                  <div>Event: <span className="text-white">{artifactData.metadata.event_type}</span></div>
                                  <div>Triggered By: <span className="text-white">{artifactData.metadata.triggered_by}</span></div>
                                </div>
                                {artifactData.message && (
                                  <p className="text-yellow-300 mt-2">{artifactData.message}</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}