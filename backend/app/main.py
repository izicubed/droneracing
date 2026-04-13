from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.limiter import limiter
from app.routers import auth
from app.routers import pilots, sessions
from app.websockets.timer import timer_ws_endpoint

app = FastAPI(title="Drone Racing API", version="0.1.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = [o.strip() for o in settings.cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(pilots.router)
app.include_router(sessions.router)


@app.websocket("/ws/timer")
async def ws_timer(websocket: WebSocket):
    await timer_ws_endpoint(websocket)


@app.get("/health")
async def health():
    return {"status": "ok"}
