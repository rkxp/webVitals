import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const per_page = parseInt(searchParams.get('per_page') || '10');
    
    // GitHub repository information
    const owner = process.env.GITHUB_REPOSITORY_OWNER || 'rkxp';
    const repo = process.env.GITHUB_REPOSITORY_NAME || 'webVitals';
    const token = process.env.GITHUB_TOKEN;
    
    if (!token) {
      return NextResponse.json({
        error: 'GitHub token not configured',
        message: 'Please set GITHUB_TOKEN environment variable to access workflow runs'
      }, { status: 401 });
    }
    
    // Fetch recent workflow runs for Lighthouse CI
    const workflowRunsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs?` +
      `workflow_file_name=lighthouse.yml&page=${page}&per_page=${per_page}&status=completed`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'WebVitals-Dashboard'
        }
      }
    );
    
    if (!workflowRunsResponse.ok) {
      throw new Error(`GitHub API error: ${workflowRunsResponse.status} ${workflowRunsResponse.statusText}`);
    }
    
    const workflowRuns = await workflowRunsResponse.json();
    
    // Process each workflow run to get Lighthouse reports
    const reports = [];
    
    for (const run of workflowRuns.workflow_runs) {
      try {
        // Fetch artifacts for this workflow run
        const artifactsResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/actions/runs/${run.id}/artifacts`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'WebVitals-Dashboard'
            }
          }
        );
        
        if (artifactsResponse.ok) {
          const artifacts = await artifactsResponse.json();
          
          // Find Lighthouse report artifacts
          const lighthouseArtifacts = artifacts.artifacts.filter(artifact => 
            artifact.name.includes('lighthouse-reports-') || 
            artifact.name.includes('lighthouse-summary-')
          );
          
          if (lighthouseArtifacts.length > 0) {
            const report = {
              run_id: run.id,
              workflow_run_number: run.run_number,
              commit_sha: run.head_sha,
              branch: run.head_branch,
              event: run.event,
              status: run.status,
              conclusion: run.conclusion,
              created_at: run.created_at,
              updated_at: run.updated_at,
              triggered_by: run.actor.login,
              pr_number: run.pull_requests[0]?.number || null,
              artifacts: lighthouseArtifacts.map(artifact => ({
                id: artifact.id,
                name: artifact.name,
                size_in_bytes: artifact.size_in_bytes,
                download_url: `/api/github-lighthouse-reports/download/${artifact.id}`,
                extract_url: `/api/github-lighthouse-reports/extract/${artifact.id}`,
                created_at: artifact.created_at,
                expired: artifact.expired
              }))
            };
            
            reports.push(report);
          }
        }
      } catch (error) {
        console.error(`Error processing workflow run ${run.id}:`, error);
        // Continue processing other runs
      }
    }
    
    return NextResponse.json({
      reports,
      pagination: {
        page,
        per_page,
        total_count: workflowRuns.total_count,
        has_next: reports.length === per_page
      },
      repository: {
        owner,
        repo,
        workflow: 'lighthouse.yml'
      }
    });
    
  } catch (error) {
    console.error('Error fetching GitHub Lighthouse reports:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch GitHub Lighthouse reports',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { artifact_id, workflow_run_id } = body;
    
    if (!artifact_id) {
      return NextResponse.json(
        { error: 'artifact_id is required' },
        { status: 400 }
      );
    }
    
    // This endpoint will trigger downloading and syncing of a specific artifact
    // to the local dashboard storage
    
    const owner = process.env.GITHUB_REPOSITORY_OWNER || 'rkxp';
    const repo = process.env.GITHUB_REPOSITORY_NAME || 'webVitals';
    const token = process.env.GITHUB_TOKEN;
    
    if (!token) {
      return NextResponse.json(
        { error: 'GitHub token not configured' },
        { status: 401 }
      );
    }
    
    // Download and sync the artifact
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
      throw new Error(`Failed to download artifact: ${downloadResponse.status}`);
    }
    
    // Here you would extract and process the zip file
    // For now, return success message
    return NextResponse.json({
      success: true,
      message: `Artifact ${artifact_id} queued for sync`,
      artifact_id,
      workflow_run_id
    });
    
  } catch (error) {
    console.error('Error syncing GitHub artifact:', error);
    return NextResponse.json(
      { error: 'Failed to sync artifact', details: error.message },
      { status: 500 }
    );
  }
}
