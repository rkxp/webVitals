#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log with colors (to stderr to avoid interfering with URL output)
log() {
    echo -e "${BLUE}[LIGHTHOUSE CI]${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[LIGHTHOUSE CI]${NC} $1" >&2
}

error() {
    echo -e "${RED}[LIGHTHOUSE CI]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[LIGHTHOUSE CI]${NC} $1" >&2
}

# Function to add URL if not already present
add_url() {
    local url="$1"
    if [[ ! " ${URLS[@]} " =~ " ${url} " ]]; then
        URLS+=("$url")
    fi
}

# Function to get routes from component mappings
get_routes_from_component() {
    local component_file="$1"
    local routes=""
    
    # Check if component routes map exists
    if [ ! -f "$COMPONENT_ROUTES_MAP" ]; then
        warn "Component routes map not found at $COMPONENT_ROUTES_MAP"
        return
    fi
    
    # Try to find routes for this component
    if command -v jq >/dev/null 2>&1; then
        # Get routes for the specific component
        routes=$(jq -r ".mappings[\"$component_file\"][]?" "$COMPONENT_ROUTES_MAP" 2>/dev/null || echo "")
        
        # If no specific mapping, check if it's a global component
        if [ -z "$routes" ]; then
            local is_global=$(jq -r ".globalComponents.components[] | select(. == \"$component_file\")" "$COMPONENT_ROUTES_MAP" 2>/dev/null || echo "")
            if [ -n "$is_global" ]; then
                log "Component $component_file is global, affecting all pages"
                # For global components, return the root route
                routes="/"
            fi
        fi
    else
        # Fallback without jq - basic pattern matching
        routes=$(grep -A 5 "\"$component_file\"" "$COMPONENT_ROUTES_MAP" 2>/dev/null | grep -o '"/[^"]*"' | tr -d '"' || echo "")
        
        # Check if it's in global components (simplified)
        if [ -z "$routes" ] && grep -q "\"$component_file\"" "$COMPONENT_ROUTES_MAP" 2>/dev/null; then
            routes="/"
        fi
    fi
    
    if [ -n "$routes" ]; then
        echo "$routes"
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

# Configuration
BASE_BRANCH="${1:-main}"
DYNAMIC_ROUTES_MAP="dynamic-routes-map.json"
COMPONENT_ROUTES_MAP="component-routes-map.json"
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

# Check if we're on the same branch as the base branch (e.g., main comparing to main)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" = "$BASE_BRANCH" ]; then
    log "Currently on $BASE_BRANCH branch, comparing against previous commit..."
    # Compare against the previous commit (HEAD~1)
    CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "")
else
    # Compare against the base branch
    CHANGED_FILES=$(git diff --name-only $BASE_BRANCH...HEAD 2>/dev/null || git diff --name-only $BASE_BRANCH)
fi

if [ -z "$CHANGED_FILES" ]; then
    warn "No changed files detected"
    echo "" >&2
    exit 0
fi

log "Changed files:"
echo "$CHANGED_FILES" | sed 's/^/  - /' >&2

# Filter for page-related files
PAGE_RELATED_FILES=$(echo "$CHANGED_FILES" | grep -E '^(src/)?(pages|app|components)/' || true)

# Also check for workflow/script changes that should trigger a test
WORKFLOW_FILES=$(echo "$CHANGED_FILES" | grep -E '^(\.github/workflows/|scripts/|.*lighthouse|.*routes-map)' || true)

if [ -z "$PAGE_RELATED_FILES" ] && [ -z "$WORKFLOW_FILES" ]; then
    warn "No page-related or workflow files changed"
    echo "" >&2
    exit 0
fi

if [ -z "$PAGE_RELATED_FILES" ] && [ -n "$WORKFLOW_FILES" ]; then
    log "Workflow/script files changed, testing homepage as fallback"
    PAGE_RELATED_FILES=""  # Will trigger homepage testing
fi

log "Page-related changed files:"
echo "$PAGE_RELATED_FILES" | sed 's/^/  - /' >&2

