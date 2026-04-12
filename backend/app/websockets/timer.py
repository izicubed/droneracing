import asyncio
import json
import random
from fastapi import WebSocket, WebSocketDisconnect


async def timer_ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        raw = await websocket.receive_text()
        cfg = json.loads(raw)

        countdown_sec = int(cfg.get("countdown_sec", 10))
        beep_count = int(cfg.get("beep_count", 5))
        random_min = float(cfg.get("random_delay_min_sec", 0.5))
        random_max = float(cfg.get("random_delay_max_sec", 3.0))

        # Countdown phase — tick every second
        for remaining in range(countdown_sec, 0, -1):
            await websocket.send_json({"phase": "COUNTDOWN", "remaining": remaining})
            await asyncio.sleep(1.0)

        # Beeps — one per second
        for i in range(1, beep_count + 1):
            await websocket.send_json({"phase": "BEEP", "n": i, "total": beep_count})
            await asyncio.sleep(1.0)

        # Random delay before GO
        random_delay = random.uniform(random_min, random_max)
        await asyncio.sleep(random_delay)

        await websocket.send_json({"phase": "GO"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"phase": "ERROR", "detail": str(e)})
        await websocket.close()
