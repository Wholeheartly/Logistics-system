"""
附加费计算服务

附加费互斥规则：AHS-Dim、AHS-Weight、AHS-Packaging、Oversize 四项仅收取最高的，不重复。
"""
from sqlalchemy.orm import Session
from app.models.models import SurchargeConfig


SURCHARGE_TYPES = ["AHS-Dim", "AHS-Weight", "AHS-Packaging", "Oversize", "AHS-NonStandard"]
REMOTE_TYPES = ["DAS", "Extended_DAS", "Remote_DAS"]


def _resolve_zone_group(zone: int) -> str:
    """将 zone 数字映射到配置中的 zone_group"""
    if zone == 2:
        return "2"
    elif zone in (3, 4):
        return "3-4"
    elif zone in (5, 6):
        return "5-6"
    elif zone in (7, 8):
        return "7-8"
    return "all"


def get_surcharge_amount(session: Session, carrier_id: int, surcharge_type: str, zone: int) -> float:
    """获取指定类型的附加费金额"""
    zone_group = _resolve_zone_group(zone)
    # 先精确匹配 zone_group
    config = (
        session.query(SurchargeConfig)
        .filter(
            SurchargeConfig.carrier_id == carrier_id,
            SurchargeConfig.surcharge_type == surcharge_type,
            SurchargeConfig.zone_group == zone_group,
        )
        .first()
    )
    # 尝试 5+ (Amazon Shipping 的特有分组)
    if not config and zone >= 5:
        config = (
            session.query(SurchargeConfig)
            .filter(
                SurchargeConfig.carrier_id == carrier_id,
                SurchargeConfig.surcharge_type == surcharge_type,
                SurchargeConfig.zone_group == "5+",
            )
            .first()
        )
    # 尝试 all
    if not config:
        config = (
            session.query(SurchargeConfig)
            .filter(
                SurchargeConfig.carrier_id == carrier_id,
                SurchargeConfig.surcharge_type == surcharge_type,
                SurchargeConfig.zone_group == "all",
            )
            .first()
        )
    return config.amount if config else 0.0


def evaluate_surcharges(
    session: Session,
    carrier_id: int,
    zone: int,
    length_inch: float,
    width_inch: float,
    height_inch: float,
    actual_weight_lb: float,
    carrier_name: str = "",
) -> dict:
    """
    根据包裹尺寸和重量判断触发哪些附加费, 返回最高附加费及详情。

    返回: {
        "highest_surcharge": float,  # 最高附加费金额
        "highest_type": str,          # 最高附加费类型
        "details": dict,              # 各项附加费金额
        "remote_surcharge": float,    # 偏远附加费（另行计算）
        "dar_surcharge": float,       # DAR（仅 FDX Ground Economy）
        "non_mach_surcharge": float,  # USPS Non-Mach（仅 FDX Ground Economy）
    }
    """
    details = {}
    dims = sorted([length_inch, width_inch, height_inch], reverse=True)
    longest = dims[0]
    second_longest = dims[1] if len(dims) > 1 else 0
    third = dims[2] if len(dims) > 2 else 0
    volume_cubic_inch = length_inch * width_inch * height_inch
    girth = longest + 2 * (second_longest + third)

    # AHS-Dim 触发条件:
    # a) 48in < 最长边 <= 96in
    # b) 第二长边 > 30in
    # c) 最长边 + 2*(第二+第三) > 105in
    # d) 体积 > 10368 cubic inches (部分渠道)
    # e) 重量 > 40lbs (部分渠道)
    ahs_dim_triggered = False
    if longest > 48 and longest <= 96:
        ahs_dim_triggered = True
    if second_longest > 30:
        ahs_dim_triggered = True
    if girth > 105:
        ahs_dim_triggered = True
    if volume_cubic_inch > 10368:
        ahs_dim_triggered = True

    if ahs_dim_triggered:
        details["AHS-Dim"] = get_surcharge_amount(session, carrier_id, "AHS-Dim", zone)

    # AHS-Weight: 50lb < 实重 <= 110lb (Ground&HD) 或 <= 150lb (Amazon)
    if actual_weight_lb > 50:
        details["AHS-Weight"] = get_surcharge_amount(session, carrier_id, "AHS-Weight", zone)

    # AHS-Packaging: 非标准包装（需要人工判断，暂不做自动触发，但保留费率查询能力）
    # 系统提示词: 无外包装/软包装/圆柱形/金属或木材包装触发
    details["AHS-Packaging"] = get_surcharge_amount(session, carrier_id, "AHS-Packaging", zone)

    # AHS-NonStandard (Amazon Shipping)
    details["AHS-NonStandard"] = get_surcharge_amount(session, carrier_id, "AHS-NonStandard", zone)

    # Oversize:
    # a) 96in < 最长边 <= 108in
    # b) 130in < 长+2*(宽+高) (部分渠道)
    # c) 体积 > 17280 cubic inches
    oversize_triggered = False
    if longest > 96 and longest <= 108:
        oversize_triggered = True
    if girth > 130:
        oversize_triggered = True
    if volume_cubic_inch > 17280:
        oversize_triggered = True
    if oversize_triggered:
        details["Oversize"] = get_surcharge_amount(session, carrier_id, "Oversize", zone)

    # 四类互斥附加费取最高
    mutually_exclusive = ["AHS-Dim", "AHS-Weight", "AHS-Packaging", "Oversize", "AHS-NonStandard"]
    highest_type = None
    highest_amount = 0.0
    for st in mutually_exclusive:
        amt = details.get(st, 0.0)
        if amt > highest_amount:
            highest_amount = amt
            highest_type = st

    # 偏远附加费（单独加收，不互斥）
    remote_surcharge = 0.0
    # 具体偏远判定由外部调用方根据邮编表传入

    # DAR (仅 FDX Ground Economy)
    dar_surcharge = get_surcharge_amount(session, carrier_id, "DAR", zone)

    # USPS Non-Mach (仅 FDX Ground Economy)
    non_mach = get_surcharge_amount(session, carrier_id, "USPS_NonMach", zone)

    return {
        "highest_surcharge": highest_amount,
        "highest_type": highest_type,
        "details": details,
        "remote_surcharge": remote_surcharge,
        "dar_surcharge": dar_surcharge,
        "non_mach_surcharge": non_mach,
    }
