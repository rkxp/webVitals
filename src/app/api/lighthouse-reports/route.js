import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const reportsDir = path.join(process.cwd(), 'public', 'lighthouse-reports');
    
    // Check if reports directory exists
    if (!fs.existsSync(reportsDir)) {
      return NextResponse.json({ reports: [] });
    }

    // Read all JSON files in the reports directory
    const files = fs.readdirSync(reportsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const reports = [];
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(reportsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const reportData = JSON.parse(content);
        
        // Extract key information from the Lighthouse report
        const report = {
          filename: file,
          timestamp: reportData.fetchTime || Date.now(),
          url: reportData.finalUrl || reportData.requestedUrl || 'Unknown',
          htmlPath: `/lighthouse-reports/${file.replace('.json', '.html')}`,
          jsonPath: `/lighthouse-reports/${file}`,
          categories: reportData.categories || {},
          audits: {
            'largest-contentful-paint': reportData.audits?.['largest-contentful-paint'],
            'cumulative-layout-shift': reportData.audits?.['cumulative-layout-shift'],
            'interaction-to-next-paint': reportData.audits?.['interaction-to-next-paint'],
            'first-contentful-paint': reportData.audits?.['first-contentful-paint'],
            'speed-index': reportData.audits?.['speed-index'],
            'total-blocking-time': reportData.audits?.['total-blocking-time']
          },
          lighthouseVersion: reportData.lighthouseVersion,
          userAgent: reportData.userAgent
        };
        
        reports.push(report);
      } catch (parseError) {
        console.error(`Error parsing report ${file}:`, parseError);
        // Skip malformed files
      }
    }
    
    // Sort reports by timestamp (newest first)
    reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return NextResponse.json({ 
      reports,
      count: reports.length 
    });
    
  } catch (error) {
    console.error('Error fetching Lighthouse reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Lighthouse reports' },
      { status: 500 }
    );
  }
}

export async function POST() {
  // Trigger a new Lighthouse audit
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    // Run Lighthouse CI locally
    const { stdout, stderr } = await execPromise('npx lhci autorun', {
      cwd: process.cwd(),
      env: {
        ...process.env,
        LIGHTHOUSE_URLS: 'http://localhost:3000/'
      }
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Lighthouse audit triggered successfully',
      output: stdout
    });
    
  } catch (error) {
    console.error('Error triggering Lighthouse audit:', error);
    return NextResponse.json(
      { error: 'Failed to trigger Lighthouse audit', details: error.message },
      { status: 500 }
    );
  }
}
