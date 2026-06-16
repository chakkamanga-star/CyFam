import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');

async function extract() {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs').catch(() => null)
    || await import('pdfjs-dist').catch(() => null);

  if (pdfjsLib) {
    const buf = fs.readFileSync('syro-malabar-liturgical-calendar-2026-english.pdf');
    const arr = new Uint8Array(buf);
    const doc = await pdfjsLib.getDocument({ data: arr }).promise;
    console.log('Pages:', doc.numPages);
    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      // Add newlines based on Y position changes to preserve structure somewhat
      let lastY = -1;
      let pageText = '';
      for (const item of content.items) {
        if (lastY !== -1 && Math.abs(lastY - item.transform[5]) > 4) {
          pageText += '\n';
        }
        pageText += item.str + ' ';
        lastY = item.transform[5];
      }
      text += pageText + '\n\n--- PAGE ' + i + ' ---\n\n';
    }
    fs.writeFileSync('pdf_extract_full.txt', text);
    console.log('Done writing full extract.');
  } else {
    console.log('pdfjs-dist failed');
  }
}

extract();
