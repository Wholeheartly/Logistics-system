"""
产品查询服务
"""
from sqlalchemy.orm import Session
from app.models.models import Product
from app.utils.unit_converter import convert_product_units


def get_product_by_sku(session: Session, sku: str) -> Product | None:
    return session.query(Product).filter(Product.sku == sku.strip()).first()


def search_products(session: Session, keyword: str, limit: int = 20) -> list[Product]:
    return session.query(Product).filter(Product.sku.like(f"%{keyword}%")).limit(limit).all()


def validate_product_data(data: dict) -> tuple[bool, list[str]]:
    """验证产品数据，返回 (是否通过, 错误列表)"""
    errors = []

    sku = data.get("sku", "")
    if not sku or not str(sku).strip():
        errors.append("SKU 不能为空")
    elif len(str(sku)) > 50:
        errors.append("SKU 长度不能超过50个字符")

    name = data.get("name", "")
    if not name or not str(name).strip():
        errors.append("产品名称 不能为空")

    required_numeric_fields = [
        ("length_cm", "长度"),
        ("width_cm", "宽度"),
        ("height_cm", "高度"),
        ("gross_weight_kg", "毛重"),
    ]

    for field, label in required_numeric_fields:
        value = data.get(field)
        if value is None or value == "":
            errors.append(f"{label} 不能为空")
        else:
            try:
                val = float(value)
                if val <= 0:
                    errors.append(f"{label} 必须大于0")
            except (ValueError, TypeError):
                errors.append(f"{label} 必须是有效的数字")

    price = data.get("price")
    if price is not None and price != "":
        try:
            val = float(price)
            if val < 0:
                errors.append("价格 不能为负数")
        except (ValueError, TypeError):
            errors.append("价格 必须是有效的数字")

    stock_quantity = data.get("stock_quantity")
    if stock_quantity is not None and stock_quantity != "":
        try:
            val = int(stock_quantity)
            if val < 0:
                errors.append("库存数量 不能为负数")
        except (ValueError, TypeError):
            errors.append("库存数量 必须是有效的整数")

    return len(errors) == 0, errors


def check_duplicate_sku(session: Session, sku: str, exclude_id: int = None) -> bool:
    """检查 SKU 是否已存在，返回 True 表示存在重复"""
    query = session.query(Product).filter(Product.sku == sku.strip())
    if exclude_id is not None:
        query = query.filter(Product.id != exclude_id)
    return query.first() is not None


def create_product(session: Session, data: dict, auto_convert: bool = True) -> tuple[Product | None, list[str]]:
    """创建产品，返回 (产品对象, 错误列表)
    auto_convert: 是否自动进行单位转换
    """
    is_valid, errors = validate_product_data(data)
    if not is_valid:
        return None, errors

    sku = str(data.get("sku", "")).strip()
    if check_duplicate_sku(session, sku):
        return None, [f"SKU '{sku}' 已存在"]

    # 自动进行单位转换
    product_data = dict(data)
    if auto_convert:
        product_data = convert_product_units(product_data)

    product = Product(
        sku=sku,
        name=str(data.get("name", "")).strip(),
        model=str(data.get("model", "")).strip() if data.get("model") else None,
        specification=str(data.get("specification", "")).strip() if data.get("specification") else None,
        price=float(data.get("price", 0.0)) if data.get("price") is not None else 0.0,
        stock_quantity=int(data.get("stock_quantity", 0)) if data.get("stock_quantity") is not None else 0,
        length_cm=float(data.get("length_cm")),
        width_cm=float(data.get("width_cm")),
        height_cm=float(data.get("height_cm")),
        gross_weight_kg=float(data.get("gross_weight_kg")),
        length_inch=product_data.get("length_inch"),
        width_inch=product_data.get("width_inch"),
        height_inch=product_data.get("height_inch"),
        gross_weight_lb=product_data.get("gross_weight_lb"),
        unit_converted=product_data.get("unit_converted", False),
        converted_at=product_data.get("converted_at"),
        category=str(data.get("category", "")).strip() if data.get("category") else None,
        brand=str(data.get("brand", "")).strip() if data.get("brand") else None,
        supplier=str(data.get("supplier", "")).strip() if data.get("supplier") else None,
        description=str(data.get("description", "")).strip() if data.get("description") else None,
        status=str(data.get("status", "active")).strip(),
    )
    session.add(product)
    session.commit()
    session.refresh(product)
    return product, []


