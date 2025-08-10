# GitHub Lighthouse Reports Integration

This dashboard can automatically sync Lighthouse reports from GitHub Actions, enabling team-wide performance monitoring.

## 🚀 Quick Setup

### 1. Generate GitHub Personal Access Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Give it a name like "WebVitals Lighthouse Dashboard"
4. Select the following scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `actions:read` (Read access to actions and artifacts)
5. Click **"Generate token"**
6. **Copy the token immediately** (you won't see it again)

### 2. Configure Environment Variables

Create a `.env.local` file in your project root:

```bash
# GitHub Integration
GITHUB_TOKEN=ghp_your_token_here
GITHUB_REPOSITORY_OWNER=rkxp
GITHUB_REPOSITORY_NAME=webVitals
```

### 3. Restart Your Development Server

```bash
npm run dev
```

## 🎯 How It Works

### For Team Collaboration:

1. **Developer pushes changes** → GitHub Actions detects changed pages
2. **Lighthouse CI runs** on affected URLs automatically  
3. **Reports uploaded** as GitHub Actions artifacts
4. **Dashboard syncs** and displays reports for the whole team

### Dashboard Features:

- **📊 Two tabs**: Local reports vs GitHub Actions reports
- **👥 Team visibility**: See reports from any team member's changes
- **🔄 One-click sync**: Download and view CI reports locally
- **⚡ Auto-detection**: Only tests pages affected by code changes
- **📈 History tracking**: View past performance trends

## 🔧 Usage

### Viewing GitHub Reports:

1. Open your dashboard: `http://localhost:3000`
2. Navigate to **"Lighthouse Reports"** section
3. Click **"GitHub Actions"** tab
4. See reports from team pushes/PRs
5. Click **Download button** to sync reports locally

### Manual Triggers:

```bash
# Trigger Lighthouse on specific URLs
curl -X POST http://localhost:3000/api/trigger-lighthouse \
  -H "Content-Type: application/json" \
  -d '{"urls": ["http://localhost:3000/", "http://localhost:3000/about"]}'
```

## 🛠 Troubleshooting

### "GitHub token not configured" Error:

- Ensure `.env.local` exists with valid `GITHUB_TOKEN`
- Restart your dev server after adding the token
- Verify token has `repo` and `actions:read` permissions

### No GitHub Reports Showing:

- Check that GitHub Actions workflow has run successfully
- Verify artifact uploads in GitHub Actions logs
- Ensure repository name/owner are correct in `.env.local`

### Reports Not Syncing:

- Check browser console for API errors
- Verify GitHub token permissions
- Ensure artifacts haven't expired (30-day retention)

## 🎊 Benefits

✅ **Team Performance Monitoring**: Everyone sees the same reports  
✅ **Automatic Change Detection**: Only tests what actually changed  
✅ **Zero Manual Work**: Reports appear automatically after pushes  
✅ **Historical Tracking**: Keep reports for trend analysis  
✅ **Unified Dashboard**: Web Vitals + Lighthouse in one place  

Your team now has enterprise-grade performance monitoring! 🚀
