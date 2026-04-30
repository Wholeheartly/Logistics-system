"""
数据库迁移脚本：为 products 表添加新字段
运行: cd backend && python scripts/migrate_product_fields.py
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import create_engine, text
from app.utils.db import DB_URL

engine = create_engine(DB_URL, echo=False)


def migrate():
    with engine.connect() as conn:
        # 检查现有列
        result = conn.execute(text("PRAGMA table_info(products)"))
        existing_columns = {row[1] for row in result.fetchall()}
        print(f"现有列: {existing_columns}")

        new_columns = {
            "name": "VARCHAR(200) NOT NULL DEFAULT ''",
            "model": "VARCHAR(100)",
            "specification": "VARCHAR(500)",
            "price": "FLOAT DEFAULT 0.0",
            "stock_quantity": "INTEGER DEFAULT 0",
            "category": "VARCHAR(100)",
            "brand": "VARCHAR(100)",
            "supplier": "VARCHAR(200)",
            "description": "TEXT",
            "status": "VARCHAR(20) NOT NULL DEFAULT 'active'",
            "created_at": "DATETIME",
            "updated_at": "DATETIME",
        }

        for col_name, col_def in new_columns.items():
            if col_name not in existing_columns:
                sql = f"ALTER TABLE products ADD COLUMN {col_name} {col_def}"
                conn.execute(text(sql))
                print(f"添加列: {col_name}")
            else:
                print(f"列已存在，跳过: {col_name}")

        # 为现有数据设置默认值
        conn.execute(text("UPDATE products SET name = sku WHERE name = '' OR name IS NULL"))
        conn.execute(text("UPDATE products SET status = 'active' WHERE status IS NULL"))
        from datetime import datetime
        now = datetime.now().isoformat()
        conn.execute(text(f"UPDATE products SET created_at = '{now}' WHERE created_at IS NULL"))
        conn.execute(text(f"UPDATE products SET updated_at = '{now}' WHERE updated_at IS NULL"))

        conn.commit()
        print("迁移完成！")


if __name__ == "__main__":
    migrate()
