#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log with colors
log() {
    echo -e "${BLUE}[LIGHTHOUSE CI]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[LIGHTHOUSE CI]${NC} $1"
}

error() {
    echo -e "${RED}[LIGHTHOUSE CI]${NC} $1"
}

success() {
    echo -e "${GREEN}[LIGHTHOUSE CI]${NC} $1"
}

# Configuration
BASE_BRANCH="${1:-main}"
DYNAMIC_ROUTES_MAP="dynamic-routes-map.json"
BASE_URL="${LIGHTHOUSE_BASE_URL:-http://localhost:3000}"

log "Starting changed pages detection..."
log "Base branch: $BASE_BRANCH"
log "Base URL: $BASE_URL"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    error "Not in a git repository"
    exit 1
fi

# Ensure we have the base branch
if ! git show-ref --verify --quiet refs/heads/$BASE_BRANCH; then
    warn "Base branch $BASE_BRANCH not found locally, fetching..."
    git fetch origin $BASE_BRANCH:$BASE_BRANCH || {
        error "Failed to fetch base branch $BASE_BRANCH"
        exit 1
    }
fi

# Get changed files
log "Detecting changed files between current branch and $BASE_BRANCH..."
CHANGED_FILES=$(git diff --name-only $BASE_BRANCH...HEAD 2>/dev/null || git diff --name-only $BASE_BRANCH)

if [ -z "$CHANGED_FILES" ]; then
    warn "No changed files detected"
    echo ""
    exit 0
fi

log "Changed files:"
echo "$CHANGED_FILES" | sed 's/^/  - /'

# Filter for page-related files
PAGE_RELATED_FILES=$(echo "$CHANGED_FILES" | grep -E '^(src/)?(pages|app|components)/' || true)

if [ -z "$PAGE_RELATED_FILES" ]; then
    warn "No page-related files changed (pages/, app/, components/)"
    echo ""
    exit 0
fi

log "Page-related changed files:"
echo "$PAGE_RELATED_FILES" | sed 's/^/  - /'

# Build the app to generate manifests
log "Building Next.js app to generate route manifests..."
if ! npm run build > /dev/null 2>&1; then
    warn "Build failed, falling back to basic route detection"
    # Fallback: just return the root page
    echo "$BASE_URL"
    exit 0
fi

# Initialize URL list
URLS=()

# Function to add URL if not already present
add_url() {
    local url="$1"
    if [[ ! " ${URLS[@]} " =~ " ${url} " ]]; then
        URLS+=("$url")
    fi
}

# Function to replace dynamic route placeholders
replace_dynamic_routes() {
    local route="$1"
    
    # Check if dynamic routes map exists
    if [ ! -f "$DYNAMIC_ROUTES_MAP" ]; then
        warn "Dynamic routes map not found at $DYNAMIC_ROUTES_MAP"
        echo "$route"
        return
    fi
    
    # Check if this route has dynamic segments
    if [[ $route == *"["* ]]; then
        # Extract the route pattern (remove query params and fragments)
        local route_pattern=$(echo "$route" | sed 's/[?#].*//')
        
        # Try to find mapping in dynamic-routes-map.json
        local mapped_routes
        if command -v jq >/dev/null 2>&1; then
            mapped_routes=$(jq -r ".routes[\"$route_pattern\"][]?" "$DYNAMIC_ROUTES_MAP" 2>/dev/null || echo "")
        else
            # Fallback without jq - basic pattern matching
            mapped_routes=$(grep -A 10 "\"$route_pattern\"" "$DYNAMIC_ROUTES_MAP" 2>/dev/null | grep -o '"/[^"]*"' | tr -d '"' || echo "")
        fi
        
        if [ -n "$mapped_routes" ]; then
            echo "$mapped_routes"
        else
            # Fallback: replace common dynamic patterns
            route=$(echo "$route" | sed 's/\[id\]/123/g')
            route=$(echo "$route" | sed 's/\[slug\]/example-slug/g')
            route=$(echo "$route" | sed 's/\[userId\]/demo-user/g')
            route=$(echo "$route" | sed 's/\[\.\.\.[^]]*\]/example/g')
            echo "$route"
        fi
    else
        echo "$route"
    fi
}

# Process different Next.js structures
log "Processing route manifests..."

