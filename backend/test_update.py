import requests
import json

# 登录获取token
login_response = requests.post('http://localhost:8000/api/auth/login', 
                              json={'username': 'admin', 'password': 'admin123'})
token = login_response.json()['token']

# 获取一个用户
all_users = requests.get(f'http://localhost:8000/api/users?token={token}').json()
test_user = all_users['users'][-1]
print(f'测试用户: {test_user["username"]} (id: {test_user["id"]}), 当前状态: {test_user["status"]}')

# 测试更新
update_response = requests.post(
    f'http://localhost:8000/api/users/{test_user["id"]}/update?token={token}',
    json={'status': 'active'}
)
print(f'更新状态码: {update_response.status_code}')
print(f'更新结果: {json.dumps(update_response.json(), ensure_ascii=False, indent=2)}')

# 验证更新
updated_users = requests.get(f'http://localhost:8000/api/users?token={token}').json()
for u in updated_users['users']:
    if u['id'] == test_user['id']:
        print(f'更新后状态: {u["status"]}')
        break
