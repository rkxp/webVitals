import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';

export async function GET(request, { params }) {
  try {
    const { artifact_id, filename } = await params;
    
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
    
    // Find the specific HTML file (check both exact match and nested paths)
    let htmlEntry = zip.getEntry(filename);
    
    // If not found, search for HTML files with similar names in nested directories
    if (!htmlEntry) {
      const zipEntries = zip.getEntries();
      htmlEntry = zipEntries.find(entry => 
        entry.entryName.endsWith(filename) && 
        (entry.entryName.includes('.lighthouseci/') || 
         entry.entryName.includes('public/lighthouse-reports/') ||
         entry.entryName.includes('lighthouse-artifacts/'))
      );
    }
    
    if (!htmlEntry) {
      return NextResponse.json(
        { error: `HTML file ${filename} not found in artifact. Available entries: ${zip.getEntries().map(e => e.entryName).join(', ')}` },
        { status: 404 }
      );
    }
    
    // Get the HTML content
    const htmlContent = htmlEntry.getData().toString('utf8');
    
    // Return the HTML content
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('Error serving HTML report:', error);
    
    return NextResponse.json(
      { error: 'Failed to serve HTML report', details: error.message },
      { status: 500 }
    );
  }
}
