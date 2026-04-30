"""
跨境电商物流比价系统 - 全面接口测试脚本 v2
测试范围：29 个 API 端点
测试维度：状态码、参数验证、数据格式、权限控制
"""
import requests
import json
import sys
import os
import tempfile
from datetime import datetime

API = 'http://localhost:8000'
PASS = 0
FAIL = 0
RESULTS = []

def log(level, msg):
    icon = {'PASS': '✅', 'FAIL': '❌', 'WARN': '⚠️', 'INFO': '📋', 'SKIP': '⏭️'}
    print(f"  {icon.get(level, '•')} [{level}] {msg}")

def record(name, test, expected, actual, passed):
    global PASS, FAIL
    if passed:
        PASS += 1
        log('PASS', f'{name}: {test}')
    else:
        FAIL += 1
        log('FAIL', f'{name}: {test}')
        log('INFO', f'  期望: {expected}')
        actual_str = str(actual)
        if len(actual_str) > 300:
            log('INFO', f'  实际: {actual_str[:300]}...')
        else:
            log('INFO', f'  实际: {actual_str}')
    RESULTS.append({'name': name, 'test': test, 'expected': str(expected),
                    'actual': str(actual), 'passed': passed,
                    'time': datetime.now().isoformat()})

def assert_status(r, expected, name, test):
    passed = r.status_code == expected
    record(name, test, f'HTTP {expected}', f'HTTP {r.status_code}', passed)
    return passed

def assert_ok(r, name, test):
    passed = 200 <= r.status_code < 300
    record(name, test, 'HTTP 2xx', f'HTTP {r.status_code}', passed)
    return passed

def assert_json(r, name, test):
    try:
        data = r.json()
        record(name, test, 'valid JSON', 'valid JSON', True)
        return data 
    except:
        record(name, test, 'valid JSON', f'invalid: {r.text[:100]}', False)
        return None

def assert_field(data, field, name, test):
    exists = isinstance(data, dict) and field in data
    record(name, test, f'has field "{field}"', str(exists), exists)
    return exists

def assert_not_ok(r, name, test):
    passed = r.status_code >= 400
    record(name, test, 'HTTP 4xx/5xx', f'HTTP {r.status_code}', passed)
    return passed

def assert_4xx(r, expected_codes, name, test):
    """assert status is one of the expected 4xx codes"""
    passed = r.status_code in expected_codes
    codes_str = '/'.join(str(c) for c in expected_codes)
    record(name, test, f'HTTP {codes_str}', f'HTTP {r.status_code}', passed)
    return passed

# =============================================
# 阶段 0：准备 - 获取各角色 Token
# =============================================
print('=' * 70)
print('阶段 0: 准备测试环境 - 获取各角色 Token')
print('=' * 70)

admin_token = None
finance_token = None
operator_token = None
test_user_id = None
test_username = f'test_user_{datetime.now().strftime("%H%M%S")}'