# Process component files immediately to get their routes
log "Processing component files for route mapping..."
while IFS= read -r file; do
    if [ -z "$file" ]; then continue; fi
    
    # Handle component, lib, and context files
    if [[ $file == *components/* ]] || [[ $file == *lib/* ]] || [[ $file == *context/* ]] || [[ $file == *globals.css ]]; then
        log "Processing component/lib file: $file"
        component_routes=$(get_routes_from_component "$file")
        if [ -n "$component_routes" ]; then
            while IFS= read -r component_route; do
                if [ -n "$component_route" ]; then
                    log "Component $file affects route: $component_route"
                    # Replace dynamic routes for component-mapped routes
                    replaced_routes=$(replace_dynamic_routes "$component_route")
                    while IFS= read -r final_route; do
                        if [ -n "$final_route" ]; then
                            add_url "$BASE_URL$final_route"
                        fi
                    done <<< "$replaced_routes"
                fi
            done <<< "$component_routes"
        else
            warn "No route mapping found for component: $file (defaulting to root)"
            add_url "$BASE_URL/"
        fi
    fi
done <<< "$PAGE_RELATED_FILES"

# Build the app to generate manifests (unless skipped)
if [ "$SKIP_BUILD" = "1" ]; then
    warn "Skipping build step (SKIP_BUILD=1), using component mappings only"
    # We already processed components above, so if we have URLs, use them
    if [ ${#URLS[@]} -gt 0 ]; then
        log "Using URLs from component mappings"
    else
        log "No component mappings found, defaulting to homepage"
        add_url "$BASE_URL"
    fi
else
    log "Building Next.js app to generate route manifests..."
    if ! npm run build > /dev/null 2>&1; then
        warn "Build failed, falling back to component mappings"
        # If we have URLs from components, use them; otherwise default to homepage
        if [ ${#URLS[@]} -eq 0 ]; then
            add_url "$BASE_URL"
        fi
    else
        log "Build successful, processing manifests..."
        # Continue with manifest processing (existing code below)
    fi
fi

# Only continue with manifest processing if build was successful and not skipped
if [ "$SKIP_BUILD" != "1" ] && [ -d ".next/server" ]; then
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
            
        # Handle component changes - use component-to-route mapping
        elif [[ $file == *components/* ]] || [[ $file == *lib/* ]] || [[ $file == *context/* ]]; then
            log "Processing component/lib file: $file"
            component_routes=$(get_routes_from_component "$file")
            if [ -n "$component_routes" ]; then
                while IFS= read -r component_route; do
                    if [ -n "$component_route" ]; then
                        log "Component $file affects route: $component_route"
                        # Replace dynamic routes for component-mapped routes
                        replaced_routes=$(replace_dynamic_routes "$component_route")
                        while IFS= read -r final_route; do
                            if [ -n "$final_route" ]; then
                                add_url "$BASE_URL$final_route"
                            fi
                        done <<< "$replaced_routes"
                    fi
                done <<< "$component_routes"
            else
                warn "No route mapping found for component: $file (defaulting to root)"
                add_url "$BASE_URL/"
            fi
            continue
        fi
        
        # Skip API routes and empty routes
        if [[ $route == /api* ]] || [ -z "$route" ]; then
            continue
        fi
        
        # Ensure route starts with /
        if [[ $route != /* ]]; then
            route="/$route"
        fi
        
        # Replace dynamic routes for page files
        replaced_routes=$(replace_dynamic_routes "$route")
        while IFS= read -r final_route; do
            if [ -n "$final_route" ]; then
                add_url "$BASE_URL$final_route"
            fi
        done <<< "$replaced_routes"
        
    done <<< "$PAGE_RELATED_FILES"
fi

fi  # End of manifest processing conditional

# Remove duplicates and sort
UNIQUE_URLS=($(printf '%s\n' "${URLS[@]}" | sort -u))

if [ ${#UNIQUE_URLS[@]} -eq 0 ]; then
    warn "No URLs detected, including home page as fallback"
    UNIQUE_URLS=("$BASE_URL")
fi

success "Detected ${#UNIQUE_URLS[@]} unique URL(s) to test:"
printf '%s\n' "${UNIQUE_URLS[@]}" | sed 's/^/  - /' >&2

# Output space-separated URLs for GitHub Actions (to stdout)
printf '%s' "${UNIQUE_URLS[*]}"
