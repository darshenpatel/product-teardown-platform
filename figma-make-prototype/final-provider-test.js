const { chromium } = require('playwright');

async function testBothProviders() {
  console.log('🚀 Testing Both AI Providers with Same Product...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Test OpenAI first
  console.log('\n🤖 Testing OpenAI Provider...');
  await page.fill('input[placeholder*="Slack"]', 'Ramp');
  await page.check('input[value="openai"]');
  await page.click('button:has-text("Generate Teardown")');
  
  await page.waitForSelector('text=Ramp Teardown', { timeout: 60000 });
  await page.waitForTimeout(2000);
  
  // Check for good content
  const openaiHasContent = await page.locator('text=Streamlined Signup Process').first().isVisible().catch(() => false);
  const openaiPlaceholders = await page.locator('text=Analysis content available').count();
  
  console.log('OpenAI Results:');
  console.log('- Has real content:', openaiHasContent);
  console.log('- Placeholder count:', openaiPlaceholders);
  
  // Take screenshot
  await page.screenshot({ path: 'openai-test-result.png', fullPage: true });
  
  // Test Anthropic
  console.log('\n🧠 Testing Anthropic Provider...');
  await page.click('button:has-text("New Analysis")');
  await page.waitForSelector('input[placeholder*="Slack"]');
  
  await page.fill('input[placeholder*="Slack"]', 'Ramp');
  await page.check('input[value="anthropic"]');
  await page.click('button:has-text("Generate Teardown")');
  
  await page.waitForSelector('text=Ramp Teardown', { timeout: 60000 });
  await page.waitForTimeout(2000);
  
  // Check for good content
  const anthropicHasContent = await page.locator('text=Streamlined Digital Setup').first().isVisible().catch(() => false);
  const anthropicPlaceholders = await page.locator('text=Analysis content available').count();
  
  console.log('Anthropic Results:');
  console.log('- Has real content:', anthropicHasContent);
  console.log('- Placeholder count:', anthropicPlaceholders);
  
  // Take screenshot
  await page.screenshot({ path: 'anthropic-test-result.png', fullPage: true });
  
  console.log('\n🎯 CONSISTENCY CHECK:');
  const bothWork = (openaiHasContent || openaiPlaceholders === 0) && (anthropicHasContent || anthropicPlaceholders === 0);
  console.log('Both providers working:', bothWork ? '✅ SUCCESS' : '❌ NEEDS MORE WORK');
  
  await browser.close();
}

testBothProviders().catch(console.error);