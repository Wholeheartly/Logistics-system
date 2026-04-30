import requests
import json

# 登录获取token
login_response = requests.post('http://localhost:8000/api/auth/login', 
                              json={'username': 'admin', 'password': 'admin123'})
print('登录状态:', login_response.status_code)
if login_response.status_code == 200:
    data = login_response.json()
    token = data['token']
    print('Token获取成功')
    
    # 测试获取用户列表（带分页）
    print('\n=== 测试用户列表API（分页） ===')
    users_response = requests.get(f'http://localhost:8000/api/users?token={token}&page=1&page_size=5')
    print('状态码:', users_response.status_code)
    if users_response.status_code == 200:
        result = users_response.json()
        print(f'总数: {result.get("total")}, 页数: {result.get("page")}, 分页大小: {result.get("page_size")}')
        print(f'返回用户数: {len(result.get("users", []))}')
        for u in result.get('users', [])[:2]:
            print(f'  - {u["username"]} ({u["role"]}, {u["status"]})')
    
    # 测试关键词搜索
    print('\n=== 测试关键词搜索 ===')
    search_response = requests.get(f'http://localhost:8000/api/users?token={token}&keyword=admin')
    print('状态码:', search_response.status_code)
    if search_response.status_code == 200:
        result = search_response.json()
        print(f'找到 {len(result.get("users", []))} 个匹配用户')
