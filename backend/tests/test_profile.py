import requests
import json

BASE = 'http://localhost:8000'

# 1. 登录获取 token
login_res = requests.post(f'{BASE}/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
assert login_res.status_code == 200, f'登录失败: {login_res.text}'
token = login_res.json().get('token')
print('=== 1. 登录成功 ===')

# 测试场景列表
test_cases = [
    # 场景1: 正常更新所有字段
    {
        'name': '正常更新所有字段',
        'data': {'display_name': '管理员', 'email': 'admin@example.com', 'phone': '13800138000', 'department': '技术部'},
        'expect_status': 200,
        'expect_success': True
    },
    # 场景2: 空字符串（之前导致500的问题）
    {
        'name': '所有字段为空字符串（原500问题）',
        'data': {'display_name': '', 'email': '', 'phone': '', 'department': ''},
        'expect_status': 200,
        'expect_success': True
    },
    # 场景3: 混合有效和空值
    {
        'name': '混合有效值和空值',
        'data': {'display_name': '张三', 'email': '', 'phone': '13900139000', 'department': ''},
        'expect_status': 200,
        'expect_success': True
    },
    # 场景4: 空对象
    {
        'name': '发送空对象',
        'data': {},
        'expect_status': 200,
        'expect_success': True
    },
    # 场景5: 邮箱格式错误
    {
        'name': '邮箱格式错误',
        'data': {'email': 'invalid-email'},
        'expect_status': 422,
        'expect_success': None
    },
    # 场景6: 手机号格式错误
    {
        'name': '手机号格式错误',
        'data': {'phone': 'abc123'},
        'expect_status': 422,
        'expect_success': None
    },
    # 场景7: 显示名称超长
    {
        'name': '显示名称超过100字符',
        'data': {'display_name': 'A' * 101},
        'expect_status': 422,
        'expect_success': None
    },
    # 场景8: 仅空白字符
    {
        'name': '仅空白字符',
        'data': {'display_name': '   ', 'email': '   ', 'phone': '   ', 'department': '   '},
        'expect_status': 200,
        'expect_success': True
    },
    # 场景9: 无效token
    {
        'name': '无效token',
        'data': {'display_name': 'test'},
        'expect_status': 401,
        'expect_success': None,
        'token': 'invalid_token'
    },
]

passed = 0
failed = 0

for i, tc in enumerate(test_cases):
    use_token = tc.get('token', token)
    res = requests.post(
        f'{BASE}/api/profile?token={use_token}',
        json=tc['data'],
        headers={'Content-Type': 'application/json'}
    )

    ok = res.status_code == tc['expect_status']
    if tc['expect_success'] is not None:
        try:
            body = res.json()
            ok = ok and (body.get('success') == tc['expect_success'])
        except:
            pass

    status = '通过' if ok else '失败'
    if ok:
        passed += 1
    else:
        failed += 1

    print(f"  场景{i+1}: {tc['name']} -> HTTP {res.status_code} [{status}]")
    if not ok:
        print(f"    期望: {tc['expect_status']}, 实际: {res.status_code}")
        print(f"    响应: {res.text[:200]}")

print(f"\n=== 测试结果: {passed} 通过, {failed} 失败 ===")
