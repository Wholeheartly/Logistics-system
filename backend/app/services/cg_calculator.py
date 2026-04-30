"""
CastleGate (CG) 一口价运费计算服务

CG 的计费方式与其他物流商不同：
- 不按 Zone 计费（全国统一价）
- 按产品类别 + 重量计费: Base Rate + (weight - 1) × $/LB
- 需要先将产品匹配到 CG 的类别体系

CG 类别体系（US Multichannel Pick & Ship）:
├─ Bin
│  ├─ Single Pick (1 Carton): Base $12.57, $0.15/lb, 0-25 lbs
│  ├─ Small: Base $12.35, $0.17/lb, 0-25 lbs, max 19"×12"×6"
│  ├─ Large: Base $15.10, $0.17/lb, 0-25 lbs, max 26"×17"×14"
│  └─ Heavy: Base $15.42, $0.17/lb, 25-50 lbs, max 26"×17"×14"
├─ Standard
│  ├─ Small: Base $17.05, $0.20/lb, 0-50 lbs, max 48"×30"×30", L+Girth≤105"
│  ├─ Medium: Base $23.78, $0.24/lb, 0-110 lbs, max 96" L, L+Girth≤130"
│  ├─ Large: Base $49.83, $0.31/lb, 0-120 lbs, max 108" L, L+Girth≤165"
│  └─ Oversize: Base $52.43, $0.34/lb, 0-150 lbs, max 108" L, L+Girth≤165"
└─ Rugs
   ├─ Small: Base $16.91, $0.22/lb, 0-25 lbs, max 24" L
   ├─ Medium: Base $36.13, $0.24/lb, 0-150 lbs, max 96" L
   └─ Large: Base $51.10, $0.30/lb, 0-150 lbs, max 108" L
"""
from sqlalchemy.orm import Session
from app.models.models import Product
from app.utils.unit_converter import kg_to_lbs, cm_to_inch, round_up


# CG US Multichannel Pick & Ship 费率表
CG_RATES = {
    "Bin-SinglePick": {"base": 12.57, "per_lb": 0.15, "min_weight": 0, "max_weight": 25, "max_dims": None},
    "Bin-Small": {"base": 12.35, "per_lb": 0.17, "min_weight": 0, "max_weight": 25, "max_dims": (19, 12, 6)},
    "Bin-Large": {"base": 15.10, "per_lb": 0.17, "min_weight": 0, "max_weight": 25, "max_dims": (26, 17, 14)},
    "Bin-Heavy": {"base": 15.42, "per_lb": 0.17, "min_weight": 25, "max_weight": 50, "max_dims": (26, 17, 14)},
    "Standard-Small": {"base": 17.05, "per_lb": 0.20, "min_weight": 0, "max_weight": 50, "max_dims": (48, 30, 30), "max_length": 48, "max_girth": 105},
    "Standard-Medium": {"base": 23.78, "per_lb": 0.24, "min_weight": 0, "max_weight": 110, "max_length": 96, "max_girth": 130},
    "Standard-Large": {"base": 49.83, "per_lb": 0.31, "min_weight": 0, "max_weight": 120, "max_length": 108, "max_girth": 165},
    "Standard-Oversize": {"base": 52.43, "per_lb": 0.34, "min_weight": 0, "max_weight": 150, "max_length": 108, "max_girth": 165},
    "Rugs-Small": {"base": 16.91, "per_lb": 0.22, "min_weight": 0, "max_weight": 25, "max_length": 24},
    "Rugs-Medium": {"base": 36.13, "per_lb": 0.24, "min_weight": 0, "max_weight": 150, "max_length": 96},
    "Rugs-Large": {"base": 51.10, "per_lb": 0.30, "min_weight": 0, "max_weight": 150, "max_length": 108},
}


