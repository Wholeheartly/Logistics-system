"""
单渠道运费计算服务

输入: 产品信息 + 目的邮编 + 发货仓 + 是否住宅地址
输出: 该渠道的预估总费用明细
"""
import math
from sqlalchemy.orm import Session

from app.models.models import Product, Carrier
from app.utils.unit_converter import kg_to_lbs, cm_to_inch, round_up
from app.services.zone_service import get_zone
from app.services.rate_service import get_base_rate
from app.services.surcharge_service import evaluate_surcharges, get_surcharge_amount, REMOTE_TYPES


def calculate_shipping(
    session: Session,
    carrier: Carrier,
    product: Product,
    zip_code: str,
    warehouse: str,
    is_residential: bool = False,
    remote_type: str | None = None,  # "DAS", "Extended_DAS", "Remote_DAS", or None
) -> dict | None:
    """
    计算单个渠道的预估运费。

    返回 None 表示该渠道不可用（如超重、无 Zone 等）。
    """

    # 1. 单位转换
    length_inch = cm_to_inch(product.length_cm)
    width_inch = cm_to_inch(product.width_cm)
    height_inch = cm_to_inch(product.height_cm)
    actual_weight_lb = kg_to_lbs(product.gross_weight_kg)

    # 2. 查 Zone
    zone = get_zone(session, warehouse, zip_code)
    if zone is None:
        return None
    if zone < carrier.zone_min or zone > carrier.zone_max:
        return None

    # 3. 计算计费重
    volume_cubic_inch = length_inch * width_inch * height_inch
    dim_factor = carrier.dim_factor if carrier.dim_factor and carrier.dim_factor > 0 else 139.0
    dim_weight = volume_cubic_inch / dim_factor
    billed_weight = max(actual_weight_lb, dim_weight)
    billed_weight_int = round_up(billed_weight)

    # 检查超限
    if billed_weight_int > carrier.max_weight_lb or billed_weight_int < carrier.min_weight_lb:
        return None

    # 4. 查基础运费
    base_freight = get_base_rate(session, carrier.id, billed_weight_int, zone)
    if base_freight is None:
        return None

    # 5. 附加费
    surcharge_result = evaluate_surcharges(
        session, carrier.id, zone,
        length_inch, width_inch, height_inch, actual_weight_lb,
        carrier.name,
    )
    highest_surcharge = surcharge_result["highest_surcharge"]

    # 6. 偏远附加费
    remote_fee = 0.0
    if remote_type:
        remote_fee = get_surcharge_amount(session, carrier.id, remote_type, zone)

    # 7. 住宅附加费
    residential_fee = 0.0
    if is_residential and carrier.has_residential_fee:
        residential_fee = carrier.residential_fee if carrier.residential_fee is not None else 0.0

    # 8. DAR + Non-Mach (仅 FDX Ground Economy)
    dar_fee = surcharge_result["dar_surcharge"]
    non_mach_fee = surcharge_result["non_mach_surcharge"]

    # 9. 燃油费 = (基础运费 + 最高附加费) × 燃油费率
    fuel_rate = carrier.fuel_rate if carrier.fuel_rate is not None else 0.0
    fuel_fee = (base_freight + highest_surcharge) * fuel_rate

    # 10. 总费用
    total = base_freight + highest_surcharge + residential_fee + remote_fee + dar_fee + non_mach_fee + fuel_fee

    # 11. 不含燃油费的总价
    total_without_fuel = base_freight + highest_surcharge + residential_fee + remote_fee + dar_fee + non_mach_fee

    return {
        "carrier_id": carrier.id,
        "carrier_name": carrier.name,
        "billed_weight_lb": round(billed_weight, 2),
        "billed_weight_int": billed_weight_int,
        "actual_weight_lb": round(actual_weight_lb, 2),
        "dim_weight_lb": round(dim_weight, 2),
        "zone": zone,
        "base_freight": round(base_freight, 2),
        "highest_surcharge": round(highest_surcharge, 2),
        "highest_surcharge_type": surcharge_result["highest_type"],
        "residential_fee": round(residential_fee, 2),
        "remote_fee": round(remote_fee, 2),
        "dar_fee": round(dar_fee, 2),
        "non_mach_fee": round(non_mach_fee, 2),
        "fuel_fee": round(fuel_fee, 2),
        "fuel_rate": fuel_rate,
        "total": round(total, 2),
        "total_without_fuel": round(total_without_fuel, 2),
        "transit_time": carrier.transit_time,
        "is_cheapest": False,
    }
