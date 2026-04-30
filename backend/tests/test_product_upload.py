"""
产品上传与单位转换模块单元测试
"""
import pytest
from datetime import datetime

from app.utils.unit_converter import (
    kg_to_lbs, cm_to_inch, convert_product_units,
    KG_TO_LBS, CM_TO_INCH,
)
from app.services.product_service import validate_product_data, check_duplicate_sku


# ========== 单位转换工具测试 ==========

class TestUnitConverter:
    """测试单位转换核心功能"""

    def test_kg_to_lbs_basic(self):
        """测试千克到磅的基本转换"""
        result = kg_to_lbs(1.0)
        expected = round(1.0 * KG_TO_LBS, 2)
        assert result == expected
        assert result == 2.2

    def test_kg_to_lbs_zero(self):
        """测试0千克转换"""
        result = kg_to_lbs(0)
        assert result == 0.0

    def test_kg_to_lbs_precision(self):
        """测试转换精度保留2位小数"""
        result = kg_to_lbs(2.345)
        assert isinstance(result, float)
        assert abs(result - round(2.345 * KG_TO_LBS, 2)) < 0.001

    def test_cm_to_inch_basic(self):
        """测试厘米到英寸的基本转换"""
        result = cm_to_inch(1.0)
        expected = round(1.0 * CM_TO_INCH, 2)
        assert result == expected
        assert result == 0.39

    def test_cm_to_inch_precision(self):
        """测试厘米转换精度保留2位小数"""
        result = cm_to_inch(10.0)
        assert result == 3.94

    def test_cm_to_inch_formula_accuracy(self):
        """验证转换公式精确度: 1cm = 0.393701inch"""
        result = cm_to_inch(1.0)
        assert result == 0.39

    def test_convert_product_units_complete(self):
        """测试完整产品数据转换"""
        data = {
            "sku": "TEST001",
            "name": "测试产品",
            "length_cm": 10.0,
            "width_cm": 20.0,
            "height_cm": 30.0,
            "gross_weight_kg": 1.5,
        }
        result = convert_product_units(data)

        assert result["length_inch"] == cm_to_inch(10.0)
        assert result["width_inch"] == cm_to_inch(20.0)
        assert result["height_inch"] == cm_to_inch(30.0)
        assert result["gross_weight_lb"] == kg_to_lbs(1.5)
        assert result["unit_converted"] is True
        assert "converted_at" in result

    def test_convert_product_units_partial(self):
        """测试部分数据转换（缺少某些字段）"""
        data = {
            "length_cm": 10.0,
            "gross_weight_kg": 1.5,
        }
        result = convert_product_units(data)

        assert result["length_inch"] == cm_to_inch(10.0)
        assert result["gross_weight_lb"] == kg_to_lbs(1.5)
        assert "width_inch" not in result or result.get("width_inch") is None

    def test_convert_product_units_no_numeric_fields(self):
        """测试无数字字段的数据转换"""
        data = {"sku": "TEST001", "name": "测试产品"}
        result = convert_product_units(data)

        assert result["unit_converted"] is True
        assert "converted_at" in result

    def test_conversion_formula_constants(self):
        """验证转换常数符合需求规格"""
        assert KG_TO_LBS == 2.20462
        assert CM_TO_INCH == 0.393701


# ========== 产品数据验证测试 ==========

