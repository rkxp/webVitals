import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const per_page = parseInt(searchParams.get('per_page') || '10');
    
    // Validate parameters
    if (page < 1 || page > 100) {
      return NextResponse.json({
        error: 'Invalid page parameter',
        message: 'Page must be between 1 and 100'
      }, { status: 400 });
    }
    
    if (per_page < 1 || per_page > 100) {
      return NextResponse.json({
        error: 'Invalid per_page parameter',
        message: 'per_page must be between 1 and 100'
      }, { status: 400 });
    }
    
    // GitHub repository information
    const owner = process.env.GITHUB_REPOSITORY_OWNER || 'rkxp';
    const repo = process.env.GITHUB_REPOSITORY_NAME || 'webVitals';
    const token = process.env.GITHUB_TOKEN;
    
    if (!token) {
      return NextResponse.json({
        error: 'GitHub token not configured',
        message: 'Please set GITHUB_TOKEN environment variable to access workflow runs',
        help: 'Check GITHUB_INTEGRATION_SETUP.md for setup instructions'
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
      const errorBody = await workflowRunsResponse.text();
      
      if (workflowRunsResponse.status === 401) {
        return NextResponse.json({
          error: 'GitHub authentication failed',
          message: 'Invalid or expired GitHub token',
          help: 'Please check your GITHUB_TOKEN environment variable'
        }, { status: 401 });
      }
      
      if (workflowRunsResponse.status === 403) {
        return NextResponse.json({
          error: 'GitHub access forbidden',
          message: 'Token lacks required permissions for workflow access',
          help: 'Ensure token has "actions:read" permission'
        }, { status: 403 });
      }
      
      if (workflowRunsResponse.status === 404) {
        return NextResponse.json({
          error: 'Repository or workflow not found',
          message: `Repository ${owner}/${repo} or lighthouse.yml workflow not found`,
          help: 'Check repository name and workflow file exists'
        }, { status: 404 });
      }
      
      throw new Error(`GitHub API error: ${workflowRunsResponse.status} ${workflowRunsResponse.statusText} - ${errorBody}`);
    }
    
    const workflowRuns = await workflowRunsResponse.json();
    
    // Process each workflow run to get Lighthouse reports
    const reports = [];
    
    for (const run of workflowRuns.workflow_runs) {
      try {
        // Fetch commit details for this workflow run
        const commitResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/commits/${run.head_sha}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'WebVitals-Dashboard'
            }
          }
        );
        
        let commitData = null;
        if (commitResponse.ok) {
          commitData = await commitResponse.json();
        }
        
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
              commit_message: commitData?.commit?.message || 'No commit message available',
              commit_author: {
                name: commitData?.commit?.author?.name || run.actor.login,
                email: commitData?.commit?.author?.email || null,
                username: commitData?.author?.login || run.actor.login,
                avatar_url: commitData?.author?.avatar_url || run.actor.avatar_url
              },
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
        total_count: workflowRuns.total_count || 0,
        has_next: reports.length === per_page
      },
      repository: {
        owner,
        repo,
        workflow: 'lighthouse.yml'
      },
      meta: {
        timestamp: new Date().toISOString(),
        total_runs: workflowRuns.total_count || 0,
        runs_with_artifacts: reports.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching GitHub Lighthouse reports:', error);
    
    // Network/timeout errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return NextResponse.json({
        error: 'Network connection failed',
        message: 'Unable to connect to GitHub API',
        help: 'Check internet connection and GitHub API status'
      }, { status: 503 });
    }
    
    // Rate limiting
    if (error.message.includes('rate limit')) {
      return NextResponse.json({
        error: 'GitHub API rate limit exceeded',
        message: 'Too many requests to GitHub API',
        help: 'Please wait and try again later'
      }, { status: 429 });
    }
    
    return NextResponse.json({
      error: 'Failed to fetch GitHub Lighthouse reports',
      message: error.message || 'Unknown error occurred',
      help: 'Check server logs for more details'
    }, { status: 500 });
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
