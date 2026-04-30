"""
启动后端服务
"""
import uvicorn
from app.api.routes import app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
