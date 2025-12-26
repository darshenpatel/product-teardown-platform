// Test the data transformation with real API data
const fs = require('fs');

// Read the actual API response
const apiResponse = JSON.parse(fs.readFileSync('/tmp/api_response.json', 'utf8'));

console.log('🔍 Testing Data Transformation');
console.log('=====================================');

const sections = apiResponse.data.analysis_data.sections;

console.log('\n📊 Raw Sections:');
Object.entries(sections).forEach(([key, value]) => {
  console.log(`${key}: ${value.length} chars`);
  console.log(`Preview: ${value.substring(0, 100)}...`);
  console.log('---');
});

// Test the extractKeyPoints function
function extractKeyPoints(text) {
  if (!text || text.trim() === '') return ['No analysis available'];
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const keyPoints = [];
  
  for (const line of lines) {
    // Skip section headers (## or ###) but NOT content headers (**text**)
    if (line.match(/^#{1,4}\s+/)) {
      continue;
    }
    
    // Look for key insights in bold format: **Title**: Description
    if (line.match(/^\*\*.*\*\*:/)) {
      const cleaned = line.replace(/^\*\*(.*?)\*\*:\s*/, '$1: ').trim();
      if (cleaned.length > 10) {
        keyPoints.push(cleaned);
      }
    }
    // Look for bullet points, numbered lists, or substantial sentences
    else if (line.match(/^[\d\-\*\•].+/) || (line.length > 20 && line.includes('.'))) {
      const cleaned = line.replace(/^[\d\-\*\•]\s*/, '').trim();
      if (cleaned.length > 10 && !cleaned.toLowerCase().includes('analysis not available')) {
        keyPoints.push(cleaned);
      }
    }
  }
  
  // If no structured points found, extract meaningful sentences
  if (keyPoints.length === 0) {
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
    keyPoints.push(...sentences.slice(0, 3));
  }
  
  return keyPoints.length > 0 ? keyPoints : ['Analysis content available'];
}

// Test extractCompetitivePoints function
function extractCompetitivePoints(text, category) {
  if (!text || text.trim() === '') return [`No ${category} analysis available`];
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const categoryPoints = [];
  let inTargetSection = false;
  
  // Look for the specific SWOT section
  const sectionHeaders = {
    strengths: /^\*\*strengths\*\*:/i,
    weaknesses: /^\*\*weaknesses\*\*:/i,
    opportunities: /^\*\*opportunities\*\*:/i,
    threats: /^\*\*threats\*\*:/i
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if we're entering our target section
    if (sectionHeaders[category].test(line)) {
      inTargetSection = true;
      continue;
    }
    
    // Check if we're entering a different SWOT section
    if (inTargetSection && Object.values(sectionHeaders).some(regex => regex.test(line))) {
      break;
    }
    
    // If we're in our target section, collect bullet points
    if (inTargetSection && line.match(/^[\-\*\•]/)) {
      const cleaned = line.replace(/^[\-\*\•]\s*/, '').trim();
      if (cleaned.length > 10) {
        categoryPoints.push(cleaned);
      }
    }
  }
  
  return categoryPoints.length > 0 ? categoryPoints.slice(0, 3) : [`${category} analysis available in full text`];
}

console.log('\n🧪 Testing Onboarding Extraction:');
const onboardingPoints = extractKeyPoints(sections.onboarding);
console.log('Extracted points:', onboardingPoints);

console.log('\n🧪 Testing Pricing Extraction:');
const pricingPoints = extractKeyPoints(sections.pricing);
console.log('Extracted points:', pricingPoints);

console.log('\n🧪 Testing Competitive Analysis:');
const strengths = extractCompetitivePoints(sections.competitive, 'strengths');
const weaknesses = extractCompetitivePoints(sections.competitive, 'weaknesses');
const opportunities = extractCompetitivePoints(sections.competitive, 'opportunities');
const threats = extractCompetitivePoints(sections.competitive, 'threats');

console.log('Strengths:', strengths);
console.log('Weaknesses:', weaknesses);
console.log('Opportunities:', opportunities);
console.log('Threats:', threats);

console.log('\n✅ Testing Complete');