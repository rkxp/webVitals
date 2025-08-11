// Test script to verify the dashboard data loading
console.log('🧪 Testing Dashboard Data Loading...\n');

async function testDashboard() {
  try {
    // Test GitHub reports API
    console.log('1. Testing GitHub Reports API...');
    const reportsResponse = await fetch('http://localhost:3000/api/github-lighthouse-reports');
    const reportsData = await reportsResponse.json();
    console.log(`   ✅ Found ${reportsData.reports?.length || 0} workflow runs`);
    console.log(`   📊 Total runs: ${reportsData.meta?.total_runs || 0}`);
    
    if (reportsData.reports?.length > 0) {
      const firstRun = reportsData.reports[0];
      console.log(`   🔍 Latest run: ${firstRun.commit_sha?.substring(0, 8)} - ${firstRun.commit_message?.split('\n')[0]}`);
      
      // Test extract API for first artifact
      const artifacts = firstRun.artifacts?.filter(a => a.name.includes('lighthouse-reports-'));
      if (artifacts?.length > 0) {
        console.log('\n2. Testing Extract API...');
        const extractResponse = await fetch(`http://localhost:3000/api/github-lighthouse-reports/extract/${artifacts[0].id}`);
        const extractData = await extractResponse.json();
        console.log(`   📋 Reports found: ${extractData.reports?.length || 0}`);
        console.log(`   📝 Metadata: ${extractData.metadata ? 'Available' : 'Missing'}`);
        console.log(`   💬 Message: ${extractData.message || 'None'}`);
        
        if (extractData.metadata) {
          console.log(`   🔗 URLs tested: ${extractData.metadata.urls_tested || 'None'}`);
          console.log(`   ❌ Exit code: ${extractData.metadata.lighthouse_exit_code || 'N/A'}`);
        }
      }
    }
    
    console.log('\n✅ Dashboard data loading test completed successfully!');
    console.log('\n📋 Expected UI behavior:');
    console.log('   - URLs from metadata should appear in dashboard');
    console.log('   - Skipped reports should show warning messages');
    console.log('   - Both tabs should have consistent max-width');
    console.log('   - Empty states should be centered and wide');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDashboard();

