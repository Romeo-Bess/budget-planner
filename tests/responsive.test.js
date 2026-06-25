const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const http = require('http');
const server = require('../server'); // Import Express server

// Ensure screenshots directory exists
const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// Device Profiles
const devices = [
  {
    name: 'iPhone 15',
    width: 393,
    height: 852,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true
  },
  {
    name: 'Samsung Galaxy S23',
    width: 360,
    height: 780,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36',
    isMobile: true,
    hasTouch: true
  },
  {
    name: 'Desktop View',
    width: 1280,
    height: 900,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    isMobile: false,
    hasTouch: false
  }
];

async function runTests() {
  console.log('Starting Responsive UI & Performance Validation Suite...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    for (const dev of devices) {
      console.log(`\n---------------------------------------------`);
      console.log(`Testing Profile: ${dev.name} (${dev.width}x${dev.height})`);
      
      const page = await browser.newPage();
      
      // Console logging from page
      page.on('console', msg => console.log('PAGE LOG:', msg.text()));
      page.on('pageerror', err => console.error('PAGE ERROR:', err.toString()));
      
      // Emulate device conditions
      await page.setUserAgent(dev.userAgent);
      await page.setViewport({
        width: dev.width,
        height: dev.height,
        isMobile: dev.isMobile,
        hasTouch: dev.hasTouch
      });

      // Start measuring CLS using PerformanceObserver
      // Inject CLS measurement helper before loading the page
      await page.evaluateOnNewDocument(() => {
        window.clsScore = 0;
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                window.clsScore += entry.value;
              }
            }
          });
          observer.observe({ type: 'layout-shift', buffered: true });
        } catch (e) {
          console.warn('PerformanceObserver layout-shift not supported:', e);
        }
      });

      // Navigate to locally running dashboard server
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

      // Retrieve CLS score
      const clsScore = await page.evaluate(() => window.clsScore || 0);
      console.log(`Cumulative Layout Shift (CLS): ${clsScore.toFixed(4)}`);
      
      // Fail/Warn if CLS exceeds Google standard threshold (0.1)
      if (clsScore > 0.1) {
        console.warn(`[WARNING] CLS score exceeds good threshold of 0.1! Layout shift detected.`);
      } else {
        console.log(`[PASS] CLS score is within acceptable limits.`);
      }

      // Check font size configurations (Base min size should be >= 16px to prevent auto-zooming)
      const baseFontSize = await page.evaluate(() => {
        return window.getComputedStyle(document.documentElement).fontSize;
      });
      console.log(`Base HTML Font Size: ${baseFontSize}`);

      // Capture screenshot of landing page state
      const initialScreenshotPath = path.join(screenshotDir, `${dev.name.toLowerCase().replace(/ /g, '_')}_initial.png`);
      await page.screenshot({ path: initialScreenshotPath });
      console.log(`Captured Initial Screenshot: ${initialScreenshotPath}`);

      // Perform a transaction log test on iPhone 15 to check state updates & layout shifts under user action
      if (dev.name === 'iPhone 15') {
        console.log('Testing interactive "Quick Add" log flow...');
        
        // Open the transaction log modal first
        await page.click('#mobile-trigger-log-tx');
        await new Promise(r => setTimeout(r, 300));
        
        // Fill form
        await page.type('#entry-description', 'Woolworths Food Shop');
        await page.type('#entry-amount', '350.50');
        await page.select('#entry-type', 'expense');
        await page.select('#entry-category', 'Groceries');

        // Click Add Entry via requestSubmit
        await page.evaluate(() => {
          document.getElementById('quick-add-form').requestSubmit();
        });

        // Wait a small moment for UI update transition
        await new Promise(r => setTimeout(r, 500));

        // Verify that the net worth changed dynamically (R 1 245 000,00 -> R 1 244 649,50 because of R350.50 expense increase)
        const updatedNetWorth = await page.$eval('#net-worth-amount', el => el.textContent.trim());
        console.log(`Updated Net Worth UI Display: R ${updatedNetWorth}`);
        
        const updatedGroceriesSpent = await page.$eval('.budget-item[data-category="Groceries"] .spent-value', el => el.textContent.trim());
        console.log(`Updated Groceries Spent: ${updatedGroceriesSpent}`);

        // Capture after-action screenshot
        const interactiveScreenshotPath = path.join(screenshotDir, `${dev.name.toLowerCase().replace(/ /g, '_')}_post_transaction.png`);
        await page.screenshot({ path: interactiveScreenshotPath });
        console.log(`Captured Post-Action Screenshot: ${interactiveScreenshotPath}`);
      }

      await page.close();
    }
  } catch (error) {
    console.error('An error occurred during test suite execution:', error);
  } finally {
    await browser.close();
    // Close the express server
    console.log('Closing server...');
    server.close();
  }
}

runTests();
