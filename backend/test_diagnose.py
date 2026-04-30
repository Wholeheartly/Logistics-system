import requests
API = 'http://localhost:8000'

r = requests.post(f'{API}/api/auth/login', json={'username': 'operator', 'password': 'op123456'})
print('operator login:', r.status_code)
if r.status_code != 200:
    print('  response:', r.json())
    exit()
op = r.json()
print('  role:', op.get('user', {}).get('role'))
print('  perms:', op['permissions'])
op_token = op['token']

r = requests.get(f'{API}/api/reconciliation/batches?token={op_token}')
print('\noperator -> reconciliation/batches:', r.status_code)
if r.status_code == 200:
    print('  *** BUG! operator can access reconciliation! ***')
    data = r.json()
    print('  data keys:', list(data.keys()))
else:
    detail = r.json().get('detail', '')
    print('  OK:', detail[:60])

r = requests.get(f'{API}/api/reconciliation/batches')
print('\nno-token -> reconciliation/batches:', r.status_code)
if r.status_code == 200:
    print('  *** BUG! no token but returns 200! ***')
else:
    print('  response:', r.json().get('detail', str(r.json())[:100]))

r = requests.get(f'{API}/api/reconciliation/batches?token=invalid')
print('\ninvalid-token -> reconciliation/batches:', r.status_code)
if r.status_code == 200:
    print('  *** BUG! invalid token returns 200! ***')
else:
    print('  response:', r.json().get('detail', '')[:60])

r = requests.get(f'{API}/api/users?token={op_token}')
print('\noperator -> users:', r.status_code)

r = requests.get(f'{API}/api/profile?token={op_token}')
print('operator -> profile:', r.status_code)
