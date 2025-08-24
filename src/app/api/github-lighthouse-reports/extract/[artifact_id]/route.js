import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';

export async function GET(request, { params }) {
  try {
    const { artifact_id } = await params;
    
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
    const htmlReports = [];
    
    // Extract Lighthouse reports (both JSON and HTML)
    console.log('🔍 Processing ZIP entries:', zipEntries.map(e => e.entryName));
    
    zipEntries.forEach(entry => {
      console.log('📂 Processing entry:', entry.entryName);
      
      // Check for Lighthouse JSON reports
      const isLighthouseJsonReport = (
        (entry.entryName.includes('.lighthouseci/') && entry.entryName.endsWith('.json')) ||
        (entry.entryName.includes('public/lighthouse-reports/') && entry.entryName.endsWith('.json')) ||
        (entry.entryName.includes('lighthouse-artifacts/') && entry.entryName.endsWith('.json'))
      ) && !entry.entryName.includes('manifest.json') && !entry.entryName.includes('workflow-metadata.json');
      
      // Check for Lighthouse HTML reports
      const isLighthouseHtmlReport = (
        (entry.entryName.includes('.lighthouseci/') && entry.entryName.endsWith('.html')) ||
        (entry.entryName.includes('public/lighthouse-reports/') && entry.entryName.endsWith('.html')) ||
        (entry.entryName.includes('lighthouse-artifacts/') && entry.entryName.endsWith('.html'))
      );
      
      if (isLighthouseJsonReport) {
        console.log('✅ Found Lighthouse report:', entry.entryName);
        
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
      
      // Process HTML reports
      if (isLighthouseHtmlReport) {
        console.log('✅ Found Lighthouse HTML report:', entry.entryName);
        
        try {
          const htmlContent = entry.getData().toString('utf8');
          
          // Extract basic info from HTML content
          const urlMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
          const title = urlMatch ? urlMatch[1].trim() : 'Lighthouse Report';
          
          // Try to extract URL from HTML content
          const urlMatch2 = htmlContent.match(/URL: ([^\n\r<]+)/i);
          const url = urlMatch2 ? urlMatch2[1].trim() : 'Unknown URL';
          
          htmlReports.push({
            filename: entry.entryName.split('/').pop(),
            title: title,
            url: url,
            size: entry.header.size,
            content: htmlContent.substring(0, 1000) + '...' // First 1000 chars for preview
          });
        } catch (parseError) {
          console.error(`Error processing HTML report ${entry.entryName}:`, parseError);
        }
      }
    });
    
    console.log(`📊 Extracted ${lighthouseReports.length} Lighthouse JSON reports and ${htmlReports.length} HTML reports`);
    
    // If no reports found, check for workflow metadata to explain why
    if (lighthouseReports.length === 0 && htmlReports.length === 0) {
      const metadataEntry = zipEntries.find(entry => 
        entry.entryName.includes('workflow-metadata.json')
      );
      
      let metadata = null;
      if (metadataEntry) {
        try {
          const metadataContent = metadataEntry.getData().toString('utf8');
          metadata = JSON.parse(metadataContent);
          console.log('📋 Found workflow metadata:', metadata);
        } catch (err) {
          console.error('Error parsing metadata:', err);
        }
      }
      
      return NextResponse.json({
        success: true,
        artifact_id,
        reports: [],
        report_count: 0,
        metadata,
        message: metadata ? 
          'Workflow run was skipped or did not generate Lighthouse reports' : 
          'No Lighthouse reports found in artifact',
        zip_contents: zipEntries.map(e => e.entryName)
      });
    }
    
          return NextResponse.json({
        success: true,
        artifact_id,
        reports: lighthouseReports,
        html_reports: htmlReports,
        report_count: lighthouseReports.length,
        html_report_count: htmlReports.length
      });
    
  } catch (error) {
    console.error('Error extracting Lighthouse data:', error);
    return NextResponse.json(
      { error: 'Failed to extract Lighthouse data', details: error.message },
      { status: 500 }
    );
  }
}
