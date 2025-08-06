'use client';

import { useState, useEffect } from 'react';
import { X, Save, TestTube, CheckCircle, XCircle, AlertCircle, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { getSettings, saveSettings } from '@/lib/storage';
import { validateApiKey } from '@/lib/psi-api';
import { testSlackWebhook, testEmailConfiguration, getEmailTemplateContent } from '@/lib/alerts';

export default function Settings({ isOpen, onClose }) {
  const [settings, setSettings] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [isTesting, setIsTesting] = useState({});
  const [showPasswords, setShowPasswords] = useState({});
  const [showHelp, setShowHelp] = useState({});

  useEffect(() => {
    if (isOpen) {
      setSettings(getSettings());
      setTestResults({});
      setIsTesting({});
    }
  }, [isOpen]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      saveSettings(settings);
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 500);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setIsSaving(false);
    }
  };

  const handleTest = async (testType) => {
    setIsTesting(prev => ({ ...prev, [testType]: true }));
    setTestResults(prev => ({ ...prev, [testType]: null }));

    try {
      let result = false;
      
      switch (testType) {
        case 'psi':
          result = await validateApiKey(settings.googlePsiApiKey);
          break;
        case 'slack':
          result = await testSlackWebhook(settings.slackWebhookUrl);
          break;
        case 'email':
          result = await testEmailConfiguration({
            serviceId: settings.emailJsServiceId,
            templateId: settings.emailJsTemplateId,
            userId: settings.emailJsUserId,
            accessToken: settings.emailJsAccessToken,
          });
          break;
      }
      
      setTestResults(prev => ({ ...prev, [testType]: result }));
    } catch (error) {
      console.error(`Test failed for ${testType}:`, error);
      setTestResults(prev => ({ ...prev, [testType]: false }));
    } finally {
      setIsTesting(prev => ({ ...prev, [testType]: false }));
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const toggleHelp = (section) => {
    setShowHelp(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getTestIcon = (testType) => {
    if (isTesting[testType]) return <TestTube className="animate-pulse" size={16} />;
    if (testResults[testType] === true) return <CheckCircle className="text-green-600" size={16} />;
    if (testResults[testType] === false) return <XCircle className="text-red-600" size={16} />;
    return <TestTube size={16} />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="text-xl font-bold text-card-foreground">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Google PageSpeed Insights API */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Google PageSpeed Insights API</h3>
              <button
                onClick={() => toggleHelp('psi')}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <HelpCircle size={16} />
              </button>
            </div>

            {showHelp.psi && (
              <div className="bg-secondary p-4 rounded-lg text-sm space-y-2">
                <p><strong>How to get an API key:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a></li>
                  <li>Create a new project or select an existing one</li>
                  <li>Enable the PageSpeed Insights API</li>
                  <li>Go to &quot;Credentials&quot; and create an API key</li>
                  <li>Restrict the API key to PageSpeed Insights API for security</li>
                </ol>
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type={showPasswords.psi ? 'text' : 'password'}
                  value={settings.googlePsiApiKey || ''}
                  onChange={(e) => handleSettingChange('googlePsiApiKey', e.target.value)}
                  placeholder="Enter Google PageSpeed Insights API Key"
                  className="input-field w-full"
                />
              </div>
              <button
                onClick={() => togglePasswordVisibility('psi')}
                className="btn-secondary p-2"
              >
                {showPasswords.psi ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                onClick={() => handleTest('psi')}
                disabled={!settings.googlePsiApiKey || isTesting.psi}
                className="btn-secondary flex items-center space-x-1 disabled:opacity-50"
              >
                {getTestIcon('psi')}
                <span>Test</span>
              </button>
            </div>
          </div>

          {/* Slack Notifications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Slack Notifications</h3>
              <button
                onClick={() => toggleHelp('slack')}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <HelpCircle size={16} />
              </button>
            </div>

            {showHelp.slack && (
              <div className="bg-secondary p-4 rounded-lg text-sm space-y-2">
                <p><strong>How to set up Slack webhook:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Go to your Slack workspace settings</li>
                  <li>Navigate to &quot;Apps&quot; and search for &quot;Incoming Webhooks&quot;</li>
                  <li>Add the app to your workspace</li>
                  <li>Create a new webhook and select the channel</li>
                  <li>Copy the webhook URL</li>
                </ol>
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type={showPasswords.slack ? 'text' : 'password'}
                  value={settings.slackWebhookUrl || ''}
                  onChange={(e) => handleSettingChange('slackWebhookUrl', e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="input-field w-full"
                />
              </div>
              <button
                onClick={() => togglePasswordVisibility('slack')}
                className="btn-secondary p-2"
              >
                {showPasswords.slack ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                onClick={() => handleTest('slack')}
                disabled={!settings.slackWebhookUrl || isTesting.slack}
                className="btn-secondary flex items-center space-x-1 disabled:opacity-50"
              >
                {getTestIcon('slack')}
                <span>Test</span>
              </button>
            </div>
          </div>

          {/* Email Notifications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Email Notifications (EmailJS)</h3>
              <button
                onClick={() => toggleHelp('email')}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <HelpCircle size={16} />
              </button>
            </div>

            {showHelp.email && (
              <div className="bg-secondary p-4 rounded-lg text-sm space-y-2">
                <p><strong>How to set up EmailJS:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Create an account at <a href="https://www.emailjs.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">EmailJS</a></li>
                  <li>Add an email service (Gmail, Outlook, etc.)</li>
                  <li>Create an email template using the template content below</li>
                  <li>Copy the Service ID, Template ID, and Public Key</li>
                </ol>
                
                <details className="mt-4">
                  <summary className="cursor-pointer font-medium">Email Template Content</summary>
                  <div className="mt-2 p-3 bg-muted rounded text-xs">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(getEmailTemplateContent(), null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Service ID
                </label>
                <input
                  type="text"
                  value={settings.emailJsServiceId || ''}
                  onChange={(e) => handleSettingChange('emailJsServiceId', e.target.value)}
                  placeholder="service_xxxxxxx"
                  className="input-field w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Template ID
                </label>
                <input
                  type="text"
                  value={settings.emailJsTemplateId || ''}
                  onChange={(e) => handleSettingChange('emailJsTemplateId', e.target.value)}
                  placeholder="template_xxxxxxx"
                  className="input-field w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Public Key (User ID)
                </label>
                <div className="flex gap-2">
                  <input
                    type={showPasswords.emailUser ? 'text' : 'password'}
                    value={settings.emailJsUserId || ''}
                    onChange={(e) => handleSettingChange('emailJsUserId', e.target.value)}
                    placeholder="user_xxxxxxxxxxxxxxx"
                    className="input-field flex-1"
                  />
                  <button
                    onClick={() => togglePasswordVisibility('emailUser')}
                    className="btn-secondary p-2"
                  >
                    {showPasswords.emailUser ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Private Key (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type={showPasswords.emailToken ? 'text' : 'password'}
                    value={settings.emailJsAccessToken || ''}
                    onChange={(e) => handleSettingChange('emailJsAccessToken', e.target.value)}
                    placeholder="Leave empty if not needed"
                    className="input-field flex-1"
                  />
                  <button
                    onClick={() => togglePasswordVisibility('emailToken')}
                    className="btn-secondary p-2"
                  >
                    {showPasswords.emailToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleTest('email')}
              disabled={!settings.emailJsServiceId || !settings.emailJsTemplateId || !settings.emailJsUserId || isTesting.email}
              className="btn-secondary flex items-center space-x-1 disabled:opacity-50"
            >
              {getTestIcon('email')}
              <span>Test Email</span>
            </button>
          </div>

          {/* Alert Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Alert Settings</h3>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="alertsEnabled"
                checked={settings.alertsEnabled || false}
                onChange={(e) => handleSettingChange('alertsEnabled', e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="alertsEnabled" className="text-sm font-medium text-foreground">
                Enable performance degradation alerts
              </label>
            </div>

            <div className="text-xs text-muted-foreground">
              Alerts will be sent when web vitals degrade significantly compared to previous measurements.
            </div>
          </div>

          {/* Auto-Refresh Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Auto-Refresh Settings</h3>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="autoRefreshEnabled"
                checked={settings.autoRefreshEnabled !== false}
                onChange={(e) => handleSettingChange('autoRefreshEnabled', e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="autoRefreshEnabled" className="text-sm font-medium text-foreground">
                Enable automatic data refresh
              </label>
            </div>

            {settings.autoRefreshEnabled !== false && (
              <div className="ml-7 space-y-3">
                <div className="flex items-center space-x-3">
                  <label htmlFor="autoRefreshInterval" className="text-sm font-medium text-foreground min-w-0 flex-shrink-0">
                    Refresh every:
                  </label>
                  <select
                    id="autoRefreshInterval"
                    value={settings.autoRefreshInterval || 24}
                    onChange={(e) => handleSettingChange('autoRefreshInterval', parseFloat(e.target.value))}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value={1/60}>1 minute</option>
                    <option value={5/60}>5 minutes</option>
                    <option value={10/60}>10 minutes</option>
                    <option value={0.5}>30 minutes</option>
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours</option>
                    <option value={4}>4 hours</option>
                    <option value={6}>6 hours</option>
                    <option value={8}>8 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours (daily)</option>
                    <option value={48}>48 hours (2 days)</option>
                    <option value={72}>72 hours (3 days)</option>
                    <option value={168}>Weekly</option>
                  </select>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  The app will automatically fetch fresh PageSpeed Insights data at your selected interval. 
                  More frequent refreshes may consume your API quota faster.
                </div>
              </div>
            )}
          </div>


          {/* Test Results */}
          {Object.keys(testResults).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Test Results:</h4>
              {Object.entries(testResults).map(([test, result]) => (
                <div key={test} className="flex items-center space-x-2 text-sm">
                  {result === true && <CheckCircle className="text-green-600" size={16} />}
                  {result === false && <XCircle className="text-red-600" size={16} />}
                  <span className="capitalize">{test}</span>: 
                  <span className={result ? 'text-green-600' : 'text-red-600'}>
                    {result ? 'Success' : 'Failed'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50"
          >
            <Save size={16} />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}