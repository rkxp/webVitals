'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings, Sun, Moon, Monitor, BarChart3, Globe, Zap, Plus, Trash2, Clock, ChevronDown, ChevronUp, X, Link, HelpCircle, Loader, AlertTriangle, CheckCircle, Search, Calendar, ExternalLink } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { addTrackedUrl, removeTrackedUrl } from '@/lib/storage';

export default function Header({ onOpenSettings, trackedUrls = [], onUrlsChange, hasApiKey = false, triggerAddWebsite = 0, nextAutoRefresh = null, autoRefreshEnabled = true }) {
  // Updated for Lighthouse CI component mapping test - workflow success!
  const { theme, changeTheme } = useTheme();
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [websitesMenuOpen, setWebsitesMenuOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newUrlName, setNewUrlName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [urlValidation, setUrlValidation] = useState({ isValid: false, message: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'name', 'lastChecked'
  
  const themeDropdownRef = useRef(null);
  const websitesDropdownRef = useRef(null);

  // Modal handlers
  const handleOpenModal = () => {
    setShowAddModal(true);
    document.body.style.overflow = 'hidden';
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setError('');
    setSuccess('');
    setNewUrl('');
    setNewUrlName('');
    setUrlValidation({ isValid: false, message: '' });
    document.body.style.overflow = 'unset';
  };

  // Watch for trigger to open add website modal
  useEffect(() => {
    if (triggerAddWebsite > 0) {
      handleOpenModal();
    }
  }, [triggerAddWebsite]);

  // Cleanup body overflow on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close theme dropdown if clicking outside
      if (themeMenuOpen && themeDropdownRef.current && !themeDropdownRef.current.contains(event.target)) {
        setThemeMenuOpen(false);
      }
      
      // Close websites dropdown if clicking outside (but not when form is being used)
      if (websitesMenuOpen && websitesDropdownRef.current && !websitesDropdownRef.current.contains(event.target)) {
        setWebsitesMenuOpen(false);
      }
    };

    // Only add event listener when dropdowns are open
    if (themeMenuOpen || websitesMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [themeMenuOpen, websitesMenuOpen]);

  // Auto-open websites menu for first-time users
  useEffect(() => {
    if (trackedUrls.length === 0 && !hasApiKey) {
      const timer = setTimeout(() => {
        setWebsitesMenuOpen(true);
        setShowAddForm(true);
      }, 1000); // Show after 1 second for first-time users
      
      return () => clearTimeout(timer);
    }
  }, [trackedUrls.length, hasApiKey]);

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const validateUrl = (url) => {
    if (!url.trim()) {
      return { isValid: false, message: '' };
    }

    // Check if URL is already being tracked
    const normalizedUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
    const existingUrl = trackedUrls.find(u => u.url.toLowerCase() === normalizedUrl.toLowerCase());
    if (existingUrl) {
      return { isValid: false, message: `This URL is already being tracked as "${existingUrl.name}"` };
    }

    try {
      const urlObj = new URL(normalizedUrl);
      if (!urlObj.hostname || urlObj.hostname.length < 3) {
        return { isValid: false, message: 'Please enter a valid domain name' };
      }
      
      // Check for common invalid patterns
      if (urlObj.hostname === 'localhost' || urlObj.hostname.includes('127.0.0.1')) {
        return { isValid: false, message: 'Local URLs cannot be monitored with PageSpeed Insights' };
      }
      
      if (!urlObj.hostname.includes('.')) {
        return { isValid: false, message: 'Please enter a complete domain (e.g., example.com)' };
      }

      return { isValid: true, message: `Ready to monitor: ${urlObj.hostname}` };
    } catch {
      return { isValid: false, message: 'Please enter a valid URL format (e.g., https://example.com)' };
    }
  };

  const handleUrlChange = (value) => {
    setNewUrl(value);
    setError('');
    setSuccess('');
    
    const validation = validateUrl(value);
    setUrlValidation(validation);
    
    // Auto-generate display name if not manually set
    if (validation.isValid && !newUrlName) {
      try {
        const normalizedUrl = value.trim().startsWith('http') ? value.trim() : `https://${value.trim()}`;
        const urlObj = new URL(normalizedUrl);
        const suggestedName = urlObj.hostname.replace('www.', '');
        setNewUrlName(suggestedName.charAt(0).toUpperCase() + suggestedName.slice(1));
      } catch {}
    }
  };

  const handleAddUrl = async () => {
    if (!newUrl.trim()) {
      setError('Please enter a website URL to monitor');
      return;
    }

    const validation = validateUrl(newUrl);
    if (!validation.isValid) {
      setError(validation.message);
      return;
    }

    setError('');
    setSuccess('');
    setIsAdding(true);

    try {
      const normalizedUrl = newUrl.trim().startsWith('http') ? newUrl.trim() : `https://${newUrl.trim()}`;
      const success = addTrackedUrl(normalizedUrl, newUrlName.trim() || normalizedUrl);
      
      if (success) {
        setSuccess(`✅ Successfully added ${newUrlName || normalizedUrl} to monitoring!`);
        
        // Reset form after a short delay to show success message
        setTimeout(() => {
          setNewUrl('');
          setNewUrlName('');
          setShowAddModal(false);
          setSuccess('');
          setUrlValidation({ isValid: false, message: '' });
        }, 1500);
        
        onUrlsChange && onUrlsChange();
      } else {
        setError('This URL is already being tracked');
      }
    } catch (err) {
      setError(`Failed to add website: ${err.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isAdding) {
      e.preventDefault();
      handleAddUrl();
    }
    if (e.key === 'Escape') {
      handleCloseModal();
    }
  };

  const getExampleUrls = () => [
    'https://www.contentstack.com',
    'https://www.contentstack.com/about',
    'https://google.com',
    'https://github.com',
    'https://stackoverflow.com',
    'https://your-website.com'
  ];

  // Filter and sort URLs
  const getFilteredAndSortedUrls = () => {
    let filtered = trackedUrls;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = trackedUrls.filter(url => 
        url.name.toLowerCase().includes(query) || 
        url.url.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
        case 'oldest':
          return new Date(a.addedAt || 0) - new Date(b.addedAt || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'lastChecked':
          if (!a.lastChecked && !b.lastChecked) return 0;
          if (!a.lastChecked) return 1;
          if (!b.lastChecked) return -1;
          return new Date(b.lastChecked) - new Date(a.lastChecked);
        default:
          return 0;
      }
    });
    
    return sorted;
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const handleRemoveUrl = (id, name) => {
    const message = `Are you sure you want to remove "${name}"?\n\nThis will permanently delete:\n• All performance data and history\n• Monitoring alerts for this URL\n• All associated vitals metrics\n\nThis action cannot be undone.`;
    
    if (confirm(message)) {
      removeTrackedUrl(id);
      onUrlsChange();
      
      // Clear search if the deleted item was the only result
      const filteredUrls = getFilteredAndSortedUrls();
      if (filteredUrls.length === 1 && filteredUrls[0].id === id) {
        setSearchQuery('');
      }
    }
  };



  const formatLastChecked = (lastChecked) => {
    if (!lastChecked) return 'Never';
    
    const date = new Date(lastChecked);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  const closeAllMenus = () => {
    setThemeMenuOpen(false);
    setWebsitesMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-[2147483646] bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 min-h-[4rem]">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
            <div className="flex items-center min-w-0">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <Zap className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground tracking-tight truncate">
                    Web Vitals Monitor
                  </h1>
                  <p className="text-xs text-muted-foreground hidden sm:block truncate">
                    Performance insights like Google PageSpeed
                  </p>
                </div>
              </div>
            </div>
            
            {/* Websites Management */}
            <div className="hidden md:flex items-center space-x-3 flex-shrink-0">
              <div className="relative" ref={websitesDropdownRef}>
                <button
                  onClick={() => {
                    setWebsitesMenuOpen(!websitesMenuOpen);
                    setThemeMenuOpen(false);
                  }}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    websitesMenuOpen 
                      ? 'bg-accent text-accent-foreground' 
                      : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                  }`}
                  title="Manage websites"
                >
                  <Globe size={16} />
                  <span>
                    {trackedUrls.length} site{trackedUrls.length !== 1 ? 's' : ''}
                  </span>
                  <ChevronDown size={14} className={`transition-transform ${websitesMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {websitesMenuOpen && (
                  <div 
                    className="dropdown-menu left-0 right-0 sm:left-0 sm:right-auto mt-2 sm:w-[480px] max-w-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-4 max-h-[80vh] overflow-y-auto">
                      {/* Header with search and controls */}
                      <div className="space-y-4 mb-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            Manage Websites ({trackedUrls.length})
                          </h3>
                          <button
                            onClick={handleOpenModal}
                            className="flex items-center space-x-1 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md transition-colors"
                          >
                            <Plus size={12} />
                            <span>Add</span>
                          </button>
                        </div>
                        
                        {trackedUrls.length > 0 && (
                          <>
                            {/* Search Bar */}
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <input
                                type="text"
                                placeholder="Search websites..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-10 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                              />
                              {searchQuery && (
                                <button
                                  onClick={clearSearch}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                            
                            {/* Sort Options */}
                            <div className="flex items-center space-x-2 text-sm">
                              <span className="text-muted-foreground">Sort by:</span>
                              <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                              >
                                <option value="newest">Recently Added</option>
                                <option value="oldest">Oldest First</option>
                                <option value="name">Name A-Z</option>
                                <option value="lastChecked">Last Checked</option>
                              </select>
                            </div>
                          </>
                        )}
                      </div>



                      {/* Websites list */}
                      {trackedUrls.length > 0 ? (
                        (() => {
                          const filteredUrls = getFilteredAndSortedUrls();
                          
                          if (filteredUrls.length === 0) {
                            return (
                              <div className="text-center py-8 text-muted-foreground">
                                <Search size={24} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No websites match &quot;{searchQuery}&quot;</p>
                                <button
                                  onClick={clearSearch}
                                  className="text-blue-600 dark:text-blue-400 text-sm hover:underline mt-1"
                                >
                                  Clear search
                                </button>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                              {filteredUrls.map((url) => (
                                <div
                                  key={url.id}
                                  className="group flex items-start justify-between p-3 bg-secondary/20 hover:bg-secondary/40 rounded-lg border border-border/50 hover:border-border transition-all duration-200"
                                >
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center space-x-2">
                                      <div className="font-medium text-sm text-foreground truncate">
                                        {url.name}
                                      </div>
                                      <a
                                        href={url.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-blue-600 transition-all"
                                        title="Visit website"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <ExternalLink size={12} />
                                      </a>
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {url.url}
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <div className="flex items-center space-x-3">
                                        <div className="flex items-center">
                                          <Clock size={10} className="mr-1" />
                                          {formatLastChecked(url.lastChecked)}
                                        </div>
                                        <div className="flex items-center">
                                          <Calendar size={10} className="mr-1" />
                                          {new Date(url.addedAt).toLocaleDateString()}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveUrl(url.id, url.name)}
                                    className="ml-3 p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all duration-200 opacity-70 group-hover:opacity-100"
                                    title={`Remove ${url.name}`}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          );
                        })()
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Globe size={32} className="mx-auto mb-3 opacity-50" />
                          <p className="text-sm font-medium mb-1">No websites tracked yet</p>
                          <p className="text-xs mb-3">Start monitoring your website&apos;s performance</p>
                          <button
                            onClick={handleOpenModal}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                          >
                            Add Your First Website
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* API Status */}
              <div className={`flex items-center space-x-1 text-xs ${
                hasApiKey ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  hasApiKey ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <span>{hasApiKey ? 'API Connected' : 'Setup Required'}</span>
              </div>
            </div>
          </div>

        

          {/* Right Side Actions */}
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            {/* Theme Toggle */}
            <div className="relative" ref={themeDropdownRef}>
              <button
                onClick={() => {
                  setThemeMenuOpen(!themeMenuOpen);
                  setWebsitesMenuOpen(false);
                }}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
                title="Toggle theme"
              >
                {theme === 'light' && <Sun size={16} className="sm:w-[18px] sm:h-[18px]" />}
                {theme === 'dark' && <Moon size={16} className="sm:w-[18px] sm:h-[18px]" />}
                {theme === 'system' && <Monitor size={16} className="sm:w-[18px] sm:h-[18px]" />}
              </button>

              {themeMenuOpen && (
                <div 
                  className="dropdown-menu right-0 mt-2 w-48"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="py-1">
                    {themeOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          onClick={() => {
                            changeTheme(option.value);
                            setThemeMenuOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center transition-colors ${
                            theme === option.value
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          <Icon size={16} className="mr-2" />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Add Website Button */}
            <button
              onClick={handleOpenModal}
              className="flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              title="Add Website"
            >
              <Plus size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Add Website</span>
            </button>

            {/* Mobile Websites Button */}
            <div className="md:hidden relative">
              <button
                onClick={() => {
                  setWebsitesMenuOpen(!websitesMenuOpen);
                  setThemeMenuOpen(false);
                }}
                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                  websitesMenuOpen 
                    ? 'bg-accent text-accent-foreground' 
                    : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                }`}
                title="Manage websites"
              >
                <Globe size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>

              {websitesMenuOpen && (
                <div 
                  className="dropdown-menu fixed left-4 right-4 mt-2 max-w-lg mx-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 max-h-[85vh] overflow-y-auto">
                    {/* Header with search and controls */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                          Manage Websites ({trackedUrls.length})
                        </h3>
                        <button
                          onClick={handleOpenModal}
                          className="flex items-center space-x-1 text-sm bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-md transition-colors"
                        >
                          <Plus size={12} />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>

                    {/* Website List */}
                    {trackedUrls.length > 0 ? (
                      (() => {
                        const filteredUrls = getFilteredAndSortedUrls();
                        
                        if (filteredUrls.length === 0) {
                          return (
                            <div className="text-center py-8 text-muted-foreground">
                              <Search size={24} className="mx-auto mb-3 opacity-50" />
                              <p className="text-sm">No websites match your search</p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-2">
                            {filteredUrls.map((url) => (
                              <div key={url.id} className="group p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                                <div className="flex items-start justify-between">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center space-x-2">
                                      <h4 className="font-medium text-sm text-foreground truncate">
                                        {url.name}
                                      </h4>
                                      <a 
                                        href={url.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                        title="Open website"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <ExternalLink size={12} />
                                      </a>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1 break-all">
                                      {url.url}
                                    </div>
                                    <div className="flex items-center space-x-2 mt-2 text-xs text-muted-foreground">
                                      <Calendar size={8} className="mr-1" />
                                      <span>Added {new Date(url.addedAt).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveUrl(url.id, url.name)}
                                    className="ml-2 p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all duration-200 opacity-70 group-hover:opacity-100"
                                    title={`Remove ${url.name}`}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <Globe size={24} className="mx-auto mb-3 opacity-50" />
                        <p className="text-sm font-medium mb-1">No websites tracked yet</p>
                        <p className="text-xs mb-3">Start monitoring your website&apos;s performance</p>
                        <button
                          onClick={handleOpenModal}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm transition-colors"
                        >
                          Add Your First Website
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
              title="Settings"
            >
              <Settings size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop to close dropdowns when clicking outside */}
      {(themeMenuOpen || websitesMenuOpen) && (
        <div 
          className="fixed inset-0 z-[2147483645]" 
          onClick={() => {
            setThemeMenuOpen(false);
            setWebsitesMenuOpen(false);
          }}
        />
      )}

      {/* Add Website Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 z-[2147483647] modal-backdrop-enhanced"
          onClick={handleCloseModal}
        >
          <div 
            className="modal-content bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-8 space-y-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Add New Website</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start monitoring Core Web Vitals for your website
                  </p>
                </div>
              </div>
                          <button
              onClick={handleCloseModal}
              className="p-2 hover:bg-white/50 dark:hover:bg-black/20 rounded-lg transition-all duration-200 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
            </div>

            <div className="space-y-6">
              {/* URL Input Section */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Link className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <label className="text-sm font-medium text-foreground">
                    Website URL
                  </label>
                  <span className="text-red-500">*</span>
                  <div className="group relative">
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
                      <div className="bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                        We&apos;ll add https:// if not provided
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your website URL (e.g., example.com)"
                    className={`input-field w-full pl-12 pr-12 py-3 text-base ${
                      newUrl && urlValidation.isValid ? 'border-green-500 focus:border-green-500' :
                      newUrl && !urlValidation.isValid ? 'border-red-500 focus:border-red-500' :
                      'border-border'
                    }`}
                    disabled={isAdding}
                    autoFocus
                  />
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  {newUrl && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {urlValidation.isValid ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : urlValidation.message ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Real-time validation feedback */}
                {newUrl && urlValidation.message && (
                  <div className={`flex items-center space-x-2 text-sm p-3 rounded-lg ${
                    urlValidation.isValid 
                      ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                  }`}>
                    {urlValidation.isValid ? (
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span>{urlValidation.message}</span>
                  </div>
                )}

                {/* URL Examples */}
                {!newUrl && (
                  <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 border border-dashed border-blue-200 dark:border-blue-700">
                    <div className="text-sm text-muted-foreground mb-3">Quick examples:</div>
                    <div className="flex flex-wrap gap-2">
                      {getExampleUrls().map((example) => (
                        <button
                          key={example}
                          onClick={() => handleUrlChange(example)}
                          className="text-xs px-3 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/70 transition-all duration-200 font-medium border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700"
                          disabled={isAdding}
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Display Name Section */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 text-gray-400">📝</div>
                  <label className="text-sm font-medium text-foreground">
                    Display Name
                  </label>
                  <span className="text-xs text-muted-foreground">(optional)</span>
                </div>
                
                <input
                  type="text"
                  value={newUrlName}
                  onChange={(e) => setNewUrlName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Friendly name for your website"
                  className="input-field w-full px-4 py-3 text-base"
                  disabled={isAdding}
                />
                
                <div className="text-xs text-muted-foreground">
                  {newUrlName ? (
                    `Will appear as: "${newUrlName}"`
                  ) : urlValidation.isValid ? (
                    "We'll auto-generate a name based on your URL"
                  ) : (
                    "This helps you identify your website in the dashboard"
                  )}
                </div>
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-lg flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Unable to add website</div>
                  <div className="text-sm mt-1">{error}</div>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 p-4 rounded-lg flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Website added successfully!</div>
                  <div className="text-sm mt-1">{success}</div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-blue-200 dark:border-blue-800">
              <div className="text-sm text-muted-foreground">
                <kbd className="px-2 py-1 bg-white/70 dark:bg-black/30 border border-gray-300 dark:border-gray-600 rounded text-xs">Enter</kbd> to add • 
                <kbd className="px-2 py-1 bg-white/70 dark:bg-black/30 border border-gray-300 dark:border-gray-600 rounded text-xs ml-1">Esc</kbd> to cancel
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleCloseModal}
                  className="px-6 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 font-medium"
                  disabled={isAdding}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUrl}
                  disabled={isAdding || !urlValidation.isValid}
                  className="btn-primary px-6 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                >
                  {isAdding ? (
                    <>
                      <Loader size={16} className="animate-spin mr-2" />
                      <span>Adding Website...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} className="mr-2" />
                      <span>Start Monitoring</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}