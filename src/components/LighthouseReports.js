'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Loader, ChevronDown, ChevronUp, Globe, Zap, CheckCircle, Accessibility, Target, ExternalLink } from 'lucide-react';

export default function LighthouseReports() {
  const [githubReports, setGithubReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lighthouseData, setLighthouseData] = useState({});
  const [activeTab, setActiveTab] = useState('lighthouse');

  useEffect(() => {
    fetchGithubReports();
  }, []);

  const fetchGithubReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/github-lighthouse-reports');
      
      if (response.ok) {
        const data = await response.json();
        setGithubReports(data.reports || []);
        
        // Fetch detailed data for each artifact
        const artifactIds = [];
        data.reports?.forEach(run => {
          run.artifacts
            .filter(artifact => artifact.name.includes('lighthouse-reports-'))
            .forEach(artifact => {
              if (!artifactIds.includes(artifact.id)) {
                artifactIds.push(artifact.id);
              }
            });
        });

        // Fetch all artifact data
        await Promise.all(
          artifactIds.map(async (artifactId) => {
            try {
              const artifactResponse = await fetch(`/api/github-lighthouse-reports/extract/${artifactId}`);
              if (artifactResponse.ok) {
                const artifactData = await artifactResponse.json();
                setLighthouseData(prev => ({
                  ...prev,
                  [artifactId]: artifactData
                }));
              }
            } catch (err) {
              console.error(`Failed to fetch artifact ${artifactId}:`, err);
            }
          })
        );
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error fetching GitHub reports:', err);
      setError(`Failed to load GitHub Actions reports: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'performance':
        return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'accessibility':
        return <Accessibility className="w-4 h-4 text-green-400" />;
      case 'best-practices':
        return <CheckCircle className="w-4 h-4 text-blue-400" />;
      case 'seo':
        return <Target className="w-4 h-4 text-purple-400" />;
      default:
        return <BarChart3 className="w-4 h-4 text-gray-400" />;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 0.9) return 'text-green-400';
    if (score >= 0.7) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatScore = (score) => {
    return Math.round(score * 100);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (conclusion) => {
    switch (conclusion) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failure':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default:
        return <Loader className="w-5 h-5 text-gray-400" />;
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

  // Calculate summary statistics
  const getSummaryStats = () => {
    const totalRuns = githubReports.length;
    const successfulRuns = githubReports.filter(run => run.conclusion === 'success').length;
    const failedRuns = githubReports.filter(run => run.conclusion === 'failure').length;
    const totalArtifacts = githubReports.reduce((acc, run) => acc + run.artifacts.length, 0);

    return { totalRuns, successfulRuns, failedRuns, totalArtifacts };
  };

  const WorkflowRunCard = ({ run, lighthouseData }) => {
    const [expanded, setExpanded] = useState(false);
    
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
                  <span>{formatDate(run.created_at)}</span>
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
              <div className="flex items-center space-x-3 mb-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-gray-300">Commit Information</span>
              </div>
              <div className="space-y-2 text-sm text-gray-400">
                <div>SHA: <span className="text-white font-mono">{run.commit_sha?.substring(0, 8) || 'N/A'}</span></div>
                <div>Message: <span className="text-white">{run.commit_message || 'N/A'}</span></div>
                <div>Author: <span className="text-white">{run.commit_author?.name || run.commit_author?.username || run.commit_author || 'N/A'}</span></div>
                <div>Branch: <span className="text-white">{run.branch || 'N/A'}</span></div>
              </div>
            </div>

            {/* Artifacts */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Lighthouse Artifacts ({run.artifacts.length})
              </h4>
              
              {run.artifacts.map(artifact => {
                const artifactData = lighthouseData[artifact.id];
                const hasReports = artifactData?.reports?.length > 0;
                
                return (
                  <div key={artifact.id} className="bg-gray-750 border border-gray-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${hasReports ? 'bg-green-400' : 'bg-yellow-400'}`} />
                        <span className="font-medium text-white">{artifact.name}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <span>{(artifact.size_in_bytes / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span>{formatDate(artifact.created_at)}</span>
                      </div>
                    </div>

                    {hasReports ? (
                      <div>
                        <div className="flex items-center space-x-2 mb-3">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 font-medium">
                            {artifactData.reports.length} Lighthouse Report(s) Found
                          </span>
                        </div>
                        
                        {artifactData.reports.map((report, idx) => (
                          <div key={idx} className="mb-4 last:mb-0">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-blue-400 text-sm font-medium">
                                {report.url || 'Unknown URL'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {report.timestamp ? formatDate(report.timestamp) : 'Invalid Date'}
                              </span>
                            </div>
                            
                            {report.categories && (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.entries(report.categories).map(([key, category]) => (
                                  <div key={key} className="flex items-center space-x-2">
                                    {getCategoryIcon(key)}
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs text-gray-400 truncate">
                                        {category.title || key}
                                      </div>
                                      <div className={`text-sm font-bold ${getScoreColor(category.score)}`}>
                                        {formatScore(category.score)}%
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-400" />
                          <span className="text-yellow-400 font-medium">
                            ⚠️ No Lighthouse Reports (Metadata Only)
                          </span>
                        </div>
                        
                        {artifactData?.metadata && (
                          <div className="text-sm text-gray-400 space-y-1">
                            <div>Run ID: <span className="text-white">{artifactData.metadata.workflow_run_id}</span></div>
                            <div>Exit Code: <span className="text-white">{artifactData.metadata.lighthouse_exit_code}</span></div>
                            <div>URLs Tested: <span className="text-white">{artifactData.metadata.urls_tested}</span></div>
                            <div>Event: <span className="text-white">{artifactData.metadata.event_type}</span></div>
                            <div>Triggered By: <span className="text-white">{artifactData.metadata.triggered_by}</span></div>
                          </div>
                        )}
                        
                        {artifactData?.message && (
                          <p className="text-yellow-300 mt-2">{artifactData.message}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl p-8">
        <div className="flex items-center justify-center space-x-3">
          <Loader className="w-6 h-6 animate-spin text-blue-400" />
          <span className="text-gray-300">Loading GitHub Actions reports...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-3">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          <h3 className="text-lg font-semibold text-red-400">Error Loading Reports</h3>
        </div>
        <p className="text-red-300 mb-4">{error}</p>
        <button 
          onClick={fetchGithubReports}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const stats = getSummaryStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">GitHub Actions Lighthouse Reports</h2>
        </div>
        <button 
          onClick={fetchGithubReports}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Runs</p>
              <p className="text-2xl font-bold text-white">{stats.totalRuns}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Successful</p>
              <p className="text-2xl font-bold text-green-400">{stats.successfulRuns}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Failed</p>
              <p className="text-2xl font-bold text-red-400">{stats.failedRuns}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </div>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Artifacts</p>
              <p className="text-2xl font-bold text-blue-400">{stats.totalArtifacts}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-400" />
          </div>
        </div>
      </div>

      {githubReports.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Reports Found</h3>
          <p className="text-gray-400">
            No GitHub Actions Lighthouse reports were found. Make sure your workflow is configured and has run at least once.
          </p>
        </div>
      ) : (
        <div className="w-full max-w-7xl mx-auto space-y-6 px-4 min-w-[1024px]">
          {/* Summary Stats */}
          
          {/* Workflow Runs */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Recent Workflow Runs</h3>
            {githubReports.map(run => (
              <WorkflowRunCard 
                key={run.run_id} 
                run={run} 
                lighthouseData={lighthouseData}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}