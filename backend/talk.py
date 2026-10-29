# 대화용 서버 기능: 하루·면접관 목소리(Typecast)와 대답에 맞춘 반응 만들기(Claude).
# 키는 Render 환경변수(TYPECAST_API_KEY, ANTHROPIC_API_KEY)에 둔다.
# 둘 다 실패하면 오류를 돌려주고, 화면은 브라우저 목소리·정해 둔 문장으로 계속 간다.
import json
import logging
import os

import anthropic
from flask import Blueprint, Response, request
from typecast import Typecast
from typecast.models import LanguageCode, Output, TTSRequest

talk = Blueprint("talk", __name__)
log = logging.getLogger(__name__)

# 목소리 ID는 비밀이 아니라 기본값으로 둔다(2026-10-29 사용자가 고름: 하루=서현, 면접관=형진)
VOICES = {
    "haru": os.environ.get("TYPECAST_VOICE_HARU", "tc_69f2e455ea79fd197aa0476f"),
    "interviewer": os.environ.get("TYPECAST_VOICE_INTERVIEWER", "tc_682e8798603b4e9ed84074f5"),
}
TC = Typecast(api_key=os.environ["TYPECAST_API_KEY"]) if os.environ.get("TYPECAST_API_KEY") else None
CLAUDE = anthropic.Anthropic() if os.environ.get("ANTHROPIC_API_KEY") else None
MODEL = os.environ.get("REPLY_MODEL", "claude-opus-5-5")
CACHE = {}  # 같은 문장은 다시 만들지 않는다(첫 질문은 사람마다 같다)


# 글 → mp3. 실패하면 502를 주고 화면이 브라우저 목소리로 대신한다
@talk.post("/tts")
def tts():
    body = request.get_json(silent=True) or {}
    text, who = str(body.get("text", ""))[:300], body.get("who", "haru")
    if not TC or not text or who not in VOICES:
        return {"error": "tts unavailable"}, 502
    key = (who, text)
    if key not in CACHE:
        try:
            audio = TC.text_to_speech(TTSRequest(text=text, voice_id=VOICES[who], model="ssfm-v30",
                                                 language=LanguageCode.KOR, output=Output(audio_format="mp3"))).audio_data
        except Exception as e:  # 키·크레딧·네트워크 문제. 화면 흐름은 끊지 않는다
            log.warning("TTS 실패: %s", e)
            return {"error": "tts failed"}, 502
        if len(CACHE) > 300:
            CACHE.clear()
        CACHE[key] = audio
    return Response(CACHE[key], mimetype="audio/mpeg")


SYSTEM = """너는 말하기 연습 웹 "reborn"의 대화 상대다. 사용자는 말하기와 면접이 긴장되는 청년이고, 천천히 한 단계씩 연습하고 있다.
꼭 물어야 할 질문 순서는 화면이 정해 둔다. 너는 방금 대답에 짧게 반응하고, 다음 질문으로 자연스럽게 이어 주는 말만 만든다.

규칙
- 반응은 대답 내용을 한 가지 짚는 한 문장. 그다음 다음 질문을 뜻은 그대로, 말투만 자연스럽게 붙인다.
- 평가·점수·조언을 하지 않는다. 말버릇, 긴장, 목소리, 분석 이야기를 하지 않는다.
- 사용자의 처지(고립, 오랜만, 단절, 공백기)를 짐작하거나 묻지 않는다. 사용자가 먼저 꺼내면 탓하지 않고 받아 준다.
- 대답이 질문을 비켜 갔거나 비어 있고, 아직 다시 묻지 않았다면 retry를 true로 한다. 가볍게 받아 준 뒤 같은 질문을 더 쉬운 말로 한 번 다시 묻는다. 이미 다시 물었다면 retry는 false로 하고 넘어간다.
- 다음 질문이 없으면(마지막) 고맙다는 짧은 마무리 한 문장만 한다.
- 힘든 마음을 털어놓으면 다그치지 않고 따뜻하게 받아 준 뒤 천천히 다음으로 간다.
- 전체 길이는 두 문장, 80자 안팎. 소리 내어 읽을 말이라 이모지·괄호·목록을 쓰지 않는다."""

TONE = {
    "haru": "말투: 하루. 20대 친구 같은 다정한 해요체.",
    "interviewer": "말투: 실전 면접관. 차분하고 정중한 합니다체. 반응은 '네, 잘 들었습니다'처럼 짧게 하고 칭찬을 늘어놓지 않는다.",
}
SCHEMA = {
    "type": "object",
    "properties": {"say": {"type": "string"}, "retry": {"type": "boolean"}},
    "required": ["say", "retry"],
    "additionalProperties": False,
}


# 대답에 맞춘 반응 + 다음 질문으로 잇는 말. 실패하면 502를 주고 화면이 정해 둔 문장을 쓴다
@talk.post("/reply")
def reply():
    b = request.get_json(silent=True) or {}
    who = b.get("who") if b.get("who") in TONE else "haru"
    if not CLAUDE:
        return {"error": "reply unavailable"}, 502
    history = "\n".join(f"{'상대' if h.get('ai') else '사용자'}: {str(h.get('text', ''))[:300]}" for h in (b.get("history") or [])[-6:])
    prompt = (f"{TONE[who]}\n\n최근 대화:\n{history}\n\n"
              f"방금 질문: {b.get('question', '')}\n"
              f"사용자 대답: {str(b.get('answer', ''))[:800] or '(말이 글로 잡히지 않았다)'}\n"
              f"이미 다시 물었나: {'예' if b.get('retried') else '아니오'}\n"
              f"다음 질문: {b.get('next') or '(없음, 마지막)'}")
    try:
        # fallbacks: 안전 검사로 거절되면 서버가 다른 모델로 다시 돌린다
        r = CLAUDE.beta.messages.create(
            model=MODEL, max_tokens=1000, system=SYSTEM,
            messages=[{"role": "user", "content": prompt}],
            output_config={"effort": "low", "format": {"type": "json_schema", "schema": SCHEMA}},
            betas=["server-side-fallback-2026-07-01"], fallbacks="default",
        )
        if r.stop_reason != "end_turn":
            raise ValueError(f"stop_reason={r.stop_reason}")
        out = json.loads(next(c.text for c in r.content if c.type == "text"))
    except Exception as e:  # 네트워크·키·형식 문제. 화면은 정해 둔 문장으로 계속 간다
        log.warning("reply 실패: %s", e)
        return {"error": "reply failed"}, 502
    return {"say": str(out["say"]), "retry": bool(out["retry"]) and not b.get("retried")}
