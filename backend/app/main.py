from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth
from app.websockets.timer import timer_ws_endpoint

app = FastAPI(title="Drone Racing API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)


@app.websocket("/ws/timer")
async def ws_timer(websocket: WebSocket):
    await timer_ws_endpoint(websocket)


@app.get("/health")
async def health():
    return {"status": "ok"}
