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
              {Object.keys(urlBasedData).length === 0 ? (
                <div className="max-w-4xl mx-auto text-center py-16">
                  <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Target className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No Lighthouse Data</h3>
                  <p className="text-gray-400 mb-4">No GitHub Actions Lighthouse reports found.</p>
                  <button
                    onClick={fetchGithubReports}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg"
                  >
                    Refresh Data
                  </button>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-6">
                  {Object.entries(urlBasedData).map(([url, reports]) => (
                    <div key={url} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                      {/* URL Header */}
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
                        <div className="flex items-center space-x-3">
                          <Globe className="w-5 h-5 text-blue-400" />
                          <div>
                            <h3 className="text-lg font-semibold text-white">{url}</h3>
                            <p className="text-sm text-gray-400">{reports.length} analysis{reports.length !== 1 ? 'es' : ''}</p>
                          </div>
                        </div>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          aria-label={`Visit ${url}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>

                      {/* Latest Scores */}
                      {reports.length > 0 && reports[0].categories && !reports[0].isSkipped && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                          {Object.entries(reports[0].categories).map(([category, data]) => {
                            const score = Math.round(data.score * 100);
                            const categoryNames = {
                              performance: 'Performance',
                              accessibility: 'Accessibility',
                              'best-practices': 'Best Practices',
                              seo: 'SEO'
                            };
                            const categoryIcons = {
                              performance: Zap,
                              accessibility: Accessibility,
                              'best-practices': CheckCircle,
                              seo: Globe
                            };
                            const Icon = categoryIcons[category] || BarChart3;

                            return (
                              <div key={category} className="bg-gray-750 border border-gray-600 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <Icon className="w-4 h-4 text-blue-400" />
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    score >= 90 ? 'bg-green-500/20 text-green-400' :
                                    score >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-red-500/20 text-red-400'
                                  }`}>
                                    {score >= 90 ? 'Good' : score >= 50 ? 'Fair' : 'Poor'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400 mb-1">{categoryNames[category] || category}</p>
                                <p className="text-2xl font-bold text-white">{score}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Show warning for skipped reports */}
                      {reports.length > 0 && reports[0].isSkipped && (
                        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 mb-6">
                          <div className="flex items-start space-x-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                            <div>
                              <h5 className="text-yellow-200 font-medium mb-1">Lighthouse Analysis Skipped</h5>
                              <p className="text-yellow-300 text-sm mb-2">
                                {reports[0].message || 'This URL was tested but no performance scores were generated.'}
                              </p>
                              <p className="text-yellow-400 text-xs">
                                Exit Code: {reports[0].metadata?.lighthouse_exit_code} • 
                                Triggered by: {reports[0].metadata?.triggered_by}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Recent History */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-300">Recent History</h4>
                        {reports.slice(0, 5).map((report, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-750 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`w-2 h-2 rounded-full ${
                                report.isSkipped ? 'bg-yellow-400' : 'bg-blue-400'
                              }`}></div>
                              <div>
                                <p className="text-sm text-white">
                                  {report.commit?.message?.split('\n')[0] || 'No commit message'}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {report.commit?.author?.name || 'Unknown'} • {new Date(report.timestamp).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {report.isSkipped ? (
                                <span className="text-xs text-yellow-400">Skipped</span>
                              ) : report.categories?.performance ? (
                                <span className="text-sm font-medium text-white">
                                  {Math.round(report.categories.performance.score * 100)}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">No data</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
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