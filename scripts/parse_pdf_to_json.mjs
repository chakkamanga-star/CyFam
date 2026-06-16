import fs from 'fs/promises';

async function parseSyroMalabarPDF() {
  const text = await fs.readFile('pdf_extract_full.txt', 'utf8');
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const result = {};
  
  let currentYear = 2026;
  let currentMonth = null;
  let currentSeason = 'Unknown Season';
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  let currentDayNum = null;
  let currentDateStr = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line indicates a month/year change
    // Matches "2026 January", "January 2026", "2025 December"
    let monthMatched = false;
    for (const m of monthNames) {
      if (line.includes(m) && (line.includes('2025') || line.includes('2026'))) {
        currentMonth = monthNames.indexOf(m) + 1;
        if (line.includes('2025')) currentYear = 2025;
        if (line.includes('2026')) currentYear = 2026;
        monthMatched = true;
        break;
      }
    }
    if (monthMatched) continue;

    // Skip page headers like "--- PAGE 20 ---"
    if (line.startsWith('--- PAGE')) continue;
    if (line.match(/^\d+\s+Syro-Malabar Liturgical Calendar/)) continue;
    if (line.match(/^\d+$/)) continue; // single numbers like page numbers

    // Look for day header: e.g. "17   Sat   Second Saturday of Denha" or "18   Sun      Third Sunday of Denha"
    // Usually starts with a number, then day of week (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
    const dayMatch = line.match(/^(\d{1,2})\s+([A-Z][a-z]{2})\s+(.*)$/i);
    if (dayMatch && currentMonth) {
      currentDayNum = parseInt(dayMatch[1], 10);
      let dayDesc = dayMatch[3].trim();
      
      // Remove symbols like 
      dayDesc = dayDesc.replace(//g, '').trim();

      // Create date string
      const mm = String(currentMonth).padStart(2, '0');
      const dd = String(currentDayNum).padStart(2, '0');
      currentDateStr = `${currentYear}-${mm}-${dd}`;

      // Try to determine season
      if (dayDesc.includes('Denha')) currentSeason = 'Denha';
      else if (dayDesc.includes('Great Fast') || dayDesc.includes('Sauma')) currentSeason = 'Great Fast';
      else if (dayDesc.includes('Resurrection') || dayDesc.includes('Qyamtha')) currentSeason = 'Resurrection';
      else if (dayDesc.includes('Apostles') || dayDesc.includes('Sleehe')) currentSeason = 'Apostles';
      else if (dayDesc.includes('Summer') || dayDesc.includes('Kaitha')) currentSeason = 'Summer';
      else if (dayDesc.includes('Elijah') || dayDesc.includes('Cross') || dayDesc.includes('Sleeva') || dayDesc.includes('Moses')) currentSeason = 'Elijah-Cross-Moses';
      else if (dayDesc.includes('Dedication')) currentSeason = 'Dedication of the Church';
      else if (dayDesc.includes('Annunciation') || dayDesc.includes('Suvara')) currentSeason = 'Annunciation';
      else if (dayDesc.includes('Nativity') || dayDesc.includes('Yalda')) currentSeason = 'Nativity';

      if (!result[currentDateStr]) {
        result[currentDateStr] = {
          season: currentSeason,
          liturgical_day: dayDesc,
          feasts: [],
          readings: []
        };
      } else {
        result[currentDateStr].liturgical_day = dayDesc;
      }
      continue;
    }

    if (!currentDateStr) continue;

    // Check if line is a reading
    // Usually starts with Book Abbreviation and chapter:verse
    // e.g. "Gen 4:1-12 Cain and Abel"
    // "1 Kgs 21:1-13 Naboth is stoned to death"
    // "1 Cor 1:18-29 To those who are called..."
    const readingMatch = line.match(/^(\d?\s?[A-Za-z]+\s+\d+:\d+(?:-\d+)?(?:,\s*\d+:\d+(?:-\d+)?)?(?:;\s*\d+:\d+(?:-\d+)?)?)\s+(.*)$/);

    if (readingMatch) {
      result[currentDateStr].readings.push({
        reference: readingMatch[1].trim(),
        description: readingMatch[2].trim()
      });
      continue;
    }

    // Check for single word reading refs like "Mt 12:1-8" if it didn't match above for some reason
    const simpleRefMatch = line.match(/^(\d?\s?[A-Za-z]+\s+\d+:\d+(?:-\d+)?)\s+(.*)$/);
    if (simpleRefMatch) {
      result[currentDateStr].readings.push({
        reference: simpleRefMatch[1].trim(),
        description: simpleRefMatch[2].trim()
      });
      continue;
    }

    // Check for feast/saint note (lines that don't match reading and don't match day header)
    // Often it's just a phrase like "Saint Stephen" or "First Friday"
    // Let's just push it to feasts if it's short, or ignore if it looks like reading continuation
    if (line.length > 3 && line.length < 60 && !line.includes('Qudaša') && !line.match(/^[a-z]/)) {
      // It's likely a feast, octave note, or saint
      if (!result[currentDateStr].feasts.includes(line)) {
        result[currentDateStr].feasts.push(line);
      }
    }
  }

  // Filter out any 2025 dates if we only want 2026, though we could keep them.
  const only2026 = {};
  for (const [date, data] of Object.entries(result)) {
    if (date.startsWith('2026')) {
      only2026[date] = data;
    }
  }

  await fs.writeFile('src/data/syro-malabar-2026.json', JSON.stringify(only2026, null, 2));
  console.log(`Extracted ${Object.keys(only2026).length} days for 2026.`);
}

parseSyroMalabarPDF().catch(console.error);