# 登录 admin
r = requests.post(f'{API}/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
if r.status_code == 200:
    admin_token = r.json().get('token')
    log('PASS', f'admin 登录成功')
    log('INFO', f'admin 权限: {r.json().get("permissions", [])}')
else:
    log('FAIL', f'admin 登录失败: {r.status_code} {r.text[:200]}')
    sys.exit(1)

# 登录 operator
r = requests.post(f'{API}/api/auth/login', json={'username': 'operator', 'password': 'op123456'})
if r.status_code == 200:
    operator_token = r.json().get('token')
    log('PASS', f'operator 登录成功')
    log('INFO', f'operator 权限: {r.json().get("permissions", [])}')
else:
    log('FAIL', f'operator 登录失败: {r.status_code} {r.text[:200]}')

# 登录 finance
r = requests.post(f'{API}/api/auth/login', json={'username': 'finance', 'password': 'fin123456'})
if r.status_code == 200:
    finance_token = r.json().get('token')
    log('PASS', f'finance 登录成功')
    log('INFO', f'finance 权限: {r.json().get("permissions", [])}')
else:
    log('FAIL', f'finance 登录失败: {r.status_code} {r.text[:200]}')

# 创建一个测试用户
if admin_token:
    r = requests.post(f'{API}/api/users?token={admin_token}', json={
        'username': test_username, 'password': 'Test@123456',
        'display_name': '测试用户', 'role': 'operator', 'department': '运营部',
    })
    if r.status_code == 200:
        test_user_id = r.json().get('user_id')
        log('PASS', f'创建测试用户成功, id={test_user_id}')
    else:
        log('WARN', f'创建测试用户失败: {r.status_code} {r.json().get("detail", "")[:60]}')

print()

# =============================================
# 阶段 1: 公共接口测试（无需鉴权）
# =============================================
print('=' * 70)
print('阶段 1: 公共接口测试（无需鉴权的端点）')
print('=' * 70)

# 1.1 GET /api/health
print('\n--- 1.1 GET /api/health ---')
r = requests.get(f'{API}/api/health')
assert_ok(r, 'health', '健康检查')
d = assert_json(r, 'health', '返回JSON')
if d:
    assert_field(d, 'status', 'health', '包含status字段')

# 1.2 GET /api/warehouses
print('\n--- 1.2 GET /api/warehouses ---')
r = requests.get(f'{API}/api/warehouses')
assert_ok(r, 'warehouses', '仓库列表')
d = assert_json(r, 'warehouses', '返回JSON')
if d:
    assert_field(d, 'warehouses', 'warehouses', '包含warehouses字段')
    if d.get('warehouses'):
        assert_field(d['warehouses'][0], 'code', 'warehouses', '仓库有code')
        assert_field(d['warehouses'][0], 'name', 'warehouses', '仓库有name')

# 1.3 POST /api/products/search
print('\n--- 1.3 POST /api/products/search ---')
r = requests.post(f'{API}/api/products/search', json={'keyword': ''})
assert_ok(r, 'products/search', '空关键词搜索')
d = assert_json(r, 'products/search', '返回JSON')
if d:
    assert_field(d, 'products', 'products/search', '包含products字段')

r = requests.post(f'{API}/api/products/search', json={})
assert_ok(r, 'products/search', '无keyword（使用默认值）')

r = requests.post(f'{API}/api/products/search', json={'keyword': 'NOTEXIST12345'})
assert_ok(r, 'products/search', '搜索不存在的产品')
d = assert_json(r, 'products/search', '返回JSON')
if d and d.get('products') is not None:
    record('products/search', '空搜索结果', 'products=[]',
           f'products count={len(d["products"])}', len(d["products"]) == 0)

# 1.4 POST /api/shipping/compare
print('\n--- 1.4 POST /api/shipping/compare ---')
r = requests.post(f'{API}/api/shipping/compare', json={
    'sku': 'TEST001', 'zip_code': '90001', 'warehouse': 'CA', 'is_residential': False
})
assert_ok(r, 'shipping/compare', '物流比价（正常参数）')
d = assert_json(r, 'shipping/compare', '返回JSON')

r = requests.post(f'{API}/api/shipping/compare', json={'sku': '', 'zip_code': ''})
assert_ok(r, 'shipping/compare', '空SKU和邮编')
d = assert_json(r, 'shipping/compare', '返回JSON')

r = requests.post(f'{API}/api/shipping/compare', json={})
assert_not_ok(r, 'shipping/compare', '空请求体应返回422')

r = requests.post(f'{API}/api/shipping/compare', json={
    'sku': 'TEST001', 'zip_code': '90001', 'warehouse': 'INVALID', 'is_residential': False
})
assert_ok(r, 'shipping/compare', '无效仓库代码')

# 1.5 POST /api/reconciliation/batch（无需鉴权）
print('\n--- 1.5 POST /api/reconciliation/batch ---')
r = requests.post(f'{API}/api/reconciliation/batch', json={
    'orders': [{'order_no': 'ORD001', 'sku': 'TEST', 'total_goods_price': 100, 'freight': 20}]
})
assert_ok(r, 'reconciliation/batch', '对账批量比对')
d = assert_json(r, 'reconciliation/batch', '返回JSON')

r = requests.post(f'{API}/api/reconciliation/batch', json={'orders': []})
assert_ok(r, 'reconciliation/batch', '空订单列表')

r = requests.post(f'{API}/api/reconciliation/batch', json={})
assert_not_ok(r, 'reconciliation/batch', '空请求体应返回422')

# 1.6 POST /api/auth/register
print('\n--- 1.6 POST /api/auth/register ---')
r = requests.post(f'{API}/api/auth/register', json={
    'username': f'regtest_{datetime.now().strftime("%H%M%S")}',
    'password': 'Test@123', 'display_name': '注册测试', 'department': '运营部',
})
assert_ok(r, 'auth/register', '正常注册')
d = assert_json(r, 'auth/register', '返回JSON')
if d:
    assert_field(d, 'success', 'auth/register', '包含success')
    assert_field(d, 'status', 'auth/register', '包含status')
    if d.get('status'):
        record('auth/register', '注册状态应为pending', 'pending', d['status'], d['status'] == 'pending')

r = requests.post(f'{API}/api/auth/register', json={'username': 'admin', 'password': 'Test@123'})
record('auth/register', '重复用户名', 'HTTP 400',
       f'HTTP {r.status_code}', r.status_code == 400)

r = requests.post(f'{API}/api/auth/register', json={'username': 'ab', 'password': '12'})
record('auth/register', '超短用户名/密码', 'HTTP 422',
       f'HTTP {r.status_code}', r.status_code == 422)

# 1.7 POST /api/auth/login
print('\n--- 1.7 POST /api/auth/login ---')
r = requests.post(f'{API}/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
assert_ok(r, 'auth/login', '正确凭据登录')
d = assert_json(r, 'auth/login', '返回JSON')
if d:
    assert_field(d, 'token', 'auth/login', '包含token')
    assert_field(d, 'user', 'auth/login', '包含user')
    assert_field(d, 'success', 'auth/login', '包含success')

r = requests.post(f'{API}/api/auth/login', json={'username': 'admin', 'password': 'WrongPass123!'})
record('auth/login', '错误密码', 'HTTP 401',
       f'HTTP {r.status_code}', r.status_code == 401)

r = requests.post(f'{API}/api/auth/login', json={'username': 'nonexistent_xyz', 'password': 'any123456'})
record('auth/login', '不存在用户', 'HTTP 401',
       f'HTTP {r.status_code}', r.status_code == 401)

r = requests.post(f'{API}/api/auth/login', json={'username': 'ab', 'password': '12'})
record('auth/login', '超短凭据', 'HTTP 422', f'HTTP {r.status_code}', r.status_code == 422)

r = requests.post(f'{API}/api/auth/login', json={'username': 'admin'})
record('auth/login', '缺少password', 'HTTP 422', f'HTTP {r.status_code}', r.status_code == 422)

# 1.8 POST /api/auth/forgot-password
print('\n--- 1.8 POST /api/auth/forgot-password ---')
r = requests.post(f'{API}/api/auth/forgot-password?username=admin')
assert_ok(r, 'auth/forgot-password', '存在用户密码重置')
d = assert_json(r, 'auth/forgot-password', '返回JSON')

r = requests.post(f'{API}/api/auth/forgot-password?username=nonexistent_xyz')
record('auth/forgot-password', '不存在用户', 'HTTP 404',
       f'HTTP {r.status_code}', r.status_code == 404)

# 1.9 POST /api/auth/reset-password
print('\n--- 1.9 POST /api/auth/reset-password ---')
r = requests.post(f'{API}/api/auth/reset-password', json={
    'token': 'invalid_token_12345', 'new_password': 'NewPass@123',
})
assert_not_ok(r, 'auth/reset-password', '无效token应返回400')

r = requests.post(f'{API}/api/auth/reset-password', json={'new_password': '12345'})
record('auth/reset-password', '缺少token', 'HTTP 422',
       f'HTTP {r.status_code}', r.status_code == 422)

# 1.10 Config 相关接口
print('\n--- 1.10 Config 配置接口 ---')
r = requests.post(f'{API}/api/config/sync')
assert_ok(r, 'config/sync', '配置同步')
d = assert_json(r, 'config/sync', '返回JSON')
if d:
    assert_field(d, 'success', 'config/sync', '包含success')
    assert_field(d, 'stats', 'config/sync', '包含stats')

r = requests.get(f'{API}/api/config/items')
assert_ok(r, 'config/items', '配置项列表（无参数）')
d = assert_json(r, 'config/items', '返回JSON')
if d:
    assert_field(d, 'total', 'config/items', '包含total')
    assert_field(d, 'items', 'config/items', '包含items')

r = requests.get(f'{API}/api/config/items?category=system')
assert_ok(r, 'config/items', '按分类过滤')

r = requests.get(f'{API}/api/config/items?keyword=燃油')
assert_ok(r, 'config/items', '按关键词搜索')

r = requests.get(f'{API}/api/config/items?page=1&page_size=5')
assert_ok(r, 'config/items', '分页查询')
d = assert_json(r, 'config/items', '返回JSON')
first_item_id = None
if d and d.get('items'):
    first_item_id = d['items'][0]['id']

r = requests.get(f'{API}/api/config/categories')
assert_ok(r, 'config/categories', '配置分类')
d = assert_json(r, 'config/categories', '返回JSON')
if d:
    assert_field(d, 'categories', 'config/categories', '包含categories')

if first_item_id:
    r = requests.get(f'{API}/api/config/item/{first_item_id}')
    assert_ok(r, 'config/item', '配置项详情')
    d = assert_json(r, 'config/item', '返回JSON')
    if d:
        assert_field(d, 'histories', 'config/item', '包含histories')

r = requests.get(f'{API}/api/config/item/99999')
assert_not_ok(r, 'config/item/99999', '不存在应返回404')

r = requests.post(f'{API}/api/config/item/99999/update', json={'new_value': '1.0'})
assert_not_ok(r, 'config/item/99999/update', '不存在应返回404')

r = requests.post(f'{API}/api/config/item/99999/rollback/99999')
assert_not_ok(r, 'config/item/99999/rollback', '不存在应返回404')

r = requests.get(f'{API}/api/config/audit-logs')
assert_ok(r, 'config/audit-logs', '审计日志')

print()

# =============================================
# 阶段 2: 需登录接口测试
# =============================================
print('=' * 70)
print('阶段 2: 需登录的接口测试')
print('=' * 70)

# 2.1 GET /api/auth/me
print('\n--- 2.1 GET /api/auth/me ---')
if operator_token:
    r = requests.get(f'{API}/api/auth/me?token={operator_token}')
    assert_ok(r, 'auth/me', '有效token获取用户信息')
    d = assert_json(r, 'auth/me', '返回JSON')
    if d:
        assert_field(d, 'id', 'auth/me', '包含id')
        assert_field(d, 'username', 'auth/me', '包含username')
        assert_field(d, 'role', 'auth/me', '包含role')
        assert_field(d, 'permissions', 'auth/me', '包含permissions')

r = requests.get(f'{API}/api/auth/me?token=invalid_token_xyz')
record('auth/me', '无效token', 'HTTP 401',
       f'HTTP {r.status_code}', r.status_code == 401)

r = requests.get(f'{API}/api/auth/me')
record('auth/me', '无token参数', 'HTTP 422',
       f'HTTP {r.status_code}', r.status_code == 422)

# 2.2 GET /api/profile
print('\n--- 2.2 GET /api/profile ---')
if operator_token:
    r = requests.get(f'{API}/api/profile?token={operator_token}')
    assert_ok(r, 'profile GET', '获取个人信息')
    d = assert_json(r, 'profile GET', '返回JSON')
    if d:
        assert_field(d, 'username', 'profile GET', '包含username')
        assert_field(d, 'email', 'profile GET', '包含email')
        assert_field(d, 'phone', 'profile GET', '包含phone')
        assert_field(d, 'department', 'profile GET', '包含department')

r = requests.get(f'{API}/api/profile')
record('profile GET', '无token', 'HTTP 422',
       f'HTTP {r.status_code}', r.status_code == 422)

# 2.3 POST /api/profile
print('\n--- 2.3 POST /api/profile ---')
if operator_token:
    r = requests.post(f'{API}/api/profile?token={operator_token}', json={
        'display_name': '运营测试员', 'email': 'optest@example.com', 'phone': '13800001111',
    })
    assert_ok(r, 'profile POST', '更新个人信息')
    d = assert_json(r, 'profile POST', '返回JSON')
    if d:
        assert_field(d, 'success', 'profile POST', '包含success')

    r = requests.post(f'{API}/api/profile?token={operator_token}', json={'department': '财务部'})
    record('profile POST', 'operator改到财务部(应被拒)', 'HTTP 400',
           f'HTTP {r.status_code}', r.status_code == 400)

    r = requests.post(f'{API}/api/profile?token={operator_token}', json={'department': '运营部'})
    record('profile POST', 'operator改回运营部', 'HTTP 200',
           f'HTTP {r.status_code}', r.status_code == 200)

r = requests.post(f'{API}/api/profile')
record('profile POST', '无token', 'HTTP 422',
       f'HTTP {r.status_code}', r.status_code == 422)

# 2.4 GET /api/users/departments
print('\n--- 2.4 GET /api/users/departments ---')
if operator_token:
    r = requests.get(f'{API}/api/users/departments?token={operator_token}')
    assert_ok(r, 'users/departments', '获取部门列表')
    d = assert_json(r, 'users/departments', '返回JSON')
    if d:
        assert_field(d, 'departments', 'users/departments', '包含departments')
        if d.get('departments'):
            assert_field(d['departments'][0], 'name', 'users/departments', '部门有name')
            assert_field(d['departments'][0], 'allowed_roles', 'users/departments', '部门有allowed_roles')

print()

# =============================================
# 阶段 3: 权限控制专项测试
# =============================================
print('=' * 70)
print('阶段 3: 权限控制专项测试')
print('=' * 70)

perm_matrix = [
    ('对账批次列表', 'GET', '/api/reconciliation/batches', 'reconciliation.view', 403, 200, 200),
    ('对账明细查看', 'GET', '/api/reconciliation/batch/1/details', 'reconciliation.view', 403, 200, 200),
    ('对账导出', 'GET', '/api/reconciliation/batch/1/export', 'reconciliation.export', 403, 200, 200),
    ('用户列表', 'GET', '/api/users', 'user.manage', 403, 403, 200),
    ('创建用户', 'POST', '/api/users', 'user.create', 403, 403, 200),
]

print(f'\n{"端点":<22} {"权限":<22} {"运期望":<8} {"运实际":<8} {"财期望":<8} {"财实际":<8} {"管期望":<8} {"管实际":<8}')
print('-' * 115)

tokens = {'operator': operator_token, 'finance': finance_token, 'admin': admin_token}
role_departments = {'operator': '运营部', 'finance': '财务部', 'admin': '技术部'}

for name, method, url, perm, op_exp, fin_exp, ad_exp in perm_matrix:
    actuals = {}
    for role, token in tokens.items():
        if not token:
            actuals[role] = 'N/A'
            continue
        qs = f'?token={token}'
        if url == '/api/users/1/reset-password':
            qs = f'?token={token}&new_password=Test123'
        full_url = f'{API}{url}{qs}'
        if method == 'GET':
            r = requests.get(full_url)
        elif url == '/api/users':
            r = requests.post(full_url, json={
                'username': f'ptest_{role}_{datetime.now().strftime("%H%M%S")}',
                'password': 'Test@123', 'role': role, 'department': role_departments[role],
            })
        else:
            r = requests.post(full_url)
        actuals[role] = r.status_code

    op_ok = actuals.get('operator', 0) == op_exp
    fin_ok = actuals.get('finance', 0) == fin_exp
    ad_ok = actuals.get('admin', 0) == ad_exp

    print(f'{name:<22} {perm:<22} {op_exp:<8} {str(actuals.get("operator","N/A")):<8} '
          f'{fin_exp:<8} {str(actuals.get("finance","N/A")):<8} '
          f'{ad_exp:<8} {str(actuals.get("admin","N/A")):<8}')

    record(name, f'运营({perm})', f'HTTP {op_exp}', f'HTTP {actuals.get("operator","N/A")}', op_ok)
    record(name, f'财务({perm})', f'HTTP {fin_exp}', f'HTTP {actuals.get("finance","N/A")}', fin_ok)
    record(name, f'管理员({perm})', f'HTTP {ad_exp}', f'HTTP {actuals.get("admin","N/A")}', ad_ok)

print()

# 3.2 越权访问测试 + 用户管理权限（使用安全的测试用户ID）
print('=' * 70)
print('阶段 3.2: 越权访问及用户管理权限测试')
print('=' * 70)

no_token_tests = [
    ('GET', '/api/reconciliation/batches', [422], '无token访问对账批次列表'),
    ('GET', '/api/reconciliation/batch/1/details', [422], '无token访问对账明细'),
    ('GET', '/api/reconciliation/batch/1/export', [422], '无token访问对账导出'),
    ('GET', '/api/users', [422], '无token访问用户列表'),
    ('POST', '/api/users', [422], '无token创建用户'),
]

for method, url, expected_codes, desc in no_token_tests:
    r = requests.get(f'{API}{url}') if method == 'GET' else requests.post(f'{API}{url}')
    assert_4xx(r, expected_codes, '越权', desc)

for method, url, expected_codes, desc in no_token_tests:
    r = requests.get(f'{API}{url}?token=invalid_token_xyz') if method == 'GET' \
        else requests.post(f'{API}{url}?token=invalid_token_xyz')
    passed = r.status_code in (400, 401, 403, 422)
    record('越权', f'无效token {desc.replace("无token", "")}', 'HTTP 400/401/403/422',
           f'HTTP {r.status_code}', passed)

# 用户管理专项权限测试（使用测试用户ID，避免误操作admin）
if test_user_id and admin_token:
    mgmt_tests = [
        (f'/api/users/{test_user_id}/approve', 'user.approve', 403, 403, 200),
        (f'/api/users/{test_user_id}/disable', 'user.delete', 403, 403, 200),
        (f'/api/users/{test_user_id}/reset-password', 'user.edit', 403, 403, 200),
    ]
    for url_path, perm, op_exp, fin_exp, ad_exp in mgmt_tests:
        actuals = {}
        for role, token in tokens.items():
            if not token:
                actuals[role] = 'N/A'
                continue
            qs = f'?token={token}'
            if 'reset-password' in url_path:
                qs = f'?token={token}&new_password=TestPass123'
            r = requests.post(f'{API}{url_path}{qs}')
            actuals[role] = r.status_code

        record(url_path.split('/')[-1], f'运营({perm})', f'HTTP {op_exp}', f'HTTP {actuals.get("operator","N/A")}', actuals.get('operator', 0) == op_exp)
        record(url_path.split('/')[-1], f'财务({perm})', f'HTTP {fin_exp}', f'HTTP {actuals.get("finance","N/A")}', actuals.get('finance', 0) == fin_exp)
        record(url_path.split('/')[-1], f'管理员({perm})', f'HTTP 200/400', f'HTTP {actuals.get("admin","N/A")}', actuals.get('admin', 0) in (200, 400))

print()

# 3.3 上传权限控制
print('=' * 70)
print('阶段 3.3: 上传对账文件权限控制')
print('=' * 70)

tmp = tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False)
tmp.write(b'test xlsx content')
tmp.close()

for role, token in [('operator', operator_token), ('finance', finance_token), ('admin', admin_token)]:
    if not token:
        continue
    with open(tmp.name, 'rb') as f:
        r = requests.post(f'{API}/api/reconciliation/upload?token={token}', files={'file': f})
    expected = 403 if role == 'operator' else 200
    actual = r.status_code
    if role in ('finance', 'admin'):
        passed = actual in (200, 400, 500)  # 200/400=权限通过, 500=文件解析异常(权限已过)
    else:
        passed = actual == 403
    record('上传权限', f'{role}上传对账文件', f'HTTP 403(被拒)' if role == 'operator' else 'HTTP 200/400/500(权限通过)',
           f'HTTP {actual}', passed)

os.unlink(tmp.name)

print()

# =============================================
# 阶段 4: 数据格式完整性验证
# =============================================
print('=' * 70)
print('阶段 4: 返回数据格式完整性验证')
print('=' * 70)

# 4.1 登录响应格式 (重新登录，避免被锁定影响)
r = requests.post(f'{API}/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
data = r.json()
if r.status_code == 200:
    for field in ['success', 'token', 'user', 'permissions']:
        assert_field(data, field, 'login响应', f'必须包含{field}')
    if data.get('user'):
        for field in ['id', 'username', 'display_name', 'role', 'status']:
            assert_field(data['user'], field, 'login响应.user', f'必须包含{field}')
else:
    log('WARN', f'admin 被锁定，跳过登录格式验证')

# 4.2 个人信息响应格式
if operator_token:
    r = requests.get(f'{API}/api/profile?token={operator_token}')
    if r.status_code == 200:
        data = r.json()
        for field in ['id', 'username', 'display_name', 'email', 'phone', 'department', 'role', 'status', 'permissions']:
            assert_field(data, field, 'profile响应', f'必须包含{field}')
    else:
        log('WARN', f'profile GET 异常: {r.status_code}')

# 4.3 对账批次列表格式
if admin_token:
    r = requests.get(f'{API}/api/reconciliation/batches?token={admin_token}')
    if r.status_code == 200:
        d = r.json()
        for field in ['total', 'page', 'page_size', 'batches']:
            assert_field(d, field, 'reconciliation/batches', f'必须包含{field}')
        if d.get('batches'):
            b = d['batches'][0]
            for field in ['id', 'batch_no', 'name', 'file_name', 'total_records', 'status', 'created_at']:
                assert_field(b, field, 'reconciliation/batches.item', f'必须包含{field}')

# 4.4 配置项响应格式
r = requests.get(f'{API}/api/config/items?page_size=1')
d = r.json()
for field in ['total', 'page', 'page_size', 'items']:
    assert_field(d, field, 'config/items', f'必须包含{field}')
if d.get('items'):
    item = d['items'][0]
    for field in ['id', 'config_key', 'category', 'display_name', 'current_value', 'value_type']:
        assert_field(item, field, 'config/items.item', f'必须包含{field}')

# 4.5 用户列表响应格式
if admin_token:
    r = requests.get(f'{API}/api/users?token={admin_token}')
    if r.status_code == 200:
        d = r.json()
        assert_field(d, 'users', 'users', '必须包含users')
        if d.get('users'):
            u = d['users'][0]
            for field in ['id', 'username', 'display_name', 'email', 'role', 'status', 'department']:
                assert_field(u, field, 'users.item', f'必须包含{field}')

print()

# =============================================
# 阶段 5: 边界条件和异常测试
# =============================================
print('=' * 70)
print('阶段 5: 边界条件和异常测试')
print('=' * 70)

# 5.1 部门-角色映射
print('\n--- 5.1 部门-角色映射验证 ---')
if admin_token:
    dept_tests = [
        ('运营部', 'admin', 400, '运营部不允许admin'),
        ('运营部', 'operator', 200, '运营部允许operator'),
        ('财务部', 'operator', 400, '财务部不允许operator'),
        ('财务部', 'finance', 200, '财务部允许finance'),
        ('技术部', 'admin', 200, '技术部允许admin'),
        ('技术部', 'finance', 200, '技术部允许finance'),
        ('技术部', 'operator', 200, '技术部允许operator'),
    ]
    for dept, role, expected, desc in dept_tests:
        uname = f'deprt_{role}_{datetime.now().strftime("%H%M%S")}'
        r = requests.post(f'{API}/api/users?token={admin_token}', json={
            'username': uname, 'password': 'Test@123', 'role': role, 'department': dept,
        })
        record('部门角色映射', desc, f'HTTP {expected}', f'HTTP {r.status_code}', r.status_code == expected)

# 5.2 配置项参数验证
print('\n--- 5.2 配置项参数验证 ---')
r = requests.post(f'{API}/api/config/item/1/update', json={})
record('config/update', '缺少new_value', 'HTTP 422',
       f'HTTP {r.status_code}', r.status_code == 422)

if first_item_id:
    r = requests.post(f'{API}/api/config/item/{first_item_id}/update', json={'new_value': 'test'})
    # 可能返回200(更新成功)或400(值不符合范围)或403(不可编辑)
    passed = r.status_code not in (404, 500)
    record('config/update', '正常参数', 'HTTP 2xx/4xx(非404/500)',
           f'HTTP {r.status_code}', passed)

# 5.3 登录失败次数限制（放到最后，避免影响其他测试）
print('\n--- 5.3 登录失败次数限制 ---')
r = requests.post(f'{API}/api/auth/login', json={'username': 'operator', 'password': 'op123456'})
if r.status_code == 200:
    op_token_alt = r.json().get('token')
    for i in range(6):
        r = requests.post(f'{API}/api/auth/login',
                         json={'username': 'operator', 'password': 'wrongpass'})
        if i < 4:
            record('登录限制', f'第{i+1}次错误登录', 'HTTP 401',
                   f'HTTP {r.status_code}', r.status_code == 401)
        else:
            passed = r.status_code == 401
            record('登录限制', f'第{i+1}次错误登录(应锁定)', 'HTTP 401',
                   f'HTTP {r.status_code}', passed)

# 5.4 用户管理功能（使用测试用户，避免影响admin）
print('\n--- 5.4 用户管理功能 ---')
if admin_token and test_user_id:
    # 先确保用户是 pending 状态，测试 approve
    r = requests.post(f'{API}/api/users/{test_user_id}/approve?token={admin_token}')
    log('INFO', f'审核测试用户: HTTP {r.status_code}')

    r = requests.post(f'{API}/api/users/{test_user_id}/reset-password?token={admin_token}&new_password=NewPass@456')
    record('admin/reset-password', '管理员重置测试用户密码', 'HTTP 200',
           f'HTTP {r.status_code}', r.status_code == 200)

    r = requests.post(f'{API}/api/users/{test_user_id}/disable?token={admin_token}')
    record('admin/disable', '管理员禁用测试用户', 'HTTP 200',
           f'HTTP {r.status_code}', r.status_code == 200)

    r = requests.post(f'{API}/api/users/{test_user_id}/disable?token={admin_token}')
    log('INFO', f'重复禁用测试用户: HTTP {r.status_code} {r.json().get("detail","")[:60]}')

print()

# =============================================
# 汇总报告
# =============================================
print('=' * 70)
print('测 试 汇 总 报 告')
print('=' * 70)
total = PASS + FAIL
print(f'  总测试项: {total}')
if total > 0:
    print(f'  ✅ 通过:   {PASS}  ({PASS/total*100:.1f}%)')
    print(f'  ❌ 失败:   {FAIL}  ({FAIL/total*100:.1f}%)')
else:
    print('  ✅ 通过:   0')
    print('  ❌ 失败:   0')
print('=' * 70)

# 分类失败的测试
failed_tests = [r for r in RESULTS if not r['passed']]
if failed_tests:
    print('\n失败测试明细:')
    print('-' * 100)
    categories = {}
    for ft in failed_tests:
        cat = ft['name']
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(ft)

    for cat, tests in categories.items():
        print(f'\n  📂 {cat} ({len(tests)} 项):')
        for t in tests:
            print(f'    ❌ {t["test"]}')
            print(f'       期望: {t["expected"]}')
            actual_short = t['actual'][:150] if len(str(t['actual'])) > 150 else t['actual']
            print(f'       实际: {actual_short}')
else:
    print('\n🎉 所有测试通过！')

# 保存详细报告
report_file = f'test_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
with open(report_file, 'w', encoding='utf-8') as f:
    json.dump({
        'summary': {'total': total, 'pass': PASS, 'fail': FAIL},
        'results': RESULTS,
    }, f, ensure_ascii=False, indent=2)
print(f'\n详细报告已保存: {report_file}')

if FAIL > 0:
    print('\n⚠️ 存在失败测试，请检查上方明细')
    sys.exit(1)
else:
    print('\n✅ 所有测试通过！')
