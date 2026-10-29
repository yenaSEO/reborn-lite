// 목소리 내기(서버 Typecast, 안 되면 브라우저 목소리), 대답을 글로 받기(음성 인식), 대답에 맞춘 반응 받기, 마이크·카메라 켜기.

const Recognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
export const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'
export type Who = 'haru' | 'interviewer'
let audio: HTMLAudioElement | null = null

// 말하던 목소리를 멈춘다
export function stopSpeak() {
  audio?.pause()
  audio = null
  speechSynthesis.cancel()
}

// 글을 소리 내어 읽고, 다 읽으면 끝나는 Promise
export async function speak(text: string, who: Who = 'haru') {
  stopSpeak()
  try {
    const r = await fetch(`${API}/tts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, who }) })
    if (!r.ok) throw new Error('tts')
    const a = (audio = new Audio(URL.createObjectURL(await r.blob())))
    await new Promise<void>((resolve) => { a.onended = a.onerror = a.onpause = () => resolve(); a.play().catch(() => resolve()) })
  } catch {
    await browserSpeak(text, who)
  }
}

// 서버 목소리가 안 될 때 쓰는 브라우저 기본 목소리 (면접관은 낮고 느리게)
function browserSpeak(text: string, who: Who) {
  return new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ko-KR'
    u.voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith('ko')) ?? null
    u.pitch = who === 'haru' ? 1.1 : 0.8
    u.rate = who === 'haru' ? 1 : 0.95
    u.onend = u.onerror = () => resolve()
    speechSynthesis.speak(u)
  })
}

// 서버(Claude)에 대답을 보내 반응 + 다음 질문으로 잇는 말을 받는다. 실패하면 null
export async function reply(body: { who: Who; question: string; answer: string; next: string | null; retried: boolean; history: { ai: boolean; text: string }[] }) {
  try {
    const r = await fetch(`${API}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return r.ok ? ((await r.json()) as { say: string; retry: boolean }) : null
  } catch {
    return null
  }
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
