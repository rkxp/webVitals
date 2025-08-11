import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
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
    
    // Get artifact info first
    const artifactInfoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/artifacts/${artifact_id}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'WebVitals-Dashboard'
        }
      }
    );
    
    const artifactInfo = await artifactInfoResponse.json();
    
    // If this is a sync request (download and store locally)
    const { searchParams } = new URL(request.url);
    const sync = searchParams.get('sync') === 'true';
    
    if (sync) {
      // Download, extract, and store locally
      const arrayBuffer = await downloadResponse.arrayBuffer();
      const zip = new AdmZip(Buffer.from(arrayBuffer));
      
      const reportsDir = path.join(process.cwd(), 'public', 'lighthouse-reports', 'github-actions');
      const runDir = path.join(reportsDir, `run-${artifactInfo.workflow_run.id}`);
      
      // Ensure directories exist
      fs.mkdirSync(runDir, { recursive: true });
      
      // Extract Lighthouse reports
      const zipEntries = zip.getEntries();
      const extractedFiles = [];
      
      zipEntries.forEach(entry => {
        if (entry.entryName.includes('public/lighthouse-reports/') && 
            (entry.entryName.endsWith('.json') || entry.entryName.endsWith('.html'))) {
          
          const fileName = path.basename(entry.entryName);
          const filePath = path.join(runDir, fileName);
          
          // Extract file
          zip.extractEntryTo(entry, runDir, false, true, false, fileName);
          extractedFiles.push(fileName);
        }
      });
      
      // Create metadata file
      const metadata = {
        artifact_id,
        workflow_run_id: artifactInfo.workflow_run.id,
        artifact_name: artifactInfo.name,
        created_at: artifactInfo.created_at,
        workflow_run: artifactInfo.workflow_run,
        extracted_files: extractedFiles,
        synced_at: new Date().toISOString()
      };
      
      fs.writeFileSync(
        path.join(runDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      return NextResponse.json({
        success: true,
        message: 'Artifact synced successfully',
        artifact_id,
        extracted_files: extractedFiles,
        local_path: runDir
      });
    }
    
    // Otherwise, just proxy the download
    const response = new NextResponse(downloadResponse.body, {
      status: downloadResponse.status,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${artifactInfo.name}.zip"`
      }
    });
    
    return response;
    
  } catch (error) {
    console.error('Error downloading artifact:', error);
    return NextResponse.json(
      { error: 'Failed to download artifact', details: error.message },
      { status: 500 }
    );
  }
}