# Check for App Router (Next.js 13+)
if [ -d ".next/server" ]; then
    # Look for app-paths-manifest.json (App Router)
    if [ -f ".next/server/app-paths-manifest.json" ]; then
        log "Found App Router manifest"
        if command -v jq >/dev/null 2>&1; then
            APP_ROUTES=$(jq -r 'keys[]' .next/server/app-paths-manifest.json 2>/dev/null || echo "")
        else
            APP_ROUTES=$(grep -o '"/[^"]*"' .next/server/app-paths-manifest.json | tr -d '"' || echo "")
        fi
        
        if [ -n "$APP_ROUTES" ]; then
            while IFS= read -r route; do
                # Filter out internal Next.js routes and API routes
                if [ -n "$route" ] && [[ "$route" != "/api"* ]] && [[ "$route" != "/_"* ]] && [[ "$route" != *"/route" ]] && [[ "$route" != *"/favicon.ico"* ]]; then
                    # Convert /page to / (root route)
                    if [ "$route" = "/page" ]; then
                        route="/"
                    fi
                    
                    # Replace dynamic routes
                    replaced_routes=$(replace_dynamic_routes "$route")
                    while IFS= read -r final_route; do
                        if [ -n "$final_route" ]; then
                            add_url "$BASE_URL$final_route"
                        fi
                    done <<< "$replaced_routes"
                fi
            done <<< "$APP_ROUTES"
        fi
    fi
    
    # Look for pages-manifest.json (Pages Router)
    if [ -f ".next/server/pages-manifest.json" ]; then
        log "Found Pages Router manifest"
        if command -v jq >/dev/null 2>&1; then
            PAGE_ROUTES=$(jq -r 'keys[]' .next/server/pages-manifest.json 2>/dev/null || echo "")
        else
            PAGE_ROUTES=$(grep -o '"/[^"]*"' .next/server/pages-manifest.json | tr -d '"' || echo "")
        fi
        
        if [ -n "$PAGE_ROUTES" ]; then
            while IFS= read -r route; do
                # Filter out internal Next.js routes, API routes, and error pages
                if [ -n "$route" ] && [[ "$route" != "/api/"* ]] && [[ "$route" != "/_"* ]] && [[ "$route" != "/404" ]] && [[ "$route" != "/500" ]]; then
                    # Replace dynamic routes
                    replaced_routes=$(replace_dynamic_routes "$route")
                    while IFS= read -r final_route; do
                        if [ -n "$final_route" ]; then
                            add_url "$BASE_URL$final_route"
                        fi
                    done <<< "$replaced_routes"
                fi
            done <<< "$PAGE_ROUTES"
        fi
    fi
fi

# Fallback: Basic file-based routing
if [ ${#URLS[@]} -eq 0 ]; then
    log "No manifests found, using file-based detection..."
    
    # Always include the home page
    add_url "$BASE_URL"
    
    # Process changed files to infer routes
    while IFS= read -r file; do
        if [ -z "$file" ]; then continue; fi
        
        # Skip non-page files
        if [[ $file == *".test."* ]] || [[ $file == *".spec."* ]] || [[ $file == *"/_"* ]]; then
            continue
        fi
        
        # Convert file paths to routes
        route=""
        
        # Handle App Router structure (src/app/*)
        if [[ $file == src/app/* ]]; then
            route=$(echo "$file" | sed 's|^src/app||' | sed 's|/page\.[jt]sx\?$||' | sed 's|/layout\.[jt]sx\?$||')
            
        # Handle Pages Router structure (src/pages/*)
        elif [[ $file == src/pages/* ]]; then
            route=$(echo "$file" | sed 's|^src/pages||' | sed 's|\.[jt]sx\?$||' | sed 's|/index$||')
            
        # Handle App Router without src (app/*)
        elif [[ $file == app/* ]]; then
            route=$(echo "$file" | sed 's|^app||' | sed 's|/page\.[jt]sx\?$||' | sed 's|/layout\.[jt]sx\?$||')
            
        # Handle Pages Router without src (pages/*)
        elif [[ $file == pages/* ]]; then
            route=$(echo "$file" | sed 's|^pages||' | sed 's|\.[jt]sx\?$||' | sed 's|/index$||')
            
        # Handle component changes - include root page
        elif [[ $file == *components/* ]]; then
            route="/"
        fi
        
        # Skip API routes and empty routes
        if [[ $route == /api* ]] || [ -z "$route" ]; then
            continue
        fi
        
        # Ensure route starts with /
        if [[ $route != /* ]]; then
            route="/$route"
        fi
        
        # Replace dynamic routes
        replaced_routes=$(replace_dynamic_routes "$route")
        while IFS= read -r final_route; do
            if [ -n "$final_route" ]; then
                add_url "$BASE_URL$final_route"
            fi
        done <<< "$replaced_routes"
        
    done <<< "$PAGE_RELATED_FILES"
fi

# Remove duplicates and sort
UNIQUE_URLS=($(printf '%s\n' "${URLS[@]}" | sort -u))

if [ ${#UNIQUE_URLS[@]} -eq 0 ]; then
    warn "No URLs detected, including home page as fallback"
    UNIQUE_URLS=("$BASE_URL")
fi

success "Detected ${#UNIQUE_URLS[@]} unique URL(s) to test:"
printf '%s\n' "${UNIQUE_URLS[@]}" | sed 's/^/  - /'

# Output space-separated URLs for GitHub Actions
printf '%s' "${UNIQUE_URLS[*]}"
