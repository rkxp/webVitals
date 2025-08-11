#!/bin/bash

# Local Lighthouse CI Test Script
# Tests your localhost:3000 development server

echo "🚀 Starting Local Lighthouse CI Test"
echo "📍 Testing: http://localhost:3000"
echo ""

# Check if local server is running
if ! curl -s --max-time 5 http://localhost:3000 > /dev/null; then
    echo "❌ Local server not accessible at http://localhost:3000"
    echo "💡 Make sure to run: npm run dev"
    exit 1
fi

echo "✅ Local server is accessible"
echo ""

# Clean previous results
if [ -d ".lighthouseci" ]; then
    rm -rf .lighthouseci
fi

# Run Lighthouse CI
echo "🏃 Running Lighthouse CI..."
LIGHTHOUSE_URLS="http://localhost:3000" npx lhci autorun --no-logs-collection

# Check results
if ls .lighthouseci/lhr-*.json 1> /dev/null 2>&1; then
    echo ""
    echo "📊 Results:"
    echo "───────────────────────────────────────"
    
    # Extract and display scores
    for file in .lighthouseci/lhr-*.json; do
        echo "🎯 Lighthouse Scores for $(cat "$file" | jq -r '.finalUrl'):"
        cat "$file" | jq -r '.categories | to_entries | map("  \(.key | ascii_upcase): \((.value.score * 100) | round)%") | .[]'
        echo ""
        
        echo "⚡ Core Web Vitals:"
        echo "  LCP: $(cat "$file" | jq -r '.audits["largest-contentful-paint"].displayValue // "N/A"')"
        echo "  FCP: $(cat "$file" | jq -r '.audits["first-contentful-paint"].displayValue // "N/A"')"
        echo "  CLS: $(cat "$file" | jq -r '.audits["cumulative-layout-shift"].displayValue // "N/A"')"
        echo "  TBT: $(cat "$file" | jq -r '.audits["total-blocking-time"].displayValue // "N/A"')"
        echo ""
    done
    
    echo "📁 Reports saved in .lighthouseci/ directory"
    echo "🌐 HTML report: $(ls .lighthouseci/*.html 2>/dev/null | head -1)"
else
    echo "❌ No Lighthouse reports generated"
fi