def _fits_bin_small(length_inch: float, width_inch: float, height_inch: float, weight_lb: float) -> bool:
    """检查是否符合 Bin-Small 尺寸"""
    if weight_lb > 25:
        return False
    dims = sorted([length_inch, width_inch, height_inch], reverse=True)
    return dims[0] <= 19 and dims[1] <= 12 and dims[2] <= 6


def _fits_bin_large(length_inch: float, width_inch: float, height_inch: float, weight_lb: float) -> bool:
    """检查是否符合 Bin-Large 尺寸"""
    if weight_lb > 25:
        return False
    dims = sorted([length_inch, width_inch, height_inch], reverse=True)
    return dims[0] <= 26 and dims[1] <= 17 and dims[2] <= 14


def _fits_bin_heavy(length_inch: float, width_inch: float, height_inch: float, weight_lb: float) -> bool:
    """检查是否符合 Bin-Heavy 尺寸"""
    if weight_lb < 25 or weight_lb > 50:
        return False
    dims = sorted([length_inch, width_inch, height_inch], reverse=True)
    return dims[0] <= 26 and dims[1] <= 17 and dims[2] <= 14


def _fits_standard_small(length_inch: float, width_inch: float, height_inch: float, weight_lb: float) -> bool:
    """检查是否符合 Standard-Small 尺寸"""
    if weight_lb > 50:
        return False
    dims = sorted([length_inch, width_inch, height_inch], reverse=True)
    longest = dims[0]
    girth = longest + 2 * (dims[1] + dims[2])
    return longest <= 48 and girth <= 105


def _fits_standard_medium(length_inch: float, width_inch: float, height_inch: float, weight_lb: float) -> bool:
    """检查是否符合 Standard-Medium 尺寸"""
    if weight_lb > 110:
        return False
    dims = sorted([length_inch, width_inch, height_inch], reverse=True)
    longest = dims[0]
    girth = longest + 2 * (dims[1] + dims[2])
    return longest <= 96 and girth <= 130


def _fits_standard_large(length_inch: float, width_inch: float, height_inch: float, weight_lb: float) -> bool:
    """检查是否符合 Standard-Large 尺寸"""
    if weight_lb > 120:
        return False
    dims = sorted([length_inch, width_inch, height_inch], reverse=True)
    longest = dims[0]
    girth = longest + 2 * (dims[1] + dims[2])
    return longest <= 108 and girth <= 165


def _fits_standard_oversize(length_inch: float, width_inch: float, height_inch: float, weight_lb: float) -> bool:
    """检查是否符合 Standard-Oversize 尺寸"""
    if weight_lb > 150:
        return False
    dims = sorted([length_inch, width_inch, height_inch], reverse=True)
    longest = dims[0]
    girth = longest + 2 * (dims[1] + dims[2])
    return longest <= 108 and girth <= 165


def _fits_rugs_small(length_inch: float, width_inch: float, height_inch: float, weight_lb: float) -> bool:
    """检查是否符合 Rugs-Small 尺寸（地毯类：扁平，高度很小）"""
    if weight_lb > 25:
        return False
    dims = sorted([length_inch, width_inch, height_inch], reverse=True)
    # Rugs 是扁平产品，高度通常很小（<= 3 英寸）
    if dims[2] > 3:
        return False
    return dims[0] <= 24


def _fits_rugs_medium(length_inch: float, width_inch: float, height_inch: float, weight_lb: float) -> bool:
    """检查是否符合 Rugs-Medium 尺寸（地毯类：扁平，高度很小）"""
    if weight_lb > 150:
        return False
    dims = sorted([length_inch, width_inch, height_inch], reverse=True)
    if dims[2] > 3:
        return False
    return dims[0] <= 96


def _fits_rugs_large(length_inch: float, width_inch: float, height_inch: float, weight_lb: float) -> bool:
    """检查是否符合 Rugs-Large 尺寸（地毯类：扁平，高度很小）"""
    if weight_lb > 150:
        return False
    dims = sorted([length_inch, width_inch, height_inch], reverse=True)
    if dims[2] > 3:
        return False
    return dims[0] <= 108


