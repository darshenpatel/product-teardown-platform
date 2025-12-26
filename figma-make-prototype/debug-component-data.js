const { chromium } = require('playwright');

async function debugComponentData() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen for console logs
  page.on('console', msg => {
    if (msg.text().includes('🔍 TeardownResults received data:')) {
      console.log('📊 COMPONENT DATA:', msg.text());
    }
  });
  
  await page.goto('http://localhost:3000');
  await page.fill('input[placeholder*="Slack"]', 'Linear');
  await page.click('button:has-text("Generate Teardown")');
  
  await page.waitForSelector('text=Analysis generated', { timeout: 60000 });
  
  // Give some time for console logs
  await page.waitForTimeout(2000);
  
  await browser.close();
}

debugComponentData().catch(console.error);