def parse_excel_to_products(file_content: bytes, file_name: str) -> tuple[list[dict], list[dict]]:
    """解析 Excel 文件，返回 (有效数据列表, 错误列表)
    错误列表每项包含: row, sku, errors
    """
    import io
    import pandas as pd

    errors = []
    valid_records = []

    try:
        file_ext = file_name.split(".")[-1].lower()
        if file_ext not in ("xlsx", "xls"):
            return [], [{"row": 0, "sku": "", "errors": ["仅支持 .xlsx 和 .xls 格式文件"]}]

        if file_ext == "xlsx":
            df = pd.read_excel(io.BytesIO(file_content), engine="openpyxl")
        else:
            df = pd.read_excel(io.BytesIO(file_content), engine="xlrd")
    except Exception as e:
        return [], [{"row": 0, "sku": "", "errors": [f"文件解析失败: {str(e)}"]}]

    if df.empty:
        return [], [{"row": 0, "sku": "", "errors": ["Excel 文件为空或没有数据行"]}]

    # 列名映射（支持中文和英文列名）
    column_mapping = {
        "sku": ["sku", "SKU", "产品编码", "商品编码", "编码"],
        "name": ["name", "产品名称", "商品名称", "名称", "品名"],
        "model": ["model", "型号", "产品型号", "商品型号"],
        "specification": ["specification", "规格", "产品规格", "规格参数"],
        "price": ["price", "价格", "单价", "售价", "成本价"],
        "stock_quantity": ["stock_quantity", "库存数量", "库存", "数量", "stock", "库存量"],
        "length_cm": ["length_cm", "长度(cm)", "长度", "长", "长(cm)", "长cm"],
        "width_cm": ["width_cm", "宽度(cm)", "宽度", "宽", "宽(cm)", "宽cm"],
        "height_cm": ["height_cm", "高度(cm)", "高度", "高", "高(cm)", "高cm"],
        "gross_weight_kg": ["gross_weight_kg", "毛重(kg)", "重量(kg)", "重量", "毛重", "净重", "毛重（KG）"],
        "category": ["category", "分类", "产品分类", "类别", "品类"],
        "brand": ["brand", "品牌", "产品品牌"],
        "supplier": ["supplier", "供应商", "供货商", "厂商"],
        "description": ["description", "描述", "产品描述", "备注", "说明"],
    }

    # 自动匹配列
    matched_columns = {}

    for field, candidates in column_mapping.items():
        for col in df.columns:
            col_str = str(col).strip()
            if col_str in candidates:
                matched_columns[field] = col_str
                break

    # 检查必填列（模板文件只有 sku/length_cm/width_cm/height_cm/gross_weight_kg，name 允许为空并用 sku 填充）
    required_fields = ["sku", "length_cm", "width_cm", "height_cm", "gross_weight_kg"]
    missing_columns = [f for f in required_fields if f not in matched_columns]
    if missing_columns:
        return [], [{"row": 0, "sku": "", "errors": [f"缺少必填列: {', '.join(missing_columns)}，请检查表头名称"]}]

    for idx, row in df.iterrows():
        row_num = int(idx) + 2  # Excel 行号（从1开始，第1行是表头，所以+2）

        record = {}
        for field, col_name in matched_columns.items():
            value = row.get(col_name)
            if pd.isna(value):
                record[field] = None
            else:
                record[field] = value

        # 模板文件没有 name 列时，使用 sku 作为产品名称
        if record.get("name") is None and record.get("sku") is not None:
            record["name"] = str(record.get("sku")).strip()

        is_valid, row_errors = validate_product_data(record)
        sku = str(record.get("sku", "")).strip()

        if not is_valid:
            errors.append({"row": row_num, "sku": sku, "errors": row_errors})
        else:
            valid_records.append(record)

    return valid_records, errors


