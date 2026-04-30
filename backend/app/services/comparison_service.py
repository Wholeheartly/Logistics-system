"""
多渠道并行比价服务

对所有可用渠道并行计算运费，按总费用升序排列。
"""
from sqlalchemy.orm import Session

from app.models.models import Product, Carrier
from app.services.product_service import get_product_by_sku
from app.services.shipping_calculator import calculate_shipping
from app.services.cg_calculator import calculate_cg_shipping


def compare_all_carriers(
    session: Session,
    sku: str,
    zip_code: str,
    warehouse: str = "CA",
    is_residential: bool = False,
) -> dict:
    """
    对指定 SKU 和邮编，计算所有渠道的预估运费并排序。

    返回:
    {
        "sku": str,
        "product": { ... },
        "warehouse": str,
        "zip_code": str,
        "results": [...],   # 按 total 升序
        "cheapest": { ... }, # 最便宜的
        "errors": [...],     # 不可用的渠道及原因
    }
    """
    product = get_product_by_sku(session, sku)
    if not product:
        return {"error": f"未找到 SKU: {sku}"}

    carriers = session.query(Carrier).all()
    results = []
    errors = []

    for carrier in carriers:
        result = calculate_shipping(
            session, carrier, product, zip_code, warehouse, is_residential
        )
        if result is None:
            errors.append({
                "carrier_name": carrier.name,
                "reason": "计费重超限、无对应 Zone 或基础运费表中无数据",
            })
        else:
            results.append(result)

    # 计算 CG (CastleGate) 一口价
    cg_result = calculate_cg_shipping(product, is_residential)
    if cg_result is None:
        errors.append({
            "carrier_name": "CG (CastleGate) Multichannel",
            "reason": "产品尺寸/重量超出 CG 可发货范围",
        })
    else:
        results.append(cg_result)

    # 按总费用升序
    results.sort(key=lambda r: r["total"])

    # 标记最便宜的 1-2 个
    if results:
        results[0]["is_cheapest"] = True
        if len(results) > 1:
            results[1]["is_cheapest"] = True

    return {
        "sku": sku,
        "product": {
            "sku": product.sku,
            "length_cm": product.length_cm,
            "width_cm": product.width_cm,
            "height_cm": product.height_cm,
            "gross_weight_kg": product.gross_weight_kg,
        },
        "warehouse": warehouse,
        "zip_code": zip_code,
        "is_residential": is_residential,
        "results": results,
        "errors": errors,
    }
