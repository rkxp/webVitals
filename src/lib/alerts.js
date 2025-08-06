/**
 * Alert system for web vitals degradation notifications
 */
import emailjs from '@emailjs/browser';

/**
 * Send Slack notification for vitals degradation
 * @param {string} webhookUrl - Slack webhook URL
 * @param {Object} alertData - Alert data
 * @returns {Promise<boolean>} Success status
 */
export async function sendSlackAlert(webhookUrl, alertData) {
  if (!webhookUrl) {
    throw new Error('Slack webhook URL is required');
  }

  const { url, urlName, degradedMetrics } = alertData;
  
  const message = {
    text: `🚨 Web Vitals Alert: Performance degradation detected`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 Web Vitals Performance Alert',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Website:* ${urlName}\n*URL:* ${url}\n*Alert Time:* ${new Date().toLocaleString()}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Degraded Metrics:*',
        },
      },
    ],
  };

  // Add details for each degraded metric
  degradedMetrics.forEach(metric => {
    const metricName = getMetricDisplayName(metric.metric);
    const unit = getMetricUnit(metric.metric);
    
    message.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `• *${metricName}:* ${metric.previousValue}${unit} → ${metric.newValue}${unit} (threshold: ${metric.threshold}${unit})`,
      },
    });
  });

  // Add action button
  message.blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'View Dashboard',
        },
        url: window.location.origin,
        action_id: 'view_dashboard',
      },
    ],
  });

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed with status ${response.status}`);
    }

    console.log('Slack alert sent successfully');
    return true;
  } catch (error) {
    console.error('Failed to send Slack alert:', error);
    throw error;
  }
}

/**
 * Send email notification for vitals degradation
 * @param {Object} emailConfig - EmailJS configuration
 * @param {Object} alertData - Alert data
 * @returns {Promise<boolean>} Success status
 */
export async function sendEmailAlert(emailConfig, alertData) {
  const { serviceId, templateId, userId, accessToken } = emailConfig;
  
  if (!serviceId || !templateId || !userId) {
    throw new Error('EmailJS configuration is incomplete');
  }

  const { url, urlName, degradedMetrics } = alertData;

  // Prepare template parameters
  const templateParams = {
    to_email: 'user@example.com', // This would typically come from user settings
    website_name: urlName,
    website_url: url,
    alert_time: new Date().toLocaleString(),
    degraded_metrics: formatMetricsForEmail(degradedMetrics),
    dashboard_url: window.location.origin,
  };

  try {
    // Initialize EmailJS if not already done
    if (accessToken) {
      emailjs.init({
        publicKey: userId,
        privateKey: accessToken,
      });
    } else {
      emailjs.init(userId);
    }

    const response = await emailjs.send(serviceId, templateId, templateParams);
    
    console.log('Email alert sent successfully:', response);
    return true;
  } catch (error) {
    console.error('Failed to send email alert:', error);
    throw error;
  }
}

/**
 * Test Slack webhook configuration
 * @param {string} webhookUrl - Slack webhook URL
 * @returns {Promise<boolean>} Test success status
 */
export async function testSlackWebhook(webhookUrl) {
  const testMessage = {
    text: '✅ Web Vitals Alert Test',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Web Vitals Monitoring Test*\n\nYour Slack integration is working correctly! You will receive alerts here when web vitals degrade.',
        },
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
    });

    return response.ok;
  } catch (error) {
    console.error('Slack webhook test failed:', error);
    return false;
  }
}

/**
 * Test EmailJS configuration
 * @param {Object} emailConfig - EmailJS configuration
 * @returns {Promise<boolean>} Test success status
 */
export async function testEmailConfiguration(emailConfig) {
  const testData = {
    url: 'https://example.com',
    urlName: 'Test Website',
    degradedMetrics: [
      {
        metric: 'lcp',
        previousValue: 2.1,
        newValue: 3.5,
        threshold: 2.5,
      },
    ],
  };

  try {
    await sendEmailAlert(emailConfig, testData);
    return true;
  } catch (error) {
    console.error('Email configuration test failed:', error);
    return false;
  }
}

/**
 * Send alert based on user preferences
 * @param {Object} settings - User settings
 * @param {Object} alertData - Alert data
 * @returns {Promise<Object>} Results of alert attempts
 */
export async function sendAlert(settings, alertData) {
  if (!settings.alertsEnabled) {
    return { slack: null, email: null, message: 'Alerts disabled' };
  }

  const results = { slack: null, email: null };

  // Send Slack alert if configured
  if (settings.slackWebhookUrl) {
    try {
      await sendSlackAlert(settings.slackWebhookUrl, alertData);
      results.slack = { success: true };
    } catch (error) {
      results.slack = { success: false, error: error.message };
    }
  }

  // Send email alert if configured
  if (settings.emailJsServiceId && settings.emailJsTemplateId && settings.emailJsUserId) {
    try {
      const emailConfig = {
        serviceId: settings.emailJsServiceId,
        templateId: settings.emailJsTemplateId,
        userId: settings.emailJsUserId,
        accessToken: settings.emailJsAccessToken,
      };
      
      await sendEmailAlert(emailConfig, alertData);
      results.email = { success: true };
    } catch (error) {
      results.email = { success: false, error: error.message };
    }
  }

  return results;
}

/**
 * Get display name for metric
 * @param {string} metric - Metric key
 * @returns {string} Display name
 */
function getMetricDisplayName(metric) {
  const displayNames = {
    lcp: 'Largest Contentful Paint',
    fcp: 'First Contentful Paint',
    cls: 'Cumulative Layout Shift',
    ttfb: 'Time to First Byte',
    inp: 'Interaction to Next Paint',
    performance: 'Performance Score',
  };
  
  return displayNames[metric] || metric.toUpperCase();
}

/**
 * Get unit for metric
 * @param {string} metric - Metric key
 * @returns {string} Unit string
 */
function getMetricUnit(metric) {
  const units = {
    lcp: 's',
    fcp: 's',
    cls: '',
    ttfb: 's',
    inp: 'ms',
    performance: '/100',
  };
  
  return units[metric] || '';
}

/**
 * Format degraded metrics for email template
 * @param {Array} degradedMetrics - Array of degraded metrics
 * @returns {string} Formatted string for email
 */
function formatMetricsForEmail(degradedMetrics) {
  return degradedMetrics
    .map(metric => {
      const name = getMetricDisplayName(metric.metric);
      const unit = getMetricUnit(metric.metric);
      return `${name}: ${metric.previousValue}${unit} → ${metric.newValue}${unit} (threshold: ${metric.threshold}${unit})`;
    })
    .join('\n');
}

/**
 * Create EmailJS template for web vitals alerts
 * This is a helper function that returns the template content
 * Users can copy this to create their EmailJS template
 */
export function getEmailTemplateContent() {
  return {
    subject: '🚨 Web Vitals Alert: {{website_name}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f44336; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🚨 Web Vitals Performance Alert</h1>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <h2>Performance Degradation Detected</h2>
          
          <div style="background: white; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <strong>Website:</strong> {{website_name}}<br>
            <strong>URL:</strong> <a href="{{website_url}}">{{website_url}}</a><br>
            <strong>Alert Time:</strong> {{alert_time}}
          </div>
          
          <h3>Degraded Metrics:</h3>
          <div style="background: white; padding: 15px; border-radius: 5px; white-space: pre-line;">
            {{degraded_metrics}}
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="{{dashboard_url}}" style="background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Dashboard
            </a>
          </div>
        </div>
        
        <div style="padding: 10px; text-align: center; color: #666; font-size: 12px;">
          This alert was sent by your Web Vitals Monitoring dashboard.
        </div>
      </div>
    `,
    textContent: `
      Web Vitals Performance Alert
      
      Website: {{website_name}}
      URL: {{website_url}}
      Alert Time: {{alert_time}}
      
      Degraded Metrics:
      {{degraded_metrics}}
      
      View your dashboard: {{dashboard_url}}
    `,
  };
}