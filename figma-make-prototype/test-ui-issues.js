const { chromium } = require('playwright');

async function testProductTeardownUI() {
  console.log('🚀 Starting Product Teardown UI Test...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the application
    console.log('📱 Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    console.log('📸 Taking initial screenshot');
    await page.screenshot({ path: 'initial-state.png', fullPage: true });
    
    // Test Text Input Method
    console.log('🔤 Testing Text Input Method');
    await page.fill('input[placeholder*="Slack"]', 'Linear');
    await page.click('button:has-text("Generate Teardown")');
    
    // Wait for loading to complete
    await page.waitForSelector('text=Analysis generated', { timeout: 60000 });
    
    // Take screenshot of results
    await page.screenshot({ path: 'text-input-results.png', fullPage: true });
    
    // Analyze the results content
    const onboardingContent = await page.textContent('[data-testid="onboarding-section"], .onboarding, :has-text("User Onboarding"):near(:has-text("steps"))').catch(() => null);
    const pricingContent = await page.textContent('[data-testid="pricing-section"], .pricing, :has-text("Pricing Strategy"):near(:has-text("model"))').catch(() => null);
    const competitiveContent = await page.textContent('[data-testid="competitive-section"], .competitive, :has-text("Competitive Analysis"):near(:has-text("Strengths"))').catch(() => null);
    
    console.log('📊 Content Analysis:');
    console.log('Onboarding content length:', onboardingContent?.length || 0);
    console.log('Pricing content length:', pricingContent?.length || 0);
    console.log('Competitive content length:', competitiveContent?.length || 0);
    
    // Check for empty or placeholder content
    const hasGenericContent = await page.evaluate(() => {
      const text = document.body.textContent;
      return text.includes('Analysis available') || 
             text.includes('No analysis available') || 
             text.includes('See analysis') ||
             text.includes('Analysis content available');
    });
    
    console.log('❌ Has generic placeholder content:', hasGenericContent);
    
    // New Analysis button to test URL method
    console.log('🔄 Starting new analysis for URL test');
    await page.click('button:has-text("New Analysis")');
    await page.waitForSelector('input[placeholder*="Slack"]');
    
    // Test URL Input Method
    console.log('🔗 Testing URL Input Method');
    await page.click('button:has-text("URL")');
    await page.fill('input[placeholder*="https://slack.com"]', 'linear.app');
    await page.click('button:has-text("Generate Teardown")');
    
    // Wait for loading to complete
    await page.waitForSelector('text=Analysis generated', { timeout: 60000 });
    
    // Take screenshot of URL results
    await page.screenshot({ path: 'url-input-results.png', fullPage: true });
    
    // Compare results
    const urlOnboardingContent = await page.textContent('[data-testid="onboarding-section"], .onboarding, :has-text("User Onboarding"):near(:has-text("steps"))').catch(() => null);
    const urlPricingContent = await page.textContent('[data-testid="pricing-section"], .pricing, :has-text("Pricing Strategy"):near(:has-text("model"))').catch(() => null);
    
    console.log('🔗 URL Method Content Analysis:');
    console.log('Onboarding content length:', urlOnboardingContent?.length || 0);
    console.log('Pricing content length:', urlPricingContent?.length || 0);
    
    // Check for consistency
    const isConsistent = onboardingContent === urlOnboardingContent && pricingContent === urlPricingContent;
    console.log('✅ Content consistency between methods:', isConsistent);
    
    if (!isConsistent) {
      console.log('❌ INCONSISTENCY DETECTED between text and URL input methods');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'error-state.png', fullPage: true });
  }
  
  await browser.close();
  console.log('🏁 Test completed');
}

testProductTeardownUI().catch(console.error);