import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';

export async function GET(request, { params }) {
  try {
    const { artifact_id } = params;
    
    const owner = process.env.GITHUB_REPOSITORY_OWNER || 'rkxp';
    const repo = process.env.GITHUB_REPOSITORY_NAME || 'webVitals';
    const token = process.env.GITHUB_TOKEN;
    
    if (!token) {
      return NextResponse.json(
        { error: 'GitHub token not configured' },
        { status: 401 }
      );
    }
    
    // Download artifact from GitHub
    const downloadResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/artifacts/${artifact_id}/zip`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'WebVitals-Dashboard'
        }
      }
    );
    
    if (!downloadResponse.ok) {
      throw new Error(`Failed to download artifact: ${downloadResponse.status} ${downloadResponse.statusText}`);
    }
    
    // Process the ZIP file
    const arrayBuffer = await downloadResponse.arrayBuffer();
    const zip = new AdmZip(Buffer.from(arrayBuffer));
    const zipEntries = zip.getEntries();
    
    const lighthouseReports = [];
    
    // Extract Lighthouse JSON reports
    zipEntries.forEach(entry => {
      if (entry.entryName.includes('public/lighthouse-reports/') && 
          entry.entryName.endsWith('.json') &&
          !entry.entryName.includes('manifest.json')) {
        
        try {
          const content = entry.getData().toString('utf8');
          const reportData = JSON.parse(content);
          
          // Extract key performance data
          const extractedData = {
            url: reportData.finalUrl || reportData.requestedUrl,
            timestamp: reportData.fetchTime,
            lighthouse_version: reportData.lighthouseVersion,
            user_agent: reportData.userAgent,
            categories: {},
            audits: {},
            environment: reportData.environment
          };
          
          // Extract category scores
          if (reportData.categories) {
            Object.keys(reportData.categories).forEach(category => {
              extractedData.categories[category] = {
                score: reportData.categories[category].score,
                title: reportData.categories[category].title
              };
            });
          }
          
          // Extract key audit results
          const keyAudits = [
            'largest-contentful-paint',
            'cumulative-layout-shift', 
            'interaction-to-next-paint',
            'first-contentful-paint',
            'speed-index',
            'total-blocking-time',
            'server-response-time',
            'interactive',
            'color-contrast',
            'image-alt',
            'meta-description',
            'document-title'
          ];
          
          keyAudits.forEach(auditId => {
            if (reportData.audits && reportData.audits[auditId]) {
              const audit = reportData.audits[auditId];
              extractedData.audits[auditId] = {
                score: audit.score,
                numericValue: audit.numericValue,
                displayValue: audit.displayValue,
                title: audit.title,
                description: audit.description
              };
            }
          });
          
          lighthouseReports.push(extractedData);
        } catch (parseError) {
          console.error(`Error parsing Lighthouse report ${entry.entryName}:`, parseError);
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      artifact_id,
      reports: lighthouseReports,
      report_count: lighthouseReports.length
    });
    
  } catch (error) {
    console.error('Error extracting Lighthouse data:', error);
    return NextResponse.json(
      { error: 'Failed to extract Lighthouse data', details: error.message },
      { status: 500 }
    );
  }
}
