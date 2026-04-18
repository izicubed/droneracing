from fastapi import FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import auth
from app.routers import pilots, sessions, admin, results
from app.routers import support, admin_support
from app.websockets.timer import timer_ws_endpoint

app = FastAPI(title="Drone Racing API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(pilots.router)
app.include_router(sessions.router)
app.include_router(admin.router)
app.include_router(results.router)
app.include_router(support.router)
app.include_router(admin_support.router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": str(exc)})


@app.websocket("/ws/timer")
async def ws_timer(websocket: WebSocket):
    await timer_ws_endpoint(websocket)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/debug-db")
async def debug_db():
    from app.database import engine
    from sqlalchemy import text
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"db": "ok"}
    except Exception as e:
        return {"db": "error", "detail": str(e), "type": type(e).__name__}
