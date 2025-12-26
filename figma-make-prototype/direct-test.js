// Direct test of the actual transformation pipeline
const fs = require('fs');

// Real API response
const apiData = JSON.parse(fs.readFileSync('/tmp/api_response.json', 'utf8'));
console.log('API Data Structure:');
console.log('- product_name:', apiData.data.product_name);
console.log('- sections keys:', Object.keys(apiData.data.analysis_data.sections));

// Test the actual transformation (simulate what happens in the frontend)
function testTransformation() {
  const { data } = apiData;
  const { analysis_data, product_name, product_url, created_at } = data;
  const sections = analysis_data.sections;

  console.log('\n🔍 Sections content preview:');
  console.log('onboarding:', sections.onboarding.substring(0, 200) + '...');
  console.log('pricing:', sections.pricing.substring(0, 200) + '...');
  console.log('valueProps:', sections.valueProps.substring(0, 200) + '...');
  console.log('competitive:', sections.competitive.substring(0, 200) + '...');

  // Test extractKeyPoints function exactly as written
  function extractKeyPoints(text) {
    console.log('\n🧪 extractKeyPoints called with text length:', text.length);
    console.log('First 100 chars:', text.substring(0, 100));
    
    if (!text || text.trim() === '' || text === 'Analysis not available for this section.') {
      console.log('❌ Returning fallback: No analysis available');
      return ['No analysis available'];
    }
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    console.log('📝 Lines found:', lines.length);
    
    const keyPoints = [];
    
    for (const line of lines) {
      console.log('  Checking line:', line.substring(0, 50) + '...');
      
      // Skip section headers (## or ###)
      if (line.match(/^#{1,4}\s+/)) {
        console.log('  ⏭️ Skipping header');
        continue;
      }
      
      // Look for key insights in bold format: **Title**: Description
      if (line.match(/^\*\*.*\*\*:/)) {
        console.log('  ✅ Found bold key insight');
        let cleaned = line.replace(/^\*\*(.*?)\*\*:\s*/, '$1: ').trim();
        cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
        if (cleaned.length > 20) {
          keyPoints.push(cleaned);
          console.log('  ➕ Added:', cleaned.substring(0, 80) + '...');
        }
      }
    }
    
    console.log('🎯 Key points found:', keyPoints.length);
    return keyPoints.length > 0 ? keyPoints.slice(0, 3) : ['Analysis content available'];
  }

  // Test onboarding extraction
  console.log('\n=== TESTING ONBOARDING EXTRACTION ===');
  const onboardingSteps = extractKeyPoints(sections.onboarding);
  console.log('Final result:', onboardingSteps);
}

testTransformation();