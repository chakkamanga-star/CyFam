import urllib.request, json, ssl

ctx = ssl.create_default_context()
URL = 'https://ektbhxjpextknqouksnc.supabase.co'
KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrdGJoeGpwZXh0a25xb3Vrc25jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE2NjY4NCwiZXhwIjoyMDk2NzQyNjg0fQ.cqtjYNhzfIF0mGNQggacrycOxuOKmjcgaJ8r31IgAa4'
HEADERS = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}

def get(path):
    req = urllib.request.Request(f'{URL}/rest/v1/{path}', headers=HEADERS)
    try:
        res = urllib.request.urlopen(req, context=ctx, timeout=8)
        return json.loads(res.read()), None
    except urllib.error.HTTPError as e:
        return None, f'{e.code}: {e.read().decode()[:100]}'

# 1. Table check
print('=== TABLE CHECK ===')
tables = ['admins','teams','events','media','notifications',
          'prayer_schedules','bible_quotes','organization',
          'settings','audit_logs','otp_sessions']
all_ok = True
for t in tables:
    data, err = get(f'{t}?limit=1&select=*')
    status = 'OK  ' if data is not None else 'FAIL'
    if data is None:
        all_ok = False
    print(f'  {status}  {t}' + (f'  -> {err}' if err else ''))

# 2. Teams
print('\n=== TEAMS SEEDED ===')
data, _ = get('teams?select=name,colour&order=name')
if data:
    for t in data:
        print(f'  {t["name"]}  ({t["colour"]})')
    print(f'  Total: {len(data)} teams (expected 9)')
    if len(data) != 9:
        print('  WARNING: Expected 9 teams!')

# 3. Bible quotes
print('\n=== BIBLE QUOTES ===')
data, _ = get('bible_quotes?select=reference&limit=10')
if data:
    for v in data:
        print(f'  {v["reference"]}')
    print(f'  Total: {len(data)} verses seeded')

# 4. Organization
print('\n=== ORGANIZATION ===')
data, _ = get('organization?select=name,tagline,founded_year')
if data:
    for o in data:
        print(f'  Name: {o["name"]}')
        print(f'  Tagline: {o["tagline"]}')
        print(f'  Founded: {o["founded_year"]}')
else:
    print('  MISSING - organization row not found!')

# 5. Settings
print('\n=== SETTINGS ===')
data, _ = get('settings?select=key,value')
if data:
    for s in data:
        print(f'  {s["key"]} = {s["value"]}')

# 6. Admins
print('\n=== ADMINS (your first admin) ===')
data, _ = get('admins?select=id,name,phone,role&limit=5')
if data:
    for a in data:
        print(f'  {a["name"]} | {a["phone"]} | {a["role"]}')
else:
    print('  NO ADMINS YET - add yourself to the admins table!')

print('\n=== SUMMARY ===')
print('All tables OK!' if all_ok else 'Some tables MISSING - re-run schema!')
