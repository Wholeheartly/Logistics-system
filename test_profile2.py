import requests

BASE = 'http://localhost:8000'

print('=== 测试 GET /api/profile 各种场景 ===')

# 场景1: 不带token
res = requests.get(f'{BASE}/api/profile')
body = res.json()
print('1. 不带token:', res.status_code, '-', body.get('detail', '')[:50])

# 场景2: token为空
res = requests.get(f'{BASE}/api/profile?token=')
body = res.json()
print('2. token为空:', res.status_code, '-', body.get('detail', '')[:50])

# 场景3: 无效token
res = requests.get(f'{BASE}/api/profile?token=invalid')
body = res.json()
print('3. 无效token:', res.status_code, '-', body.get('detail', '')[:50])

# 场景4: 有效token
login_res = requests.post(f'{BASE}/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
token = login_res.json().get('token')
res = requests.get(f'{BASE}/api/profile?token={token}')
body = res.json()
print('4. 有效token:', res.status_code, '- 用户名:', body.get('username'))

print('\n=== 测试 POST /api/profile 错误处理 ===')

# 场景5: 邮箱格式错误
res = requests.post(
    f'{BASE}/api/profile?token={token}',
    json={'email': 'invalid'},
    headers={'Content-Type': 'application/json'}
)
print('5. 邮箱格式错误:', res.status_code)
data = res.json()
detail = data.get('detail')
print('   detail类型:', type(detail).__name__)
if isinstance(detail, list) and len(detail) > 0:
    print('   首条错误:', detail[0].get('msg', '')[:50])
else:
    print('   detail:', detail)

# 场景6: 正常更新
res = requests.post(
    f'{BASE}/api/profile?token={token}',
    json={'display_name': '测试用户', 'email': 'test@example.com'},
    headers={'Content-Type': 'application/json'}
)
print('6. 正常更新:', res.status_code, '-', res.json().get('message'))
