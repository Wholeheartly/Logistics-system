"""
单位换算工具
"""

KG_TO_LBS = 2.20462
CM_TO_INCH = 0.393701  # 1cm = 0.393701inch (精确值)


def kg_to_lbs(kg: float) -> float:
    return round(kg * KG_TO_LBS, 2)


def cm_to_inch(cm: float) -> float:
    return round(cm * CM_TO_INCH, 2)


def round_up(value: float) -> int:
    """向上取整"""
    import math
    return math.ceil(value)


def convert_product_units(product_data: dict) -> dict:
    """
    转换产品数据中的单位：cm -> inch, kg -> lb
    返回包含转换后字段的完整数据字典
    """
    result = dict(product_data)

    # 长度单位转换 (cm -> inch)
    for cm_field, inch_field in [
        ("length_cm", "length_inch"),
        ("width_cm", "width_inch"),
        ("height_cm", "height_inch"),
    ]:
        if cm_field in result and result[cm_field] is not None:
            try:
                result[inch_field] = cm_to_inch(float(result[cm_field]))
            except (ValueError, TypeError):
                result[inch_field] = None

    # 重量单位转换 (kg -> lb)
    if "gross_weight_kg" in result and result["gross_weight_kg"] is not None:
        try:
            result["gross_weight_lb"] = kg_to_lbs(float(result["gross_weight_kg"]))
        except (ValueError, TypeError):
            result["gross_weight_lb"] = None

    result["unit_converted"] = True
    from datetime import datetime
    result["converted_at"] = datetime.now()

    return result