def bulk_create_products(session: Session, records: list[dict]) -> tuple[int, list[dict]]:
    """批量创建产品，返回 (成功数量, 失败记录列表)
    失败记录包含: sku, errors
    """
    success_count = 0
    failed_records = []

    # 先检查所有 SKU 的重复情况
    all_skus = [str(r.get("sku", "")).strip() for r in records if r.get("sku")]
    duplicate_skus = set()
    seen = set()
    for sku in all_skus:
        if sku in seen:
            duplicate_skus.add(sku)
        seen.add(sku)

    # 检查数据库中是否已存在
    existing_skus = set()
    if all_skus:
        from sqlalchemy import func
        existing = session.query(Product.sku).filter(
            func.lower(Product.sku).in_([s.lower() for s in all_skus])
        ).all()
        existing_skus = {s[0].lower() for s in existing}

    for record in records:
        sku = str(record.get("sku", "")).strip()

        if sku in duplicate_skus:
            failed_records.append({"sku": sku, "errors": [f"Excel 文件中 SKU '{sku}' 存在重复"]})
            continue

        if sku.lower() in existing_skus:
            failed_records.append({"sku": sku, "errors": [f"SKU '{sku}' 在系统中已存在"]})
            continue

        product, errors = create_product(session, record, auto_convert=True)
        if product:
            success_count += 1
            existing_skus.add(sku.lower())
        else:
            failed_records.append({"sku": sku, "errors": errors})

    return success_count, failed_records


def convert_all_products(session: Session) -> tuple[int, list[str]]:
    """
    批量转换所有未转换单位的产品
    返回 (转换成功数量, 错误列表)
    """
    from datetime import datetime

    products = session.query(Product).filter(Product.unit_converted == False).all()
    success_count = 0
    errors = []

    for product in products:
        try:
            data = {
                "length_cm": product.length_cm,
                "width_cm": product.width_cm,
                "height_cm": product.height_cm,
                "gross_weight_kg": product.gross_weight_kg,
            }
            converted = convert_product_units(data)

            product.length_inch = converted.get("length_inch")
            product.width_inch = converted.get("width_inch")
            product.height_inch = converted.get("height_inch")
            product.gross_weight_lb = converted.get("gross_weight_lb")
            product.unit_converted = True
            product.converted_at = datetime.now()

            success_count += 1
        except Exception as e:
            errors.append(f"SKU {product.sku} 转换失败: {str(e)}")

    if success_count > 0:
        session.commit()

    return success_count, errors


def get_product_with_converted(session: Session, sku: str) -> dict | None:
    """获取产品完整信息（包含原始单位和转换后单位）"""
    product = get_product_by_sku(session, sku)
    if not product:
        return None

    return {
        "id": product.id,
        "sku": product.sku,
        "name": product.name,
        "model": product.model,
        "specification": product.specification,
        "price": product.price,
        "stock_quantity": product.stock_quantity,
        "original": {
            "length_cm": product.length_cm,
            "width_cm": product.width_cm,
            "height_cm": product.height_cm,
            "gross_weight_kg": product.gross_weight_kg,
        },
        "converted": {
            "length_inch": product.length_inch,
            "width_inch": product.width_inch,
            "height_inch": product.height_inch,
            "gross_weight_lb": product.gross_weight_lb,
        } if product.unit_converted else None,
        "unit_converted": product.unit_converted,
        "converted_at": product.converted_at.isoformat() if product.converted_at else None,
        "category": product.category,
        "brand": product.brand,
        "supplier": product.supplier,
        "description": product.description,
        "status": product.status,
        "created_at": product.created_at.isoformat() if product.created_at else None,
        "updated_at": product.updated_at.isoformat() if product.updated_at else None,
    }
