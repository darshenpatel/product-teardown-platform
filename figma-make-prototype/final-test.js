const { chromium } = require('playwright');

async function finalTest() {
  console.log('🚀 Final UI Test with Cache Clear...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Clear cache and hard reload
  await context.clearCookies();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  
  // Test with text input
  console.log('🔤 Testing Text Input with Cache Clear...');
  await page.fill('input[placeholder*="Slack"]', 'Linear');
  
  // Check AI provider is selected
  await page.check('input[value="anthropic"]');
  
  await page.click('button:has-text("Generate Teardown")');
  
  // Wait for results with longer timeout
  await page.waitForSelector('text=Linear Teardown', { timeout: 90000 });
  await page.waitForTimeout(3000); // Give time for all content to load
  
  // Take screenshot
  await page.screenshot({ path: 'final-test-results.png', fullPage: true });
  
  // Check for specific good content
  const hasGoodOnboarding = await page.locator('text=Streamlined Setup Process').first().isVisible().catch(() => false);
  const hasGoodPricing = await page.locator('text=Freemium').first().isVisible().catch(() => false);
  const hasGoodCompetitive = await page.locator('text=Superior performance').first().isVisible().catch(() => false);
  
  console.log('✅ Results Check:');
  console.log('- Good onboarding content:', hasGoodOnboarding);
  console.log('- Good pricing content:', hasGoodPricing);
  console.log('- Good competitive content:', hasGoodCompetitive);
  
  // Count placeholder text
  const placeholderCount = await page.locator('text=Analysis content available').count();
  const fallbackCount = await page.locator('text=See pricing details').count();
  
  console.log('❌ Fallback Content Check:');
  console.log('- "Analysis content available" count:', placeholderCount);
  console.log('- "See pricing details" count:', fallbackCount);
  
  const overallQuality = hasGoodOnboarding && hasGoodPricing && hasGoodCompetitive && placeholderCount === 0;
  console.log('\n🎯 OVERALL QUALITY:', overallQuality ? '✅ EXCELLENT' : '❌ NEEDS WORK');
  
  await browser.close();
  console.log('🏁 Final test completed');
}

finalTest().catch(console.error);