import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request) {
  try {
    const body = await request.json();
    const { urls = ['http://localhost:3000/'] } = body;
    
    // Validate URLs
    const validUrls = urls.filter(url => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });
    
    if (validUrls.length === 0) {
      return NextResponse.json(
        { error: 'No valid URLs provided' },
        { status: 400 }
      );
    }
    
    // Set environment variables for Lighthouse CI
    const env = {
      ...process.env,
      LIGHTHOUSE_URLS: validUrls.join(' ')
    };
    
    // Run Lighthouse CI
    const { stdout, stderr } = await execAsync('npx lhci autorun', {
      cwd: process.cwd(),
      env,
      timeout: 300000 // 5 minutes timeout
    });
    
    return NextResponse.json({
      success: true,
      message: `Lighthouse audit completed for ${validUrls.length} URL(s)`,
      urls: validUrls,
      output: stdout,
      warnings: stderr
    });
    
  } catch (error) {
    console.error('Error triggering Lighthouse audit:', error);
    
    // Check if it's a timeout error
    if (error.code === 'TIMEOUT') {
      return NextResponse.json(
        { error: 'Lighthouse audit timed out (5 minutes)', details: error.message },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to trigger Lighthouse audit', 
        details: error.message,
        output: error.stdout,
        stderr: error.stderr 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return status of Lighthouse CI and available reports
  try {
    const fs = require('fs');
    const path = require('path');
    
    const reportsDir = path.join(process.cwd(), 'public', 'lighthouse-reports');
    let reportCount = 0;
    
    if (fs.existsSync(reportsDir)) {
      const files = fs.readdirSync(reportsDir);
      reportCount = files.filter(file => file.endsWith('.json')).length;
    }
    
    return NextResponse.json({
      status: 'ready',
      reportsDirectory: reportsDir,
      reportCount,
      message: 'Lighthouse CI is ready to run audits'
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check Lighthouse status', details: error.message },
      { status: 500 }
    );
  }
}
