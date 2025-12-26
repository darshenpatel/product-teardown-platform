const { chromium } = require('playwright');

async function ultimateFixTest() {
  console.log('🚀 ULTIMATE FIX TEST - Testing All Issues...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Test with Ramp using Anthropic (known to work)
  console.log('\n🧠 Testing Anthropic Provider...');
  await page.fill('input[placeholder*="Slack"]', 'Ramp');
  await page.check('input[value="anthropic"]');
  await page.click('button:has-text("Generate Teardown")');
  
  await page.waitForSelector('text=Ramp Teardown', { timeout: 90000 });
  await page.waitForTimeout(3000);
  
  // Check for SWOT content diversity - use more specific selectors
  const strengthsText = await page.locator('h4:has-text("Strengths")').locator('..').textContent();
  const weaknessesText = await page.locator('h4:has-text("Weaknesses")').locator('..').textContent();
  const opportunitiesText = await page.locator('h4:has-text("Opportunities")').locator('..').textContent();
  const threatsText = await page.locator('h4:has-text("Threats")').locator('..').textContent();
  
  console.log('🔍 SWOT Content Analysis:');
  console.log('Strengths preview:', strengthsText?.substring(0, 100) + '...');
  console.log('Weaknesses preview:', weaknessesText?.substring(0, 100) + '...');
  console.log('Opportunities preview:', opportunitiesText?.substring(0, 100) + '...');
  console.log('Threats preview:', threatsText?.substring(0, 100) + '...');
  
  // Check for content duplication
  const isDuplicated = (
    strengthsText === weaknessesText ||
    strengthsText === opportunitiesText ||
    weaknessesText === threatsText
  );
  
  console.log('❌ Content duplication detected:', isDuplicated);
  
  // Check for fallback text
  const fallbackCount = await page.locator('text=analysis available in full text').count();
  const placeholderCount = await page.locator('text=Analysis content available').count();
  
  console.log('📊 Quality Metrics:');
  console.log('- Fallback content count:', fallbackCount);
  console.log('- Placeholder content count:', placeholderCount);
  
  // Check for specific good content
  const hasDetailedContent = await page.locator('text=AI-powered').isVisible().catch(() => false) ||
                             await page.locator('text=Limited international').isVisible().catch(() => false) ||
                             await page.locator('text=International expansion').isVisible().catch(() => false) ||
                             await page.locator('text=automation reduces').isVisible().catch(() => false);
  
  console.log('- Has detailed content:', hasDetailedContent);
  
  // Take screenshot
  await page.screenshot({ path: 'ultimate-fix-test.png', fullPage: true });
  
  // Overall assessment
  const isFixed = !isDuplicated && fallbackCount === 0 && placeholderCount === 0 && hasDetailedContent;
  console.log('\n🎯 OVERALL ASSESSMENT:', isFixed ? '✅ COMPLETELY FIXED' : '❌ STILL HAS ISSUES');
  
  if (!isFixed) {
    console.log('\n🔧 Issues remaining:');
    if (isDuplicated) console.log('- Content duplication still exists');
    if (fallbackCount > 0) console.log('- Fallback text still showing');
    if (placeholderCount > 0) console.log('- Placeholder text still showing');
    if (!hasDetailedContent) console.log('- Not enough detailed content');
  }
  
  await browser.close();
  console.log('\n🏁 Ultimate fix test completed');
}

ultimateFixTest().catch(console.error);