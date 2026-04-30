import requests
from datetime import datetime
API = 'http://localhost:8000'

# 1. 登录 admin
r = requests.post(f'{API}/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
admin_token = r.json()['token']
print('admin 登录成功')

# 2. 登录 operator
r = requests.post(f'{API}/api/auth/login', json={'username': 'operator', 'password': 'op123456'})
operator_token = r.json()['token']
print('operator 登录成功')

# 3. 创建一个测试用户
uname = f'enabletest_{datetime.now().strftime("%H%M%S")}'
r = requests.post(f'{API}/api/users?token={admin_token}', json={
    'username': uname, 'password': 'Test@123',
    'display_name': '启用测试', 'role': 'operator', 'department': '运营部',
})
test_user_id = r.json()['user_id']
print(f'创建测试用户成功, id={test_user_id}')

# 4. 禁用该用户
r = requests.post(f'{API}/api/users/{test_user_id}/disable?token={admin_token}')
print(f'禁用用户: HTTP {r.status_code}, {r.json()}')

# 5. operator 尝试启用（应返回403）
r = requests.post(f'{API}/api/users/{test_user_id}/enable?token={operator_token}')
print(f'operator启用(应403): HTTP {r.status_code}')

# 6. admin 启用用户
r = requests.post(f'{API}/api/users/{test_user_id}/enable?token={admin_token}')
print(f'admin启用: HTTP {r.status_code}, {r.json()}')

# 7. 重复启用（应返回400）
r = requests.post(f'{API}/api/users/{test_user_id}/enable?token={admin_token}')
print(f'重复启用(应400): HTTP {r.status_code}, {r.json()}')

# 8. 验证操作日志已记录
from app.utils.db import get_session
from app.models.models import UserActionLog
session = get_session()
logs = session.query(UserActionLog).filter(
    UserActionLog.target_user_id == test_user_id,
    UserActionLog.action == 'enable'
).all()
print(f'操作日志记录数: {len(logs)}')
for log in logs:
    print(f'  action={log.action}, operator={log.operator_username}, target={log.target_username}, time={log.created_at}')
session.close()