class TestProductValidation:
    """测试产品数据验证功能"""

    def test_valid_product_data(self):
        """测试有效产品数据通过验证"""
        data = {
            "sku": "SKU001",
            "name": "测试产品",
            "length_cm": 10.0,
            "width_cm": 20.0,
            "height_cm": 30.0,
            "gross_weight_kg": 1.5,
        }
        is_valid, errors = validate_product_data(data)
        assert is_valid is True
        assert len(errors) == 0

    def test_missing_sku(self):
        """测试缺少 SKU"""
        data = {
            "sku": "",
            "name": "测试产品",
            "length_cm": 10.0,
            "width_cm": 20.0,
            "height_cm": 30.0,
            "gross_weight_kg": 1.5,
        }
        is_valid, errors = validate_product_data(data)
        assert is_valid is False
        assert any("SKU 不能为空" in e for e in errors)

    def test_missing_name(self):
        """测试缺少产品名称"""
        data = {
            "sku": "SKU001",
            "name": "",
            "length_cm": 10.0,
            "width_cm": 20.0,
            "height_cm": 30.0,
            "gross_weight_kg": 1.5,
        }
        is_valid, errors = validate_product_data(data)
        assert is_valid is False
        assert any("产品名称 不能为空" in e for e in errors)

    def test_negative_dimensions(self):
        """测试负值尺寸"""
        data = {
            "sku": "SKU001",
            "name": "测试产品",
            "length_cm": -10.0,
            "width_cm": 20.0,
            "height_cm": 30.0,
            "gross_weight_kg": 1.5,
        }
        is_valid, errors = validate_product_data(data)
        assert is_valid is False
        assert any("长度 必须大于0" in e for e in errors)

    def test_zero_dimensions(self):
        """测试零值尺寸"""
        data = {
            "sku": "SKU001",
            "name": "测试产品",
            "length_cm": 0,
            "width_cm": 20.0,
            "height_cm": 30.0,
            "gross_weight_kg": 1.5,
        }
        is_valid, errors = validate_product_data(data)
        assert is_valid is False
        assert any("长度 必须大于0" in e for e in errors)

    def test_invalid_numeric_string(self):
        """测试非数字字符串"""
        data = {
            "sku": "SKU001",
            "name": "测试产品",
            "length_cm": "abc",
            "width_cm": 20.0,
            "height_cm": 30.0,
            "gross_weight_kg": 1.5,
        }
        is_valid, errors = validate_product_data(data)
        assert is_valid is False
        assert any("长度 必须是有效的数字" in e for e in errors)

    def test_negative_price(self):
        """测试负价格"""
        data = {
            "sku": "SKU001",
            "name": "测试产品",
            "length_cm": 10.0,
            "width_cm": 20.0,
            "height_cm": 30.0,
            "gross_weight_kg": 1.5,
            "price": -10.0,
        }
        is_valid, errors = validate_product_data(data)
        assert is_valid is False
        assert any("价格 不能为负数" in e for e in errors)

    def test_negative_stock(self):
        """测试负库存"""
        data = {
            "sku": "SKU001",
            "name": "测试产品",
            "length_cm": 10.0,
            "width_cm": 20.0,
            "height_cm": 30.0,
            "gross_weight_kg": 1.5,
            "stock_quantity": -5,
        }
        is_valid, errors = validate_product_data(data)
        assert is_valid is False
        assert any("库存数量 不能为负数" in e for e in errors)

    def test_sku_too_long(self):
        """测试 SKU 超长"""
        data = {
            "sku": "A" * 51,
            "name": "测试产品",
            "length_cm": 10.0,
            "width_cm": 20.0,
            "height_cm": 30.0,
            "gross_weight_kg": 1.5,
        }
        is_valid, errors = validate_product_data(data)
        assert is_valid is False
        assert any("SKU 长度不能超过50个字符" in e for e in errors)

    def test_optional_fields_empty(self):
        """测试可选字段为空时通过验证"""
        data = {
            "sku": "SKU001",
            "name": "测试产品",
            "length_cm": 10.0,
            "width_cm": 20.0,
            "height_cm": 30.0,
            "gross_weight_kg": 1.5,
            "model": None,
            "price": None,
            "stock_quantity": None,
        }
        is_valid, errors = validate_product_data(data)
        assert is_valid is True
        assert len(errors) == 0


# ========== 单位转换精度测试 ==========

class TestConversionPrecision:
    """测试单位转换的精确度要求"""

    @pytest.mark.parametrize("cm,expected_inch", [
        (1.0, 0.39),
        (2.54, 1.0),
        (10.0, 3.94),
        (100.0, 39.37),
        (0.5, 0.2),
    ])
    def test_cm_to_inch_precision_cases(self, cm, expected_inch):
        """参数化测试厘米到英寸的精确转换"""
        result = cm_to_inch(cm)
        assert abs(result - expected_inch) < 0.01

    @pytest.mark.parametrize("kg,expected_lb", [
        (1.0, 2.2),
        (0.5, 1.1),
        (2.0, 4.41),
        (10.0, 22.05),
    ])
    def test_kg_to_lbs_precision_cases(self, kg, expected_lb):
        """参数化测试千克到磅的精确转换"""
        result = kg_to_lbs(kg)
        assert abs(result - expected_lb) < 0.01

    def test_round_to_two_decimals(self):
        """验证结果始终保留2位小数"""
        result_cm = cm_to_inch(3.333)
        result_kg = kg_to_lbs(3.333)

        assert len(str(result_cm).split('.')[-1]) <= 2
        assert len(str(result_kg).split('.')[-1]) <= 2


# ========== 双版本数据一致性测试 ==========

class TestDualVersionConsistency:
    """测试双版本数据的一致性"""

    def test_original_data_preserved(self):
        """验证原始数据在转换后保持不变"""
        data = {
            "sku": "SKU001",
            "length_cm": 25.4,
            "width_cm": 50.8,
            "height_cm": 76.2,
            "gross_weight_kg": 2.0,
        }
        result = convert_product_units(data)

        assert result["length_cm"] == 25.4
        assert result["width_cm"] == 50.8
        assert result["height_cm"] == 76.2
        assert result["gross_weight_kg"] == 2.0

    def test_converted_values_calculated_correctly(self):
        """验证转换值计算正确"""
        data = {
            "length_cm": 10.0,
            "width_cm": 20.0,
            "height_cm": 30.0,
            "gross_weight_kg": 1.5,
        }
        result = convert_product_units(data)

        assert result["length_inch"] == round(10.0 * 0.393701, 2)
        assert result["width_inch"] == round(20.0 * 0.393701, 2)
        assert result["height_inch"] == round(30.0 * 0.393701, 2)
        assert result["gross_weight_lb"] == round(1.5 * 2.20462, 2)

    def test_conversion_timestamp_exists(self):
        """验证转换时间戳存在"""
        data = {"length_cm": 10.0}
        result = convert_product_units(data)

        assert "converted_at" in result
        assert isinstance(result["converted_at"], datetime)

    def test_unit_converted_flag(self):
        """验证转换标志位设置正确"""
        data = {"sku": "TEST"}
        result = convert_product_units(data)
        assert result["unit_converted"] is True
