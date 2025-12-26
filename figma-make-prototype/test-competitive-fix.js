// Test the fixed competitive analysis function
const sampleCompetitiveText = `## 4. Competitive Differentiation

**Strengths**: 
- Superior user experience with modern, intuitive interface compared to legacy players like Concur
- Strong AI-powered automation that reduces manual work significantly
- Rapid product development cycle with frequent feature releases

**Weaknesses**:
- Limited international presence compared to established players like American Express
- Newer brand with less enterprise credibility than traditional corporate card providers
- Dependent on venture funding in a challenging market environment

**Opportunities**:
- Expanding into adjacent financial services (lending, treasury management)
- International market expansion, particularly in Europe and Asia
- Deeper integration with emerging fintech ecosystem and accounting platforms

**Threats**:
- Established players like Chase and AmEx investing heavily in digital transformation
- Economic downturn reducing corporate spending and new customer acquisition`;

function extractCompetitivePoints(text, category) {
  if (!text || text.trim() === '') return [`No ${category} analysis available`];
  
  // Split text into sections based on **SWOT Category**:
  const sections = text.split(/\*\*(Strengths|Weaknesses|Opportunities|Threats)\*\*\s*:?\s*/i);
  
  const categoryPoints = [];
  
  // Find the section for our category
  for (let i = 0; i < sections.length; i++) {
    if (sections[i] && sections[i].toLowerCase() === category.toLowerCase()) {
      // The next section contains our content
      const content = sections[i + 1];
      if (content) {
        // Extract bullet points from this section
        const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        for (const line of lines) {
          // Stop if we hit another **Section**
          if (line.match(/^\*\*(Strengths|Weaknesses|Opportunities|Threats)\*\*/i)) {
            break;
          }
          
          // Extract bullet points
          if (line.match(/^[\-\*\•]/)) {
            const cleaned = line.replace(/^[\-\*\•]\s*/, '').trim();
            if (cleaned.length > 10) {
              categoryPoints.push(cleaned);
            }
          }
        }
        break;
      }
    }
  }
  
  return categoryPoints.length > 0 ? categoryPoints.slice(0, 3) : [`${category} analysis available`];
}

console.log('🧪 Testing Fixed Competitive Analysis Function');
console.log('==============================================');

console.log('\n📊 STRENGTHS:');
const strengths = extractCompetitivePoints(sampleCompetitiveText, 'strengths');
strengths.forEach((s, i) => console.log(`${i+1}. ${s}`));

console.log('\n📊 WEAKNESSES:');
const weaknesses = extractCompetitivePoints(sampleCompetitiveText, 'weaknesses');
weaknesses.forEach((w, i) => console.log(`${i+1}. ${w}`));

console.log('\n📊 OPPORTUNITIES:');
const opportunities = extractCompetitivePoints(sampleCompetitiveText, 'opportunities');
opportunities.forEach((o, i) => console.log(`${i+1}. ${o}`));

console.log('\n📊 THREATS:');
const threats = extractCompetitivePoints(sampleCompetitiveText, 'threats');
threats.forEach((t, i) => console.log(`${i+1}. ${t}`));

console.log('\n✅ Function test completed!');

// Check for duplication
const allContent = [...strengths, ...weaknesses, ...opportunities, ...threats].join(' ');
const hasUniqueContent = new Set([...strengths, ...weaknesses, ...opportunities, ...threats]).size === 
                         [...strengths, ...weaknesses, ...opportunities, ...threats].length;

console.log('🔍 Duplication check:', hasUniqueContent ? 'PASSED ✅' : 'FAILED ❌');