import puppeteer from 'puppeteer';

let browserInstance = null;
let setupError = null;
let setupPromise = null;

/**
 * Internal lazy initializer for Puppeteer
 */
async function ensureBrowserReady() {
  if (setupError) throw setupError;
  if (browserInstance) return;

  if (!setupPromise) {
    setupPromise = (async () => {
      try {
        browserInstance = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          defaultViewport: { width: 1280, height: 800 },
        });
      } catch (err) {
        setupError = new Error(`❌ Failed to launch Puppeteer: ${err.message}`);
      }
    })();
  }

  await setupPromise;
  if (setupError) throw setupError;
}

/**
 * Converts HTML string to PDF buffer using Puppeteer
 * @param {string} html - HTML content to render
 * @returns {Promise<Buffer>} - PDF buffer
 */
export async function htmlToPdfBuffer(html) {
  if (!html || typeof html !== 'string' || html.trim().length === 0) {
    throw new Error('Invalid HTML input: HTML string is empty or malformed.');
  }

  await ensureBrowserReady();

  let page = null;
  try {
    page = await browserInstance.newPage();

    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 10000, // 10s timeout for safety
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '40px',
        bottom: '40px',
        left: '30px',
        right: '30px',
      },
    });

    return pdfBuffer;
  } catch (error) {
    console.error('❌ PDF generation failed:', error);
    throw new Error('Failed to generate PDF from HTML.');
  } finally {
    if (page) await page.close();
  }
}
