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
    for (let i = 1; i <= Math.min(doc.numPages, 30); i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(it => it.str).join(' ') + '\n\n--- PAGE ' + i + ' ---\n\n';
    }
    fs.writeFileSync('pdf_extract.txt', text);
    console.log(text.slice(0, 4000));
  } else {
    console.log('pdfjs-dist also failed');
  }
}

extract();
