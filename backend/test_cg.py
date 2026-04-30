import requests

def test_sku(sku, zip_code='90210', warehouse='CA'):
    resp = requests.post('http://localhost:8000/api/shipping/compare', json={
        'sku': sku,
        'zip_code': zip_code,
        'warehouse': warehouse,
        'is_residential': False
    })
    data = resp.json()
    if 'error' in data:
        print(f'\n=== {sku} === Error: {data["error"]}')
        return

    print(f'\n=== {sku} ===')
    print(f'Product: {data["product"]["length_cm"]}x{data["product"]["width_cm"]}x{data["product"]["height_cm"]} cm, {data["product"]["gross_weight_kg"]:.2f} kg')
    cg_found = False
    for r in data['results']:
        cheapest = ' [CHEAPEST]' if r.get('is_cheapest') else ''
        cg_info = ''
        if 'cg_category' in r:
            cg_found = True
            cg_info = f" (CG: {r['cg_category']}, Base=${r['base_rate']}, $/lb=${r['per_lb_rate']})"
        print(f"  {r['carrier_name']}: ${r['total']:.2f}{cg_info}{cheapest}")
    if not cg_found:
        print('  CG: Not available')
    for e in data.get('errors', []):
        if 'CastleGate' in e['carrier_name']:
            print(f"  CG ERROR: {e['reason']}")

# Find products that might be Bin-Small or other categories
import sqlite3
conn = sqlite3.connect('logistics.db')
cursor = conn.cursor()

# Look for small, light products (potential Bin items)
cursor.execute('''
    SELECT sku, length_cm, width_cm, height_cm, gross_weight_kg FROM products
    WHERE length_cm <= 50 AND width_cm <= 40 AND height_cm <= 30 AND gross_weight_kg <= 5
    LIMIT 5
''')
print('\n=== Small products (potential Bin) ===')
for p in cursor.fetchall():
    sku, l, w, h, wt = p
    print(f'  {sku}: {l}x{w}x{h} cm, {wt:.2f} kg')
    test_sku(sku)

# Look for very large products (potential Oversize or too big for CG)
cursor.execute('''
    SELECT sku, length_cm, width_cm, height_cm, gross_weight_kg FROM products
    WHERE (length_cm > 150 OR width_cm > 100 OR height_cm > 100) AND gross_weight_kg > 20
    LIMIT 3
''')
print('\n=== Large products (potential Oversize or unavailable) ===')
for p in cursor.fetchall():
    sku, l, w, h, wt = p
    print(f'  {sku}: {l}x{w}x{h} cm, {wt:.2f} kg')
    test_sku(sku)

conn.close()
