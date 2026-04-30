"""
产品添加功能测试脚本
"""
import requests
import json
import io
import openpyxl

BASE_URL = "http://127.0.0.1:8001"


def get_token():
    """获取测试用的登录 token"""
    try:
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if resp.status_code == 200:
            return resp.json().get("token")
    except Exception:
        pass
    return None


def test_health():
    """测试服务是否启动"""
    try:
        resp = requests.get(f"{BASE_URL}/api/health")
        print(f"健康检查: {resp.status_code} - {resp.json()}")
        return resp.status_code == 200
    except Exception as e:
        print(f"健康检查失败: {e}")
        return False


def test_create_product(token):
    """测试手动添加产品"""
    print("\n=== 测试手动添加产品 ===")

    # 测试正常添加
    resp = requests.post(
        f"{BASE_URL}/api/products?token={token}",
        json={
            "sku": "TEST001",
            "name": "测试产品",
            "model": "Model-X",
            "specification": "10x20x30cm",
            "price": 99.99,
            "stock_quantity": 100,
            "length_cm": 10.0,
            "width_cm": 20.0,
            "height_cm": 30.0,
            "gross_weight_kg": 1.5,
            "category": "电子产品",
            "brand": "测试品牌",
            "supplier": "测试供应商",
            "description": "这是一个测试产品",
        }
    )
    print(f"正常添加: {resp.status_code}")
    print(json.dumps(resp.json(), ensure_ascii=False, indent=2))

    # 测试重复 SKU
    resp2 = requests.post(
        f"{BASE_URL}/api/products?token={token}",
        json={
            "sku": "TEST001",
            "name": "重复产品",
            "length_cm": 10.0,
            "width_cm": 20.0,
            "height_cm": 30.0,
            "gross_weight_kg": 1.5,
        }
    )
    print(f"\n重复 SKU: {resp2.status_code}")
    print(json.dumps(resp2.json(), ensure_ascii=False, indent=2))

    # 测试缺少必填字段
    resp3 = requests.post(
        f"{BASE_URL}/api/products?token={token}",
        json={
            "sku": "TEST002",
            "name": "",
            "length_cm": -1,
            "width_cm": 20.0,
            "height_cm": 30.0,
            "gross_weight_kg": 1.5,
        }
    )
    print(f"\n缺少必填字段: {resp3.status_code}")
    print(json.dumps(resp3.json(), ensure_ascii=False, indent=2))


def test_check_sku(token):
    """测试 SKU 重复检查"""
    print("\n=== 测试 SKU 重复检查 ===")

    resp = requests.post(f"{BASE_URL}/api/products/check-sku?sku=TEST001&token={token}")
    print(f"检查已存在 SKU: {resp.status_code} - {resp.json()}")

    resp2 = requests.post(f"{BASE_URL}/api/products/check-sku?sku=NOTEXIST&token={token}")
    print(f"检查不存在 SKU: {resp2.status_code} - {resp2.json()}")


def test_search_products(token):
    """测试产品查询（验证返回新字段）"""
    print("\n=== 测试产品查询 ===")

    resp = requests.post(
        f"{BASE_URL}/api/products/search?token={token}",
        json={"keyword": "TEST"}
    )
    print(f"查询结果: {resp.status_code}")
    data = resp.json()
    if "products" in data and len(data["products"]) > 0:
        print(f"返回产品数量: {len(data['products'])}")
        print(f"第一个产品字段: {list(data['products'][0].keys())}")
    else:
        print("无产品数据")


def test_excel_import(token):
    """测试 Excel 批量导入"""
    print("\n=== 测试 Excel 批量导入 ===")

    # 创建测试 Excel 文件
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "产品导入"

    # 表头（使用中文字段名）
    ws.append([
        "SKU", "产品名称", "型号", "规格", "价格",
        "库存数量", "长度(cm)", "宽度(cm)", "高度(cm)",
        "毛重(kg)", "分类", "品牌", "供应商", "描述"
    ])

    # 有效数据
    ws.append([
        "EXCEL001", "Excel产品1", "M1", "10x20x30", 199.99,
        50, 10.0, 20.0, 30.0, 2.0, "分类A", "品牌A", "供应商A", "描述1"
    ])
    ws.append([
        "EXCEL002", "Excel产品2", "M2", "15x25x35", 299.99,
        30, 15.0, 25.0, 35.0, 3.0, "分类B", "品牌B", "供应商B", "描述2"
    ])

    # 无效数据（缺少必填字段）
    ws.append([
        "EXCEL003", "", "M3", "", "",
        "", "", 25.0, 35.0, 3.0, "", "", "", ""
    ])

    # 重复 SKU
    ws.append([
        "EXCEL001", "重复产品", "M4", "", 99.99,
        10, 5.0, 5.0, 5.0, 0.5, "", "", "", ""
    ])

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    resp = requests.post(
        f"{BASE_URL}/api/products/import/excel?token={token}",
        files={"file": ("test_products.xlsx", output, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    )
    print(f"导入结果: {resp.status_code}")
    print(json.dumps(resp.json(), ensure_ascii=False, indent=2))


def test_import_template():
    """测试下载导入模板"""
    print("\n=== 测试下载导入模板 ===")

    resp = requests.get(f"{BASE_URL}/api/products/import/template")
    print(f"模板下载: {resp.status_code}, Content-Type: {resp.headers.get('content-type')}")
    print(f"Content-Disposition: {resp.headers.get('content-disposition')}")


def main():
    print("=" * 50)
    print("产品添加功能测试")
    print("=" * 50)

    if not test_health():
        print("\n服务未启动，请先运行: python run.py")
        return

    token = get_token()
    if not token:
        print("\n无法获取登录 token，请确保 admin 用户存在")
        return

    print(f"获取 token 成功")

    test_create_product(token)
    test_check_sku(token)
    test_search_products(token)
    test_excel_import(token)
    test_import_template()

    print("\n" + "=" * 50)
    print("测试完成")
    print("=" * 50)


if __name__ == "__main__":
    main()
