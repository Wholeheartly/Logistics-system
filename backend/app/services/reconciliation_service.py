"""
订单对账服务
"""
from decimal import Decimal, ROUND_HALF_UP


def round2(amount: float) -> float:
    """保留两位小数"""
    return float(Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def reconcile_single(order: dict) -> dict:
    """
    单条订单对账。

    输入:
    {
        "order_no": str,
        "sku": str,
        "total_goods_price": float,     # 商品总价
        "freight": float,               # 运费
        "tax": float,                   # 税
        "discount": float,              # 折扣
        "platform_subsidy": float,      # 平台补贴
        "buyer_paid": float,           # 买家支付金额
        "platform_fee": float,          # 平台费用
    }
    """
    receivable = (
        order.get("total_goods_price", 0)
        + order.get("freight", 0)
        + order.get("tax", 0)
        - order.get("discount", 0)
        - order.get("platform_subsidy", 0)
    )
    received = order.get("buyer_paid", 0) - order.get("platform_fee", 0)
    diff = receivable - received

    return {
        "order_no": order.get("order_no", ""),
        "sku": order.get("sku", ""),
        "receivable": round2(receivable),
        "received": round2(received),
        "difference": round2(diff),
        "status": "正常" if abs(diff) < 0.01 else "异常",
    }


def reconcile_batch(orders: list[dict]) -> dict:
    """
    批量订单对账。

    返回:
    {
        "results": [...],
        "summary": { "total": int, "normal": int, "abnormal": int, "total_diff": float },
        "missing_fields": [...],  # 缺失的必填字段
    }
    """
    required_fields = [
        "order_no", "total_goods_price", "freight",
        "buyer_paid", "platform_fee",
    ]
    missing = set()
    results = []

    for i, order in enumerate(orders):
        # 检查缺失字段
        missing_in_order = [f for f in required_fields if f not in order or order[f] is None]
        if missing_in_order:
            missing.update(missing_in_order)
            results.append({
                "order_no": order.get("order_no", f"第{i+1}条"),
                "sku": order.get("sku", ""),
                "receivable": 0,
                "received": 0,
                "difference": 0,
                "status": "数据缺失",
                "missing": missing_in_order,
            })
        else:
            results.append(reconcile_single(order))

    normal_count = sum(1 for r in results if r["status"] == "正常")
    abnormal_count = len(results) - normal_count
    total_diff = sum(r["difference"] for r in results if r["status"] != "数据缺失")

    return {
        "results": results,
        "summary": {
            "total": len(results),
            "normal": normal_count,
            "abnormal": abnormal_count,
            "total_diff": round2(total_diff),
        },
        "missing_fields": list(missing),
    }
