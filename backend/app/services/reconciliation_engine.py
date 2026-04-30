"""
对账引擎服务

实现高效的批量比对算法，支持10万级订单数据。
核心思路：
1. 使用字典索引加速查找（O(1) vs O(n)）
2. 批量计算系统运费
3. 逐字段比对差异
"""
import json
from datetime import datetime
from typing import Iterator
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.orm import Session

from app.models.models import (
    ReconciliationBatch, ReconciliationDetail, ReconciliationDiffType,
    Product, Carrier, ZoneMapping
)
from app.services.shipping_calculator import calculate_shipping
from app.services.zone_service import get_zone
from app.utils.unit_converter import kg_to_lbs, cm_to_inch


def _round2(value: float | None) -> float | None:
    """精确到小数点后两位"""
    if value is None:
        return None
    return float(Decimal(str(value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))


def _calc_surcharge_total(record: dict) -> float:
    """计算账单中的附加费总和"""
    surcharge_fields = [
        'fuel', 'ahs_dim', 'ahs_weight', 'ahs_packaging', 'oversize',
        'non_mach', 'signature', 'adc', 'das', 'extend', 'das_remote',
        'unauthorized', 'residential',
    ]
    total = 0.0
    for field in surcharge_fields:
        val = record.get(field)
        if val:
            total += val
    return total


def _extract_warehouse_code(warehouse_str: str | None) -> str:
    """从发货仓字符串提取仓库代码"""
    if not warehouse_str:
        return "CA"
    wh = warehouse_str.upper()
    if "NJ" in wh or "IND" in wh:
        return "NJ"
    if "TX" in wh or "DAL" in wh:
        return "TX"
    if "SC" in wh or "SAV" in wh or "PRO" in wh:
        return "SAV"
    return "CA"


def _find_carrier_in_memory(carrier_name: str, carriers_dict: dict[int, Carrier]) -> Carrier | None:
    """根据名称在内存字典中查找物流商（O(1) 性能）"""
    if not carrier_name:
        return None
    name_upper = carrier_name.upper()

    # 映射关系（硬编码名称匹配）
    target_name = None
    if "FEDEX" in name_upper and "ECONOMY" not in name_upper:
        target_name = "商仓 FedEx Ground&HD"
    elif "ECONOMY" in name_upper or "GROUND_ECONOMY" in name_upper:
        target_name = "商仓 FDX Ground Economy"
    elif "AMAZON" in name_upper:
        target_name = "商仓 Amazon Shipping"

    if target_name:
        for c in carriers_dict.values():
            if c.name == target_name:
                return c

    # 模糊匹配
    for c in carriers_dict.values():
        if c.name.split()[-1].upper() in name_upper:
            return c
    return None


def _find_product_in_memory(sku: str, products_dict: dict[str, Product]) -> Product | None:
    """根据 SKU 在内存字典中查找产品（O(1) 性能）"""
    if not sku:
        return None
    return products_dict.get(sku)


def _normalize_zip(zip_code: str | None) -> str:
    """标准化邮编（取前5位）"""
    if not zip_code:
        return ""
    z = str(zip_code).strip().replace("-", "")
    return z[:5]


def compare_record(
    session: Session,
    record: dict,
    carriers_dict: dict[int, Carrier] | None = None,
    products_dict: dict[str, Product] | None = None,
    zones_dict: dict[tuple[str, str], int] | None = None,
    base_rates_dict: dict[tuple[int, int, int], float] | None = None,
    surcharge_configs_dict: dict[tuple[int, str, str], float] | None = None,
) -> dict:
    """
    单条记录比对。
    返回包含 file_*, sys_* 和 diff 信息的字典。

    性能优化版本：支持传入预加载的字典数据，避免N+1查询。
    当字典为None时，回退到数据库查询（向后兼容）。
    """
    result = {
        'row_no': record['row_no'],
        'file_order_no': record.get('remark1') or record.get('tracking_no'),
        'file_tracking_no': record.get('tracking_no'),
        'file_sku': record.get('sku'),
        'file_carrier': record.get('carrier'),
        'file_service': record.get('service'),
        'file_total_amount': _round2(record.get('total_amount')),
        'file_base_amount': _round2(record.get('base_amount')),
        'file_qty': record.get('qty'),
        'file_weight_lb': _round2(record.get('weight_lb')),
        'file_dim_weight_lb': _round2(record.get('dim_weight_lb')),
        'file_billed_weight': _round2(record.get('billed_weight')),
        'file_warehouse': record.get('warehouse'),
        'file_zip_code': _normalize_zip(record.get('zip_code')),
        'file_zone': record.get('zone'),
        'file_ship_date': record.get('ship_date'),
        'file_store': record.get('store'),
        'file_order_type': record.get('order_type'),
        'sys_total_amount': None,
        'sys_base_amount': None,
        'sys_weight_lb': None,
        'sys_dim_weight_lb': None,
        'sys_billed_weight': None,
        'sys_zone': None,
        'has_diff': False,
        'diff_types': [],
        'diff_amount': 0.0,
        'diff_details': {},
    }

    # 查找产品（优先内存查找）
    if products_dict is not None:
        product = _find_product_in_memory(record.get('sku'), products_dict)
    else:
        # 向后兼容：直接查询数据库
        product = session.query(Product).filter(Product.sku == record.get('sku')).first() if record.get('sku') else None

    if not product:
        result['has_diff'] = True
        result['diff_types'].append(ReconciliationDiffType.MISSING_IN_SYSTEM)
        result['diff_details']['missing_product'] = f"SKU {record.get('sku')} 在系统中不存在"
        return result

    # 查找物流商（优先内存查找）
    if carriers_dict is not None:
        carrier = _find_carrier_in_memory(record.get('carrier'), carriers_dict)
    else:
        # 向后兼容
        carrier = None
        if record.get('carrier'):
            name_upper = record.get('carrier').upper()
            if "FEDEX" in name_upper and "ECONOMY" not in name_upper:
                carrier = session.query(Carrier).filter(Carrier.name == "商仓 FedEx Ground&HD").first()
            elif "ECONOMY" in name_upper or "GROUND_ECONOMY" in name_upper:
                carrier = session.query(Carrier).filter(Carrier.name == "商仓 FDX Ground Economy").first()
            elif "AMAZON" in name_upper:
                carrier = session.query(Carrier).filter(Carrier.name == "商仓 Amazon Shipping").first()

    if not carrier:
        result['has_diff'] = True
        result['diff_types'].append(ReconciliationDiffType.CARRIER_MISMATCH)
        result['diff_details']['carrier'] = f"物流商 {record.get('carrier')} 无法匹配"
        # 仍然继续计算，使用默认逻辑

    # 提取仓库和邮编
    warehouse = _extract_warehouse_code(record.get('warehouse'))
    zip_code = _normalize_zip(record.get('zip_code'))

    # 计算系统数据
    length_inch = cm_to_inch(product.length_cm)
    width_inch = cm_to_inch(product.width_cm)
    height_inch = cm_to_inch(product.height_cm)
    actual_weight_lb = kg_to_lbs(product.gross_weight_kg)

    result['sys_weight_lb'] = _round2(actual_weight_lb)

    if carrier:
        # 计算体积重和计费重
        volume_cubic_inch = length_inch * width_inch * height_inch
        # 除零保护：dim_factor不应为0，但增加防御性检查
        dim_factor = getattr(carrier, 'dim_factor', None)
        if not dim_factor or dim_factor <= 0:
            dim_factor = 139.0  # 使用行业标准默认值
        dim_weight = volume_cubic_inch / dim_factor
        billed_weight = max(actual_weight_lb, dim_weight)
        import math
        billed_weight_int = math.ceil(billed_weight)

        result['sys_dim_weight_lb'] = _round2(dim_weight)
        result['sys_billed_weight'] = billed_weight_int

        # 查 Zone（优先内存查找）
        zone = None
        if zones_dict is not None:
            zone = zones_dict.get((warehouse, zip_code[:3]))
        else:
            zone = get_zone(session, warehouse, zip_code)
        if zone:
            result['sys_zone'] = zone

        # 计算系统运费（如果重量在范围内）
        if billed_weight_int <= carrier.max_weight_lb:
            from app.services.rate_service import get_base_rate
            from app.services.surcharge_service import evaluate_surcharges

            # 基础费率（优先内存查找）
            base_rate = None
            if base_rates_dict is not None:
                base_rate = base_rates_dict.get((carrier.id, billed_weight_int, zone or 2))
            else:
                base_rate = get_base_rate(session, carrier.id, billed_weight_int, zone or 2)

            if base_rate:
                result['sys_base_amount'] = _round2(base_rate)

                # 附加费（优先内存查找）
                if surcharge_configs_dict is not None:
                    highest_surcharge, dar_fee, non_mach = _evaluate_surcharges_in_memory(
                        carrier.id, zone or 2,
                        length_inch, width_inch, height_inch, actual_weight_lb,
                        surcharge_configs_dict,
                    )
                else:
                    surcharge_result = evaluate_surcharges(
                        session, carrier.id, zone or 2,
                        length_inch, width_inch, height_inch, actual_weight_lb,
                        carrier.name,
                    )
                    highest_surcharge = surcharge_result['highest_surcharge']
                    dar_fee = surcharge_result['dar_surcharge']
                    non_mach = surcharge_result['non_mach_surcharge']

                # 住宅附加费
                residential_fee = 0.0
                is_residential = record.get('residential') is not None and record.get('residential') > 0
                if is_residential and carrier.has_residential_fee:
                    residential_fee = carrier.residential_fee

                # 偏远附加费（优先内存查找）
                remote_fee = 0.0
                remote_type = None
                if record.get('das_remote'):
                    remote_type = 'Remote_DAS'
                elif record.get('extend'):
                    remote_type = 'Extended_DAS'
                elif record.get('das'):
                    remote_type = 'DAS'

                if remote_type:
                    if surcharge_configs_dict is not None:
                        zone_group = _resolve_zone_group(zone or 2)
                        remote_fee = surcharge_configs_dict.get((carrier.id, remote_type, zone_group), 0.0)
                        if remote_fee == 0.0 and (zone or 2) >= 5:
                            remote_fee = surcharge_configs_dict.get((carrier.id, remote_type, "5+"), 0.0)
                        if remote_fee == 0.0:
                            remote_fee = surcharge_configs_dict.get((carrier.id, remote_type, "all"), 0.0)
                    else:
                        from app.services.surcharge_service import get_surcharge_amount
                        remote_fee = get_surcharge_amount(session, carrier.id, remote_type, zone or 2)

                # 燃油费（fuel_rate可能为None，增加保护）
                fuel_rate = getattr(carrier, 'fuel_rate', 0.0) or 0.0
                fuel_fee = (base_rate + highest_surcharge) * fuel_rate

                # 系统总价
                sys_total = base_rate + highest_surcharge + residential_fee + remote_fee + dar_fee + non_mach + fuel_fee
                result['sys_total_amount'] = _round2(sys_total)

                # 不含燃油费的总价
                sys_total_without_fuel = base_rate + highest_surcharge + residential_fee + remote_fee + dar_fee + non_mach
                result['sys_total_without_fuel'] = _round2(sys_total_without_fuel)

    # ===== 差异比对 =====
    diffs = {}

    # 1. 金额差异
    if result['file_total_amount'] is not None and result['sys_total_amount'] is not None:
        amount_diff = abs(result['file_total_amount'] - result['sys_total_amount'])
        if amount_diff > 0.01:
            diffs['amount'] = {
                'file': result['file_total_amount'],
                'system': result['sys_total_amount'],
                'diff': _round2(amount_diff),
            }
            result['diff_amount'] = _round2(amount_diff)

    # 2. 基础运费差异
    if result['file_base_amount'] is not None and result['sys_base_amount'] is not None:
        base_diff = abs(result['file_base_amount'] - result['sys_base_amount'])
        if base_diff > 0.01:
            diffs['base_amount'] = {
                'file': result['file_base_amount'],
                'system': result['sys_base_amount'],
                'diff': _round2(base_diff),
            }

    # 3. 重量差异
    if result['file_weight_lb'] is not None and result['sys_weight_lb'] is not None:
        weight_diff = abs(result['file_weight_lb'] - result['sys_weight_lb'])
        if weight_diff > 0.1:
            diffs['weight'] = {
                'file': result['file_weight_lb'],
                'system': result['sys_weight_lb'],
                'diff': _round2(weight_diff),
            }

    # 4. 计费重差异
    if result['file_billed_weight'] is not None and result['sys_billed_weight'] is not None:
        bw_diff = abs(result['file_billed_weight'] - result['sys_billed_weight'])
        if bw_diff > 0.1:
            diffs['billed_weight'] = {
                'file': result['file_billed_weight'],
                'system': result['sys_billed_weight'],
                'diff': _round2(bw_diff),
            }

    # 5. Zone 差异
    if result['file_zone'] is not None and result['sys_zone'] is not None:
        try:
            file_zone = int(result['file_zone'])
            if file_zone != result['sys_zone']:
                diffs['zone'] = {
                    'file': file_zone,
                    'system': result['sys_zone'],
                }
        except (ValueError, TypeError):
            pass

    # 6. 附加费差异分析
    file_surcharge_total = _calc_surcharge_total(record)
    if file_surcharge_total > 0 and result['sys_total_amount'] and result['sys_base_amount']:
        sys_surcharge = result['sys_total_amount'] - result['sys_base_amount']
        surcharge_diff = abs(file_surcharge_total - sys_surcharge)
        if surcharge_diff > 0.5:
            diffs['surcharge'] = {
                'file': _round2(file_surcharge_total),
                'system': _round2(sys_surcharge),
                'diff': _round2(surcharge_diff),
            }

    # 汇总差异
    if diffs:
        result['has_diff'] = True
        result['diff_details'] = diffs

        # 映射差异类型
        type_mapping = {
            'amount': ReconciliationDiffType.AMOUNT_MISMATCH,
            'base_amount': ReconciliationDiffType.BASE_AMOUNT_MISMATCH,
            'weight': ReconciliationDiffType.WEIGHT_MISMATCH,
            'billed_weight': ReconciliationDiffType.BILLED_WEIGHT_MISMATCH,
            'zone': ReconciliationDiffType.ZONE_MISMATCH,
            'surcharge': ReconciliationDiffType.SURCHARGE_MISMATCH,
        }
        for key in diffs:
            if key in type_mapping:
                result['diff_types'].append(type_mapping[key])

    return result


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


def _evaluate_surcharges_in_memory(
    carrier_id: int,
    zone: int,
    length_inch: float,
    width_inch: float,
    height_inch: float,
    actual_weight_lb: float,
    surcharge_configs_dict: dict[tuple[int, str, str], float],
) -> tuple[float, float, float]:
    """
    在内存中计算附加费，返回 (最高附加费, DAR费, NonMach费)。
    """
    details = {}
    dims = sorted([length_inch, width_inch, height_inch], reverse=True)
    longest = dims[0]
    second_longest = dims[1] if len(dims) > 1 else 0
    third = dims[2] if len(dims) > 2 else 0
    volume_cubic_inch = length_inch * width_inch * height_inch
    girth = longest + 2 * (second_longest + third)
    zone_group = _resolve_zone_group(zone)

    # AHS-Dim
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
        details["AHS-Dim"] = surcharge_configs_dict.get((carrier_id, "AHS-Dim", zone_group), 0.0)

    # AHS-Weight
    if actual_weight_lb > 50:
        details["AHS-Weight"] = surcharge_configs_dict.get((carrier_id, "AHS-Weight", zone_group), 0.0)

    # AHS-Packaging
    details["AHS-Packaging"] = surcharge_configs_dict.get((carrier_id, "AHS-Packaging", zone_group), 0.0)

    # AHS-NonStandard
    details["AHS-NonStandard"] = surcharge_configs_dict.get((carrier_id, "AHS-NonStandard", zone_group), 0.0)

    # Oversize
    oversize_triggered = False
    if longest > 96 and longest <= 108:
        oversize_triggered = True
    if girth > 130:
        oversize_triggered = True
    if volume_cubic_inch > 17280:
        oversize_triggered = True
    if oversize_triggered:
        details["Oversize"] = surcharge_configs_dict.get((carrier_id, "Oversize", zone_group), 0.0)

    # 四类互斥附加费取最高
    mutually_exclusive = ["AHS-Dim", "AHS-Weight", "AHS-Packaging", "Oversize", "AHS-NonStandard"]
    highest_amount = 0.0
    for st in mutually_exclusive:
        amt = details.get(st, 0.0)
        if amt > highest_amount:
            highest_amount = amt

    # DAR + Non-Mach
    dar_fee = surcharge_configs_dict.get((carrier_id, "DAR", zone_group), 0.0)
    non_mach = surcharge_configs_dict.get((carrier_id, "USPS_NonMach", zone_group), 0.0)

    return highest_amount, dar_fee, non_mach


def run_reconciliation(
    session: Session,
    batch: ReconciliationBatch,
    records: Iterator[dict],
) -> dict:
    """
    执行批量对账。
    返回统计信息。

    性能优化：预加载所有参考数据到内存字典，避免N+1查询。
    """
    total = 0
    matched = 0
    diff_count = 0
    details_to_add = []

    # ── 预加载所有参考数据到内存（关键性能优化）──
    from app.models.models import BaseRate, SurchargeConfig

    # 1. 物流商和产品（已有）
    carriers_dict = {c.id: c for c in session.query(Carrier).all()}
    products_dict = {p.sku: p for p in session.query(Product).all()}

    # 2. Zone映射: (warehouse, zip_prefix) -> zone
    zones_dict = {
        (zm.warehouse.upper(), zm.zip_prefix): zm.zone
        for zm in session.query(ZoneMapping).all()
    }

    # 3. 基础费率: (carrier_id, weight_lb, zone) -> rate
    base_rates_dict = {
        (br.carrier_id, br.weight_lb, br.zone): br.rate
        for br in session.query(BaseRate).all()
    }

    # 4. 附加费配置: (carrier_id, surcharge_type, zone_group) -> amount
    surcharge_configs_dict = {
        (sc.carrier_id, sc.surcharge_type, sc.zone_group): sc.amount
        for sc in session.query(SurchargeConfig).all()
    }

    for record in records:
        total += 1
        result = compare_record(
            session, record,
            carriers_dict=carriers_dict,
            products_dict=products_dict,
            zones_dict=zones_dict,
            base_rates_dict=base_rates_dict,
            surcharge_configs_dict=surcharge_configs_dict,
        )

        detail = ReconciliationDetail(
            batch_id=batch.id,
            row_no=result['row_no'],
            file_order_no=result['file_order_no'],
            file_tracking_no=result['file_tracking_no'],
            file_sku=result['file_sku'],
            file_carrier=result['file_carrier'],
            file_service=result['file_service'],
            file_total_amount=result['file_total_amount'],
            file_base_amount=result['file_base_amount'],
            file_qty=result['file_qty'],
            file_weight_lb=result['file_weight_lb'],
            file_dim_weight_lb=result['file_dim_weight_lb'],
            file_billed_weight=result['file_billed_weight'],
            file_warehouse=result['file_warehouse'],
            file_zip_code=result['file_zip_code'],
            file_zone=result['file_zone'],
            file_ship_date=result['file_ship_date'],
            file_store=result['file_store'],
            file_order_type=result['file_order_type'],
            sys_total_amount=result['sys_total_amount'],
            sys_base_amount=result['sys_base_amount'],
            sys_weight_lb=result['sys_weight_lb'],
            sys_dim_weight_lb=result['sys_dim_weight_lb'],
            sys_billed_weight=result['sys_billed_weight'],
            sys_zone=result['sys_zone'],
            has_diff=result['has_diff'],
            diff_types=json.dumps(result['diff_types'], ensure_ascii=False),
            diff_amount=result['diff_amount'],
            diff_details=json.dumps(result['diff_details'], ensure_ascii=False),
        )
        details_to_add.append(detail)

        if result['has_diff']:
            diff_count += 1
        else:
            matched += 1

        # 每 500 条批量提交一次
        if len(details_to_add) >= 500:
            session.bulk_save_objects(details_to_add)
            session.commit()
            details_to_add = []

    # 提交剩余
    if details_to_add:
        session.bulk_save_objects(details_to_add)
        session.commit()

    # 更新批次状态
    batch.total_records = total
    batch.matched_records = matched
    batch.diff_records = diff_count
    batch.status = "completed"
    batch.completed_at = datetime.now()
    session.commit()

    return {
        'total': total,
        'matched': matched,
        'diff': diff_count,
        'batch_id': batch.id,
    }
