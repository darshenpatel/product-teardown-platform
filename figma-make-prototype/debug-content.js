const { chromium } = require('playwright');

async function debugContent() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000');
  await page.fill('input[placeholder*="Slack"]', 'Linear');
  await page.click('button:has-text("Generate Teardown")');
  
  await page.waitForSelector('text=Analysis generated', { timeout: 60000 });
  
  // Extract the raw content to see what's being displayed
  const rawContent = await page.evaluate(() => {
    const cards = document.querySelectorAll('.space-y-6 > div');
    const sections = {};
    
    cards.forEach((card, index) => {
      const title = card.querySelector('h2, h3, h4')?.textContent || `Section ${index}`;
      const content = card.textContent;
      sections[title] = {
        length: content.length,
        preview: content.substring(0, 200) + '...'
      };
    });
    
    return sections;
  });
  
  console.log('📊 Raw content analysis:', JSON.stringify(rawContent, null, 2));
  
  // Check for specific issues
  const issues = await page.evaluate(() => {
    const problems = [];
    
    // Check for unformatted text blocks
    const longTextBlocks = document.querySelectorAll('p, div, span');
    longTextBlocks.forEach(block => {
      if (block.textContent.length > 500 && !block.textContent.includes('\n')) {
        problems.push('Long unformatted text block detected');
      }
    });
    
    // Check for missing structure
    const listItems = document.querySelectorAll('ul li, ol li');
    const bulletPoints = document.querySelectorAll('[class*="bullet"], [class*="list"]');
    
    if (listItems.length === 0 && bulletPoints.length === 0) {
      problems.push('No structured lists found');
    }
    
    // Check for empty sections
    const sections = document.querySelectorAll('[class*="space-y"]');
    sections.forEach((section, i) => {
      if (section.textContent.trim().length === 0) {
        problems.push(`Empty section ${i} detected`);
      }
    });
    
    return problems;
  });
  
  console.log('❌ UI Issues detected:', issues);
  
  await browser.close();
}

debugContent().catch(console.error);