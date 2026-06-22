"""
Parse pdf_extract_full.txt and fill empty readings in syro-malabar-2026.json
"""
import re, json, sys

# ── Book abbreviation patterns (must be at start of a reading line) ──────────
BOOK_ABBREVS = [
    # NT
    'Matt?', 'Mk', 'Lk', 'Jn', 'Acts?', 'Rom', 'Gal', 'Eph', 'Phil', 'Col',
    'Heb', 'Jas', 'Rev', 'Tit', 'Phlm',
    # NT with numbers (1/2/3 prefix)
    'Cor', 'Thess', 'Tim', 'Pet',
    # OT
    'Gen', 'Ex(?:od)?', 'Lev', 'Num', 'Deut', 'Josh?', 'Jdg', 'Ruth',
    'Sam', 'Kings?', 'Chr(?:on)?', 'Ezra', 'Neh', 'Tob', 'Jdt', 'Esth',
    'Macc', 'Job', 'Ps(?:alm)?', 'Prov', 'Eccl?', 'Sir', 'Wis', 'Cant',
    'Isa?', 'Jer', 'Lam', 'Bar', 'Ezek?', 'Dan', 'Hos', 'Joel', 'Amos',
    'Obad?', 'Jon(?:ah)?', 'Mic', 'Nah', 'Hab', 'Zeph?', 'Hag', 'Zech', 'Mal',
    # abbreviation variants
    'Is\\.?', 'Zec', 'Chr',
]

BOOK_PAT = '|'.join(BOOK_ABBREVS)

# Matches: [optional "1/2/3  "] BookAbbrev Chapter:Verse
REF_RE = re.compile(
    r'^(?:([123])\s+)?'           # optional book-number prefix
    r'(' + BOOK_PAT + r')\b'      # book abbreviation
    r'[\s.]*(\d+[:\s][\d\-,\s;.]+)',  # chapter:verse
    re.IGNORECASE
)

# Day header: "22   Mon   Fifth Monday of Apostles"
DAY_RE = re.compile(r'^(\d{1,2})\s{2,}(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\b', re.IGNORECASE)

MONTH_NAMES = ['January','February','March','April','May','June',
               'July','August','September','October','November','December']

def clean_ref(num_prefix, book, verse_raw):
    book = book.strip().rstrip('.')
    verse = re.sub(r'\s+', '', verse_raw.strip().rstrip('.'))
    if num_prefix:
        return f"{num_prefix} {book} {verse}"
    return f"{book} {verse}"

def parse_extract(text):
    """
    Returns dict: { "2026-MM-DD": [{"reference": ..., "description": ...}, ...] }
    """
    # Split into lines, clean up
    lines = [l.strip() for l in text.splitlines()]

    # Build a list of (month_name, year, start_line_idx)
    month_positions = []
    for i, line in enumerate(lines):
        for m in MONTH_NAMES:
            if re.search(rf'\b{m}\s+2026\b', line, re.IGNORECASE):
                month_positions.append((m, 2026, i))
                break

    # Remove duplicates keeping only first occurrence per month
    seen = set()
    unique_months = []
    for m, y, idx in month_positions:
        if m not in seen:
            seen.add(m)
            unique_months.append((m, y, idx))

    results = {}  # date_str -> list of {reference, description}

    for mi, (month_name, year, start_idx) in enumerate(unique_months):
        month_num = MONTH_NAMES.index(month_name) + 1
        end_idx = unique_months[mi+1][2] if mi+1 < len(unique_months) else len(lines)

        month_lines = lines[start_idx:end_idx]

        current_day = None
        current_readings = []

        def flush_day():
            nonlocal current_day, current_readings
            if current_day is not None:
                date_str = f"{year}-{month_num:02d}-{current_day:02d}"
                # Only keep lines that look like scripture refs
                results[date_str] = list(current_readings)
            current_day = None
            current_readings = []

        for line in month_lines:
            if not line:
                continue

            day_match = DAY_RE.match(line)
            if day_match:
                flush_day()
                current_day = int(day_match.group(1))
                continue

            if current_day is None:
                continue

            ref_match = REF_RE.match(line)
            if ref_match:
                num_prefix = ref_match.group(1)
                book = ref_match.group(2)
                verse_raw = ref_match.group(3)
                reference = clean_ref(num_prefix, book, verse_raw)
                # Rest of line after the reference = description
                full = line[ref_match.end():].strip().lstrip('-').strip()
                # Clean up encoded chars
                full = full.replace('â€™', "'").replace('â€œ', '"').replace('â€', '"')
                current_readings.append({
                    "reference": reference,
                    "description": full
                })

        flush_day()

    return results


def main():
    with open("pdf_extract_full.txt", encoding="utf-8", errors="replace") as f:
        text = f.read()

    pdf_readings = parse_extract(text)
    print(f"Parsed {len(pdf_readings)} days from PDF")

    # Count non-empty
    non_empty = sum(1 for v in pdf_readings.values() if v)
    print(f"  With readings: {non_empty}")

    # Load existing JSON
    with open("src/data/syro-malabar-2026.json", encoding="utf-8") as f:
        data = json.load(f)

    updated = 0
    for date_str, entry in data.items():
        if not entry.get("readings"):
            pdf = pdf_readings.get(date_str, [])
            if pdf:
                data[date_str]["readings"] = pdf
                updated += 1
                print(f"  OK {date_str}: {len(pdf)} readings")
            else:
                print(f"  NO {date_str}: not found in PDF")

    print(f"\nUpdated {updated} entries")

    with open("src/data/syro-malabar-2026.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print("Saved to src/data/syro-malabar-2026.json")

    # Also print a sample for today (June 22)
    today = "2026-06-22"
    if today in data:
        print(f"\nSample — {today}:")
        for r in data[today].get("readings", []):
            print(f"  {r['reference']}: {r['description'][:50]}")

if __name__ == "__main__":
    main()
