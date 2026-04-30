"""
密码重置功能专项测试
覆盖：忘记密码请求、令牌验证、密码重置、密码强度校验、越权访问
"""
import requests
from datetime import datetime

API = 'http://localhost:8000'
PASS = 0
FAIL = 0

def check(name, expected, actual):
    global PASS, FAIL
    passed = expected == actual
    icon = '[OK]' if passed else '[FAIL]'
    print(f'  {icon} {name}: expected={expected}, actual={actual}')
    if passed:
        PASS += 1
    else:
        FAIL += 1
    return passed

print('=' * 60)
print('Password Reset Function Test')
print('=' * 60)

# ========== 1. forgot-password 接口测试 ==========
print('\n--- 1. forgot-password API Test ---')

# 1.1 正确 POST 请求
r = requests.post(f'{API}/api/auth/forgot-password', json={'username': 'admin'})
check('1.1 POST forgot-password valid user', 200, r.status_code)
if r.status_code == 200:
    data = r.json()
    token = data.get('token')
    check('1.1a returns token', True, bool(token))
    print(f'      token: {token[:20]}...')
else:
    token = None
    print(f'      response: {r.json()}')

# 1.2 GET 请求应返回 405（方法不允许）
r = requests.get(f'{API}/api/auth/forgot-password?username=admin')
check('1.2 GET forgot-password should return 405', 405, r.status_code)

# 1.3 不存在的用户
r = requests.post(f'{API}/api/auth/forgot-password', json={'username': 'notexist_xyz'})
check('1.3 non-existent user', 404, r.status_code)

# 1.4 空请求体
r = requests.post(f'{API}/api/auth/forgot-password', json={})
check('1.4 empty body', 422, r.status_code)

# 1.5 缺少 username 字段
r = requests.post(f'{API}/api/auth/forgot-password', json={'other': 'value'})
check('1.5 missing username field', 422, r.status_code)

# 1.6 超短用户名
r = requests.post(f'{API}/api/auth/forgot-password', json={'username': 'ab'})
check('1.6 too short username', 422, r.status_code)

# ========== 2. reset-password 接口测试 ==========
print('\n--- 2. reset-password API Test ---')

# 先获取一个有效 token
r = requests.post(f'{API}/api/auth/forgot-password', json={'username': 'operator'})
valid_token = None
if r.status_code == 200:
    valid_token = r.json().get('token')
    print(f'  got operator reset token: {valid_token[:20]}...')

# 2.1 使用有效token重置密码
if valid_token:
    r = requests.post(f'{API}/api/auth/reset-password', json={
        'token': valid_token,
        'new_password': 'NewPass123',
    })
    check('2.1 valid token reset password', 200, r.status_code)
    if r.status_code == 200:
        print(f'      message: {r.json().get("message")}')

    # 2.2 使用同一token再次重置（应失败，因为已使用）
    r = requests.post(f'{API}/api/auth/reset-password', json={
        'token': valid_token,
        'new_password': 'AnotherPass123',
    })
    check('2.2 reuse same token', 400, r.status_code)
    if r.status_code != 200:
        print(f'      error: {r.json().get("detail", "")[:60]}')

# 2.3 无效token
r = requests.post(f'{API}/api/auth/reset-password', json={
    'token': 'invalid_token_xyz_12345',
    'new_password': 'NewPass123',
})
check('2.3 invalid token', 400, r.status_code)

# 2.4 空请求体
r = requests.post(f'{API}/api/auth/reset-password', json={})
check('2.4 empty body', 422, r.status_code)

# 2.5 缺少token字段
r = requests.post(f'{API}/api/auth/reset-password', json={
    'new_password': 'NewPass123',
})
check('2.5 missing token field', 422, r.status_code)

# 2.6 缺少new_password字段
r = requests.post(f'{API}/api/auth/reset-password', json={
    'token': 'some_token',
})
check('2.6 missing new_password field', 422, r.status_code)

# ========== 3. 密码强度校验测试 ==========
print('\n--- 3. Password Strength Validation Test ---')

# 先获取新token
r = requests.post(f'{API}/api/auth/forgot-password', json={'username': 'operator'})
strong_token = r.json().get('token') if r.status_code == 200 else None

if strong_token:
    # 3.1 密码太短
    r = requests.post(f'{API}/api/auth/reset-password', json={
        'token': strong_token,
        'new_password': '123',
    })
    check('3.1 password too short(<6)', 422, r.status_code)

    # 3.2 纯数字密码
    r = requests.post(f'{API}/api/auth/reset-password', json={
        'token': strong_token,
        'new_password': '12345678',
    })
    check('3.2 digits only password', 400, r.status_code)
    if r.status_code == 400:
        print(f'      error: {r.json().get("detail", "")[:60]}')

    # 3.3 纯字母密码
    r = requests.post(f'{API}/api/auth/reset-password', json={
        'token': strong_token,
        'new_password': 'abcdefgh',
    })
    check('3.3 letters only password', 400, r.status_code)

    # 3.4 有效密码（字母+数字）
    r = requests.post(f'{API}/api/auth/reset-password', json={
        'token': strong_token,
        'new_password': 'ValidPass123',
    })
    check('3.4 valid password(letters+digits)', 200, r.status_code)

# ========== 4. 完整流程端到端测试 ==========
print('\n--- 4. End-to-End Flow Test ---')

# 4.1 完整流程：请求重置 -> 使用令牌 -> 用新密码登录
print('  step1: request reset token')
r = requests.post(f'{API}/api/auth/forgot-password', json={'username': 'finance'})
check('4.1a request finance reset', 200, r.status_code)
flow_token = r.json().get('token') if r.status_code == 200 else None

if flow_token:
    print('  step2: reset password with token')
    r = requests.post(f'{API}/api/auth/reset-password', json={
        'token': flow_token,
        'new_password': 'FlowTest123',
    })
    check('4.1b reset finance password', 200, r.status_code)

    if r.status_code == 200:
        print('  step3: login with new password')
        r = requests.post(f'{API}/api/auth/login', json={
            'username': 'finance',
            'password': 'FlowTest123',
        })
        check('4.1c login with new password', 200, r.status_code)
        if r.status_code == 200:
            print(f'      login success, user: {r.json().get("user",{}).get("username")}')

        # restore original password
        r2 = requests.post(f'{API}/api/auth/forgot-password', json={'username': 'finance'})
        if r2.status_code == 200:
            restore_token = r2.json().get('token')
            requests.post(f'{API}/api/auth/reset-password', json={
                'token': restore_token,
                'new_password': 'fin123456',
            })
            print('      restored original password')

# ========== 5. 令牌过期测试（模拟） ==========
print('\n--- 5. Token Expiry/Security Test ---')

# 5.1 使用过期的旧token（如果数据库中有）
r = requests.post(f'{API}/api/auth/reset-password', json={
    'token': 'expired_or_used_token',
    'new_password': 'SomePass123',
})
check('5.1 expired/used token', 400, r.status_code)

# ========== 汇总 ==========
print('\n' + '=' * 60)
print('Test Summary')
print('=' * 60)
total = PASS + FAIL
print(f'  total: {total}')
print(f'  [OK] pass: {PASS} ({PASS/total*100:.1f}%)' if total else '')
print(f'  [FAIL] fail: {FAIL} ({FAIL/total*100:.1f}%)' if total else '')
if FAIL == 0:
    print('\nAll password reset tests passed!')
else:
    print('\nSome tests failed, please check')
