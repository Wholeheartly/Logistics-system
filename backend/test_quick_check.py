import requests
API = 'http://localhost:8000'

for role in ['admin', 'finance', 'operator']:
    r = requests.post(f'{API}/api/auth/login', json={'username': role, 'password': {'admin':'admin123','finance':'fin123456','operator':'op123456'}[role]})
    if r.status_code == 200:
        d = r.json()
        print(f'{role} permissions: {d.get("permissions", [])}')
        print(f'{role} role: {d.get("user", {}).get("role")}')
        print(f'{role} status: {d.get("user", {}).get("status")}')
    else:
        print(f'{role} login: {r.status_code} {r.json().get("detail","")[:80]}')

# Check ROLE_PERMISSIONS from the server
from app.models.models import ROLE_PERMISSIONS
for role, perms in ROLE_PERMISSIONS.items():
    print(f'\n{role} config: {perms}')
