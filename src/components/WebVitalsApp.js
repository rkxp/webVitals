'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTrackedUrls, getSettings, addVitalsDataPoint, checkForDegradation } from '@/lib/storage';
import { fetchPageSpeedInsights, batchFetchPageSpeedInsights } from '@/lib/psi-api';
import { sendAlert } from '@/lib/alerts';

import Header from './Header';
import Footer from './Footer';
import VitalsDashboard from './VitalsDashboard';
import LighthouseReports from './LighthouseReports';
import Settings from './Settings';

export default function WebVitalsApp() {
  const [trackedUrls, setTrackedUrls] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState({});
  const [triggerAddWebsite, setTriggerAddWebsite] = useState(0);
  const [nextAutoRefresh, setNextAutoRefresh] = useState(null);
  
  const loadTrackedUrls = () => {
    const urls = getTrackedUrls();
    setTrackedUrls(urls);
  };

  const loadLastRefresh = () => {
    const stored = localStorage.getItem('webvitals_last_refresh');
    if (stored) {
      setLastRefresh(new Date(stored));
    }
  };

  const loadSettings = () => {
    const appSettings = getSettings();
    setSettings(appSettings);
  };

  const updateNextAutoRefresh = () => {
    const currentSettings = getSettings();
    if (!currentSettings.autoRefreshEnabled || !lastRefresh) {
      setNextAutoRefresh(null);
      return;
    }

    const refreshIntervalHours = currentSettings.autoRefreshInterval || 24;
    const nextRefresh = new Date(lastRefresh.getTime() + (refreshIntervalHours * 60 * 60 * 1000));
    setNextAutoRefresh(nextRefresh);
  };

  const saveLastRefresh = () => {
    const now = new Date();
    localStorage.setItem('webvitals_last_refresh', now.toISOString());
    setLastRefresh(now);
  };

  // Update next auto-refresh time when lastRefresh or settings change
  useEffect(() => {
    updateNextAutoRefresh();
  }, [lastRefresh, settings]);

  const handleUrlsChange = useCallback(() => {
    loadTrackedUrls();
    loadSettings();
  }, []);



  const handleOpenAddWebsite = useCallback(() => {
    setTriggerAddWebsite(prev => prev + 1);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setShowSettings(false);
    loadSettings(); // Reload settings when modal closes
  }, []);

  const handleRefreshAll = useCallback(async (isAutoRefresh = false) => {
    const settings = getSettings();
    
    if (!settings.googlePsiApiKey) {
      if (!isAutoRefresh) {
        alert('Please configure your Google PageSpeed Insights API key in settings first.');
        setShowSettings(true);
      }
      return;
    }

    if (trackedUrls.length === 0) {
      if (!isAutoRefresh) {
        alert('No URLs to refresh. Please add some URLs first.');
      }
      return;
    }

    setIsRefreshing(true);
    setRefreshProgress({ current: 0, total: trackedUrls.length, url: '', status: 'starting' });

    try {
      const results = await batchFetchPageSpeedInsights(
        trackedUrls,
        settings.googlePsiApiKey,
        (progress) => {
          setRefreshProgress(progress);
        }
      );

      // Process results and check for degradation
      const alertPromises = [];

      for (const result of results) {
        if (result.success) {
          // Check for degradation before adding new data
          const degradedMetrics = checkForDegradation(result.id, result.data);
          
          // Add new vitals data
          addVitalsDataPoint(result.id, result.data);

          // Send alerts if there's degradation and not auto-refresh
          if (degradedMetrics.length > 0 && settings.alertsEnabled) {
            const url = trackedUrls.find(u => u.id === result.id);
            if (url) {
              const alertData = {
                url: url.url,
                urlName: url.name,
                degradedMetrics,
              };
              
              alertPromises.push(sendAlert(settings, alertData));
            }
          }
        } else {
          console.error(`Failed to fetch data for URL ${result.url}:`, result.error);
        }
      }

      // Wait for all alerts to be sent
      if (alertPromises.length > 0) {
        try {
          await Promise.allSettled(alertPromises);
        } catch (error) {
          console.error('Error sending alerts:', error);
        }
      }

      saveLastRefresh();
      
      // Trigger data reload to update UI with new data
      handleUrlsChange();
      
      // Dispatch custom event to trigger dashboard data reload
      window.dispatchEvent(new CustomEvent('vitalsDataRefresh'));
      
      if (!isAutoRefresh) {
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        
        if (successCount === totalCount) {
          alert(`Successfully refreshed all ${totalCount} URLs!`);
        } else {
          alert(`Refreshed ${successCount} out of ${totalCount} URLs. Check console for errors.`);
        }
      }

    } catch (error) {
      console.error('Refresh failed:', error);
      if (!isAutoRefresh) {
        alert('Failed to refresh data: ' + error.message);
      }
    } finally {
      setIsRefreshing(false);
      setRefreshProgress(null);
    }
  }, [trackedUrls, handleUrlsChange]);

  const handleRefresh = useCallback(() => {
    handleRefreshAll(false);
  }, [handleRefreshAll]);

  // Auto-refresh setup (customizable interval)
  const setupAutoRefresh = useCallback(() => {
    const checkAutoRefresh = async () => {
      const settings = getSettings();
      if (!settings.googlePsiApiKey || !settings.autoRefreshEnabled) return;

      const lastRefreshStored = localStorage.getItem('webvitals_last_refresh');
      if (!lastRefreshStored) return;

      const lastRefreshDate = new Date(lastRefreshStored);
      const now = new Date();
      const hoursSinceLastRefresh = (now - lastRefreshDate) / (1000 * 60 * 60);

      // Auto-refresh based on user-configured interval
      const refreshIntervalHours = settings.autoRefreshInterval || 24;
      if (hoursSinceLastRefresh >= refreshIntervalHours) {
        console.log(`Auto-refreshing web vitals data (every ${refreshIntervalHours} hours)...`);
        
        // Get current URLs directly instead of relying on callback
        const currentUrls = getTrackedUrls();
        if (currentUrls.length === 0) return;

        setIsRefreshing(true);
        setRefreshProgress({ current: 0, total: currentUrls.length, url: '', status: 'starting' });

        try {
          const results = await batchFetchPageSpeedInsights(
            currentUrls,
            settings.googlePsiApiKey,
            (progress) => {
              setRefreshProgress(progress);
            }
          );

          // Process results and check for degradation
          const alertPromises = [];

          for (const result of results) {
            if (result.success) {
              // Check for degradation before adding new data
              const degradedMetrics = checkForDegradation(result.id, result.data);
              
              // Add new vitals data
              addVitalsDataPoint(result.id, result.data);

              // Send alerts if there's degradation
              if (degradedMetrics.length > 0 && settings.alertsEnabled) {
                const url = currentUrls.find(u => u.id === result.id);
                if (url) {
                  const alertData = {
                    url: url.url,
                    urlName: url.name,
                    degradedMetrics,
                  };
                  
                  alertPromises.push(sendAlert(settings, alertData));
                }
              }
            } else {
              console.error(`Failed to fetch data for URL ${result.url}:`, result.error);
            }
          }

          // Wait for all alerts to be sent
          if (alertPromises.length > 0) {
            try {
              await Promise.allSettled(alertPromises);
            } catch (error) {
              console.error('Error sending alerts:', error);
            }
          }

          saveLastRefresh();
          
          // Trigger data reload to update UI with new data
          handleUrlsChange();
          
          // Dispatch custom event to trigger dashboard data reload
          window.dispatchEvent(new CustomEvent('vitalsDataRefresh'));
          
        } catch (error) {
          console.error('Auto-refresh failed:', error);
        } finally {
          setIsRefreshing(false);
          setRefreshProgress(null);
        }
      }
    };

    // Check every 30 seconds for better responsiveness to minute-level intervals
    const interval = setInterval(checkAutoRefresh, 30 * 1000);
    
    // Initial check
    checkAutoRefresh();

    return () => clearInterval(interval);
  }, [handleUrlsChange]); // Include handleUrlsChange for data reload capability

  // Load tracked URLs on component mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Load data from localStorage
        loadTrackedUrls();
        loadLastRefresh();
        loadSettings();
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []); // Empty dependency array - run only once on mount

  // Setup auto-refresh separately to avoid circular dependencies
  useEffect(() => {
    if (!isLoading) {
      const cleanup = setupAutoRefresh();
      return cleanup;
    }
  }, [isLoading, setupAutoRefresh, settings]); // Restart auto-refresh when settings change

  const handleRefreshUrl = useCallback(async (url) => {
    const settings = getSettings();
    
    if (!settings.googlePsiApiKey) {
      alert('Please configure your Google PageSpeed Insights API key in settings first.');
      setShowSettings(true);
      return null;
    }

    try {
      setRefreshProgress({
        status: 'processing',
        url: url.name || url.url,
        current: 1,
        total: 1
      });

      const vitals = await fetchPageSpeedInsights(url.url, settings.googlePsiApiKey);
      
      // Check for degradation before adding new data
      const degradedMetrics = checkForDegradation(url.id, vitals);
      
      // Add new vitals data
      addVitalsDataPoint(url.id, vitals);

      // Send alerts if there's degradation
      if (degradedMetrics.length > 0 && settings.alertsEnabled) {
        const alertData = {
          url: url.url,
          urlName: url.name,
          degradedMetrics,
          newVitals: vitals,
        };
        
        // Send alert (don't await to avoid blocking UI)
        sendAlert(alertData, settings).catch(error => {
          console.error('Failed to send alert:', error);
        });
      }

      setRefreshProgress({
        status: 'completed',
        url: url.name || url.url,
        current: 1,
        total: 1
      });

      // Trigger data reload to update UI with new data
      handleUrlsChange();
      
      // Dispatch custom event to trigger dashboard data reload
      window.dispatchEvent(new CustomEvent('vitalsDataRefresh'));
      
      // Clear progress after 2 seconds
      setTimeout(() => setRefreshProgress(null), 2000);

      return vitals;
    } catch (error) {
      console.error(`Failed to refresh ${url.url}:`, error);
      setRefreshProgress({
        status: 'error',
        url: url.name || url.url,
        current: 1,
        total: 1
      });
      
      // Clear progress after 3 seconds
      setTimeout(() => setRefreshProgress(null), 3000);
      
      throw error;
    }
  }, [handleUrlsChange]);



  const formatTimeAgo = (date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Less than an hour ago';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-muted-foreground">Loading Web Vitals Monitor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        onOpenSettings={handleOpenSettings} 
        trackedUrls={trackedUrls}
        onUrlsChange={handleUrlsChange}
        hasApiKey={!!settings.googlePsiApiKey}
        triggerAddWebsite={triggerAddWebsite}
        nextAutoRefresh={nextAutoRefresh}
        autoRefreshEnabled={settings.autoRefreshEnabled}
      />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Status Bar */}
          <div className="metric-card p-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0 text-sm">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                <span>Tracked URLs: {trackedUrls.length}</span>
                <span>Last refresh: {formatTimeAgo(lastRefresh)}</span>
                {trackedUrls.length > 0 && (
                  <span className="hidden sm:inline">
                    Next auto-refresh: {
                      settings.autoRefreshEnabled === false 
                        ? 'Disabled' 
                        : nextAutoRefresh 
                          ? formatTimeAgo(nextAutoRefresh)
                          : 'Not scheduled'
                    }
                  </span>
                )}
              </div>
              
              {refreshProgress && (
                <div className="text-sm">
                  {refreshProgress.status === 'processing' && (
                    <span className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                      <span>Refreshing {refreshProgress.current}/{refreshProgress.total}</span>
                    </span>
                  )}
                  {refreshProgress.status === 'completed' && (
                    <span className="text-green-600 dark:text-green-400">✓ Completed: {refreshProgress.url}</span>
                  )}
                  {refreshProgress.status === 'error' && (
                    <span className="text-destructive">
                      ✗ Error: {refreshProgress.url}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Primary Feature: Lighthouse Reports Dashboard */}
          <LighthouseReports />

          {/* Secondary Feature: Web Vitals Dashboard */}
          <VitalsDashboard
            trackedUrls={trackedUrls}
            onRefresh={handleRefresh}
            onRefreshUrl={handleRefreshUrl}
            isRefreshing={isRefreshing}
            onUrlsChange={handleUrlsChange}
            onOpenAddWebsite={handleOpenAddWebsite}
          />

          {/* Settings Modal */}
          <Settings 
            isOpen={showSettings}
            onClose={handleCloseSettings}
          />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}