def classify_cg_category(length_inch: float, width_inch: float, height_inch: float, weight_lb: float) -> str | None:
    """
    根据产品尺寸和重量判断属于 CG 的哪个类别。
    返回类别键名，如果不符合任何类别则返回 None。

    匹配顺序（从小到大）:
    1. Bin-Small -> Bin-Large -> Bin-Heavy
    2. Standard-Small -> Standard-Medium -> Standard-Large -> Standard-Oversize
    3. Rugs-Small -> Rugs-Medium -> Rugs-Large
    """
    # Bin 类别
    if _fits_bin_small(length_inch, width_inch, height_inch, weight_lb):
        return "Bin-Small"
    if _fits_bin_large(length_inch, width_inch, height_inch, weight_lb):
        return "Bin-Large"
    if _fits_bin_heavy(length_inch, width_inch, height_inch, weight_lb):
        return "Bin-Heavy"

    # Standard 类别
    if _fits_standard_small(length_inch, width_inch, height_inch, weight_lb):
        return "Standard-Small"
    if _fits_standard_medium(length_inch, width_inch, height_inch, weight_lb):
        return "Standard-Medium"
    if _fits_standard_large(length_inch, width_inch, height_inch, weight_lb):
        return "Standard-Large"
    if _fits_standard_oversize(length_inch, width_inch, height_inch, weight_lb):
        return "Standard-Oversize"

    # Rugs 类别（需要用户标记或根据产品类型判断，这里作为兜底）
    if _fits_rugs_small(length_inch, width_inch, height_inch, weight_lb):
        return "Rugs-Small"
    if _fits_rugs_medium(length_inch, width_inch, height_inch, weight_lb):
        return "Rugs-Medium"
    if _fits_rugs_large(length_inch, width_inch, height_inch, weight_lb):
        return "Rugs-Large"

    return None


def calculate_cg_shipping(
    product: Product,
    is_residential: bool = False,
) -> dict | None:
    """
    计算 CastleGate Multichannel Pick & Ship 的一口价运费。

    返回 None 表示产品不符合 CG 的发货条件（尺寸/重量超限）。
    """
    length_inch = cm_to_inch(product.length_cm)
    width_inch = cm_to_inch(product.width_cm)
    height_inch = cm_to_inch(product.height_cm)
    actual_weight_lb = kg_to_lbs(product.gross_weight_kg)

    # 判断产品类别
    category = classify_cg_category(length_inch, width_inch, height_inch, actual_weight_lb)
    if category is None:
        return None

    rate_info = CG_RATES[category]

    # 计算计费重（CG 按实际重量向上取整）
    billed_weight_int = round_up(actual_weight_lb)

    # 检查重量是否在范围内
    if billed_weight_int > rate_info["max_weight"]:
        return None

    # 计算运费: Base Rate + (weight - 1) * per_lb
    # 超过 1lb 的部分才按 per_lb 收费
    excess_weight = max(0, billed_weight_int - 1)
    base_freight = rate_info["base"] + excess_weight * rate_info["per_lb"]

    # CG 没有燃油附加费、住宅附加费等额外费用（一口价已包含）
    total = base_freight

    return {
        "carrier_name": "CG (CastleGate) Multichannel",
        "cg_category": category,
        "actual_weight_lb": round(actual_weight_lb, 2),
        "billed_weight_int": billed_weight_int,
        "base_rate": rate_info["base"],
        "per_lb_rate": rate_info["per_lb"],
        "excess_weight": excess_weight,
        "base_freight": round(base_freight, 2),
        "residential_fee": 0.0,
        "remote_fee": 0.0,
        "fuel_fee": 0.0,
        "total": round(total, 2),
        "total_without_fuel": round(total, 2),
        "transit_time": "1-5个工作日",
        "is_cheapest": False,
    }
