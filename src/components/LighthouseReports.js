'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Clock, ExternalLink, FileText, TrendingUp, AlertTriangle, CheckCircle, Zap, Globe, Monitor, Accessibility } from 'lucide-react';

export default function LighthouseReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLighthouseReports();
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
        <button
          onClick={fetchLighthouseReports}
          className="text-blue-600 hover:text-blue-700 transition-colors"
          title="Refresh reports"
        >
          <TrendingUp className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        {reports.map((report, index) => (
          <div
            key={index}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Monitor className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {report.url}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {formatTimestamp(report.timestamp)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={report.htmlPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 transition-colors"
                  title="View full report"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Performance Scores */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(report.categories || {}).map(([category, data]) => {
                const score = Math.round(data.score * 100);
                const Icon = getScoreIcon(score);
                
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
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Core Web Vitals
                </p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  {report.audits['largest-contentful-paint'] && (
                    <div className="text-center">
                      <p className="font-medium">LCP</p>
                      <p className="text-gray-600 dark:text-gray-400">
                        {Math.round(report.audits['largest-contentful-paint'].numericValue / 1000 * 10) / 10}s
                      </p>
                    </div>
                  )}
                  {report.audits['cumulative-layout-shift'] && (
                    <div className="text-center">
                      <p className="font-medium">CLS</p>
                      <p className="text-gray-600 dark:text-gray-400">
                        {Math.round(report.audits['cumulative-layout-shift'].numericValue * 1000) / 1000}
                      </p>
                    </div>
                  )}
                  {report.audits['interaction-to-next-paint'] && (
                    <div className="text-center">
                      <p className="font-medium">INP</p>
                      <p className="text-gray-600 dark:text-gray-400">
                        {Math.round(report.audits['interaction-to-next-paint'].numericValue)}ms
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
