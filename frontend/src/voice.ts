// 브라우저 기능으로 목소리를 내고(말하기), 대답을 글로 받고(음성 인식), 마이크·카메라를 켠다.
// shortcut: 질문 목소리는 브라우저 기본 목소리다. Typecast로 미리 만든 파일이 생기면 speak만 바꾼다.

const Recognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition

// 글을 소리 내어 읽고, 다 읽으면 끝나는 Promise (3단계 면접관은 낮고 느리게)
export function speak(text: string, who: 'haru' | 'interviewer' = 'haru') {
  return new Promise<void>((resolve) => {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ko-KR'
    u.voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith('ko')) ?? null
    u.pitch = who === 'haru' ? 1.1 : 0.8
    u.rate = who === 'haru' ? 1 : 0.95
    u.onend = u.onerror = () => resolve()
    speechSynthesis.speak(u)
  })
}

// 대답 듣기 시작. onText로 지금까지 들은 글을 넘기고, stop()을 부르면 끝난다
export function listen(onText: (t: string) => void) {
  if (!Recognition) return { stop() {} }
  const r = new Recognition()
  r.lang = 'ko-KR'
  r.continuous = true
  r.interimResults = true
  let done = ''
  let on = true
  r.onresult = (e: any) => {
    let live = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) done += e.results[i][0].transcript + ' '
      else live += e.results[i][0].transcript
    }
    onText((done + live).trim())
  }
  // 크롬은 조용하면 저절로 끝나서, 듣는 중이면 다시 켠다
  r.onend = () => on && r.start()
  r.start()
  return { stop() { on = false; r.stop() } }
}

// 마이크·카메라 권한 받기. 실패하면 null
export async function getMedia(kind: 'audio' | 'video') {
  try {
    const s = await navigator.mediaDevices.getUserMedia({ [kind]: true })
    if (kind === 'audio') s.getTracks().forEach((t) => t.stop()) // 확인만 하고 끈다. 듣기는 음성 인식이 한다
    else cam = s
    return s
  } catch {
    return null
  }
}

// 카메라는 2·3단계 동안 켜 둔다(데모라 분석은 아직 없다)
export let cam: MediaStream | null = null
export function stopCam() {
  cam?.getTracks().forEach((t) => t.stop())
  cam = null
}
