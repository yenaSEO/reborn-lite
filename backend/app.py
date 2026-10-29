# reborn 경량 웹 서버.
# 지금은 뼈대라서 살아 있는지 알려 주는 /health 하나만 있다.
import os

from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
# 화면(Static Site)과 서버 주소가 달라서 화면 주소의 요청을 허용한다.
CORS(app, origins=os.environ.get("FRONTEND_ORIGIN", "*"))


# 서버가 살아 있는지 알려 준다
@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    app.run(port=5000, debug=True)
