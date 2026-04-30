import requests
import json

# Get batch details with diffs
resp = requests.get('http://localhost:8000/api/reconciliation/batch/1/details?has_diff=true&page=1&page_size=5')
data = resp.json()
print('Total diff records:', data['total'])
print()
for d in data['details']:
    print(f"Row {d['row_no']}: {d['file_tracking_no']} | SKU: {d['file_sku']}")
    print(f"  File: total={d['file_total_amount']}, base={d['file_base_amount']}, weight={d['file_weight_lb']}, billed={d['file_billed_weight']}, zone={d['file_zone']}")
    print(f"  Sys:  total={d['sys_total_amount']}, base={d['sys_base_amount']}, weight={d['sys_weight_lb']}, billed={d['sys_billed_weight']}, zone={d['sys_zone']}")
    print(f"  Diff types: {d['diff_types']}")
    print(f"  Diff amount: {d['diff_amount']}")
    print()
