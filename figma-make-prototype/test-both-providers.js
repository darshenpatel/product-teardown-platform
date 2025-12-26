// Test both AI providers with the same input
const fs = require('fs');

// Test extraction function directly with OpenAI format
function extractKeyPoints(text) {
  if (!text || text.trim() === '') return ['No analysis available'];
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const keyPoints = [];
  
  for (const line of lines) {
    // Skip section headers (## or ###)
    if (line.match(/^#{1,4}\s+/)) {
      continue;
    }
    
    // Look for key insights in bold format with or without numbers:
    // **Title**: Description OR 1. **Title**: Description
    if (line.match(/^\d*\.?\s*\*\*.*\*\*:/)) {
      // Clean the formatting and get the full content
      let cleaned = line.replace(/^\d*\.?\s*\*\*(.*?)\*\*:\s*/, '$1: ').trim();
      // Remove any remaining ** formatting
      cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
      if (cleaned.length > 20) {
        keyPoints.push(cleaned);
      }
    }
  }
  
  // Limit to 3 key points for readability
  return keyPoints.length > 0 ? keyPoints.slice(0, 3) : ['Analysis content available'];
}

const openaiSample = `### User Onboarding

1. **Streamlined Signup Process**: Ramp offers a user-friendly onboarding experience with a focus on simplicity and speed.

2. **Guided Product Tour**: Once registered, users are introduced to Ramp's features through an interactive product tour.

3. **Dedicated Customer Support**: Ramp provides robust customer support during the onboarding phase.`;

const anthropicSample = `## 1. User Onboarding

**Streamlined Setup Process**: Linear emphasizes getting users productive immediately with a clean, guided setup.

**Team-Centric Onboarding**: The platform prioritizes team setup and collaboration from day one.

**Progressive Feature Discovery**: Rather than front-loading all features, Linear introduces advanced capabilities.`;

console.log('🧪 Testing OpenAI Format:');
const openaiResult = extractKeyPoints(openaiSample);
console.log('Result:', openaiResult);

console.log('\n🧪 Testing Anthropic Format:');
const anthropicResult = extractKeyPoints(anthropicSample);
console.log('Result:', anthropicResult);

console.log('\n✅ Both formats should now work correctly!');