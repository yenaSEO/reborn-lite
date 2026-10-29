# reborn 경량 웹 서버.
# /health, 대화용 /tts·/reply(talk.py), 그리고 배포 서버에서 Whisper·CNN 3개의 메모리와 시간을 재는 /stats, /transcribe.
# shortcut: 측정용 코드다. 1단계 분석 코드를 옮겨 올 때 /transcribe는 실제 분석으로 바꾼다.
import json
import os
import shutil
import time

import numpy as np
from flask import Flask, request
from flask_cors import CORS

app = Flask(__name__)
# 대답 상한 3분에 여유를 둔 크기(16kHz float32 약 3분 20초)
app.config["MAX_CONTENT_LENGTH"] = 16000 * 4 * 200
# 화면(Static Site)과 서버 주소가 달라서 화면 주소의 요청을 허용한다.
CORS(app, origins=os.environ.get("FRONTEND_ORIGIN", "*"))

from talk import talk  # noqa: E402  하루·면접관 목소리(/tts)와 대답에 맞춘 반응(/reply)

app.register_blueprint(talk)

HERE = os.path.dirname(__file__)
LABELS = ["prolongation", "tremor", "energy"]


# 지금 메모리와 지금까지 최고 메모리(MB). 리눅스(/proc)에서만 잰다.
def memory_mb():
    try:
        with open("/proc/self/status") as f:
            v = {k: int(rest.split()[0]) // 1024 for k, rest in (line.split(":", 1) for line in f) if k in ("VmRSS", "VmHWM")}
        return {"now": v["VmRSS"], "peak": v["VmHWM"]}
    except OSError:
        return None


# 서버를 켤 때 무거운 것을 차례로 불러오며 시간과 메모리를 남긴다
STARTUP = {"before": memory_mb()}
t = time.time()
import librosa  # noqa: E402
import torch  # noqa: E402
import whisper  # noqa: E402

from model import SmallCNN  # noqa: E402

# Render Standard는 CPU가 1개인데 torch는 8개로 보고 일을 쪼개 오히려 느려진다
torch.set_num_threads(1)

STARTUP["import_sec"] = round(time.time() - t, 2)
STARTUP["after_import"] = memory_mb()

t = time.time()
CNNS = {}
for label in LABELS:
    with open(os.path.join(HERE, "models", label, "config.json")) as f:
        cfg = json.load(f)
    net = SmallCNN()
    net.load_state_dict(torch.load(os.path.join(HERE, "models", label, "model.pth"), map_location="cpu")["state_dict"])
    CNNS[label] = (net.eval(), cfg)
STARTUP["cnn_sec"] = round(time.time() - t, 2)

t = time.time()
# 빌드 때 받아 둔 파일을 쓴다(render.yaml buildCommand).
WHISPER = whisper.load_model("base", download_root=os.path.join(HERE, "whisper_cache"))
STARTUP["whisper_sec"] = round(time.time() - t, 2)
STARTUP["after_load"] = memory_mb()


# 서버가 살아 있는지 알려 준다
@app.get("/health")
def health():
    return {"status": "ok"}


# 서버를 켤 때 잰 값과 지금 메모리를 알려 준다
@app.get("/stats")
def stats():
    return {"startup": STARTUP, "memory": memory_mb(), "ffmpeg": bool(shutil.which("ffmpeg")), "threads": torch.get_num_threads()}


# 3초 창을 1초 간격으로 잘라 CNN 3개를 돌린다(실제 판정과 같은 양의 계산)
def run_cnns(y):
    cfg = CNNS["prolongation"][1]
    mel = librosa.feature.melspectrogram(
        y=y, sr=cfg["sr"], n_fft=cfg["n_fft"], win_length=cfg["win_length"], hop_length=cfg["hop_length"],
        n_mels=cfg["n_mels"], fmin=cfg["fmin"], fmax=cfg["fmax"],
    )
    db = np.maximum(librosa.power_to_db(mel, ref=1.0, amin=1e-10, top_db=None), cfg["db_floor"]).astype(np.float32)
    win = int(cfg["win_sec"] * cfg["sr"] / cfg["hop_length"])
    hop = int(cfg["judge_hop_sec"] * cfg["sr"] / cfg["hop_length"])
    starts = range(0, max(db.shape[1] - win, 0) + 1, hop)
    batch = np.stack([db[:, s:s + win] for s in starts])[:, None]
    with torch.no_grad():
        for net, c in CNNS.values():
            net(torch.from_numpy((batch - c["mean"]) / c["std"]))
    return len(batch)


# 브라우저가 보낸 16kHz 소리(float32 배열)를 Whisper로 받아쓰고 CNN 3개를 돌린 시간을 잰다
@app.post("/transcribe")
def transcribe():
    data = request.get_data()
    if len(data) < 16000 * 4 or len(data) % 4:
        return {"error": "1초 이상의 16kHz float32 소리를 보내 주세요"}, 400
    y = np.frombuffer(data, dtype=np.float32).copy()
    t = time.time()
    text = WHISPER.transcribe(y, language="ko", word_timestamps=True, fp16=False)["text"]
    whisper_sec = time.time() - t
    t = time.time()
    windows = run_cnns(y)
    cnn_sec = time.time() - t
    return {
        "audio_sec": round(y.size / 16000, 1),
        "whisper_sec": round(whisper_sec, 1),
        "cnn_sec": round(cnn_sec, 2),
        "windows": windows,
        "text": text,
        "memory": memory_mb(),
    }


# 첫 사용자가 기다리지 않게 켤 때 한 번 돌려 둔다(librosa·Whisper 첫 실행 준비)
t = time.time()
run_cnns(np.zeros(16000 * 3, dtype=np.float32))
WHISPER.transcribe(np.zeros(16000, dtype=np.float32), language="ko", word_timestamps=True, fp16=False)
STARTUP["warmup_sec"] = round(time.time() - t, 2)
STARTUP["after_warmup"] = memory_mb()


if __name__ == "__main__":
    app.run(port=5000, debug=True)
