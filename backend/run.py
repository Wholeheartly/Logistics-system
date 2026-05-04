"""
启动后端服务（生产环境）
"""
import uvicorn
from app.api.routes import app
from app.utils.logger import get_logger

logger = get_logger("main")

if __name__ == "__main__":
    logger.info("=" * 50)
    logger.info("物流管理系统后端服务启动")
    logger.info("=" * 50)
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        access_log=True,
    )
