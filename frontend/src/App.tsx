// 임시 측정 화면: 같은 대답을 브라우저 음성 인식과 서버 Whisper가 글로 바꾸는 시간을 비교한다.
// shortcut: 배포 서버 측정용이다. 1단계 화면을 만들 때 지운다.
import { useEffect, useRef, useState } from 'react'

// 배포에서는 render.yaml이 서버 주소를 넣어 주고, 내 컴퓨터에서는 5000번 포트를 쓴다.
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'
const SpeechRecognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition

type Row = { sec: number; browserSec: number; browserText: string; serverSec: number; server: Record<string, unknown> }

// 녹음 한 번마다 두 방식의 시간을 재서 표로 보여 주는 화면
export default function App() {
  const [stats, setStats] = useState('서버 확인 중… (깨어나는 데 1분쯤 걸릴 수 있어요)')
  const [recording, setRecording] = useState(false)
  const [note, setNote] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const live = useRef<{ stop: () => void } | null>(null)

  const loadStats = () =>
    fetch(`${API}/stats`).then((r) => r.json()).then((d) => setStats(JSON.stringify(d, null, 1))).catch(() => setStats('서버에 연결하지 못했어요'))
  useEffect(() => { loadStats() }, [])

  // 마이크 녹음과 브라우저 음성 인식을 같이 시작한다
  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => chunks.push(e.data)
    let text = ''
    let on = true
    const recog = SpeechRecognition ? new SpeechRecognition() : null
    const browserDone = new Promise<number>((resolve) => {
      if (!recog) return resolve(NaN)
      recog.lang = 'ko-KR'
      recog.continuous = true
      recog.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript + ' '
      }
      // 크롬은 조용하면 저절로 끝나서, 녹음 중이면 다시 켠다
      recog.onend = () => (on ? recog.start() : resolve(performance.now()))
      recog.start()
    })
    const startedAt = performance.now()
    recorder.start()
    setRecording(true)
    setNote('')

    live.current = {
      stop: async () => {
        const stopAt = performance.now()
        on = false
        recog?.stop()
        const stopped = new Promise((r) => (recorder.onstop = r))
        recorder.stop()
        stream.getTracks().forEach((t) => t.stop())
        setRecording(false)
        await stopped
        const browserSec = ((await browserDone) - stopAt) / 1000
        setNote('서버가 받아쓰는 중…')
        const ctx = new AudioContext({ sampleRate: 16000 })
        const audio = await ctx.decodeAudioData(await new Blob(chunks).arrayBuffer())
        const sent = performance.now()
        const res = await fetch(`${API}/transcribe`, { method: 'POST', body: audio.getChannelData(0) })
        const server = await res.json()
        const serverSec = (performance.now() - sent) / 1000
        setRows((r) => [...r, { sec: (stopAt - startedAt) / 1000, browserSec, browserText: text, serverSec, server }])
        setNote('')
        loadStats()
      },
    }
  }

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 900, margin: '24px auto', padding: '0 16px' }}>
      <h1>reborn 서버 측정</h1>
      <p>30초, 1분, 3분 동안 말해 보고 각각 멈춰 주세요. 크롬에서 열어야 브라우저 음성 인식이 돼요.</p>
      <button onClick={() => (recording ? live.current?.stop() : start())} style={{ fontSize: 20, padding: '8px 20px' }}>
        {recording ? '멈추기' : '녹음 시작'}
      </button>
      <span style={{ marginLeft: 12 }}>{note}</span>
      <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse', marginTop: 16, width: '100%' }}>
        <thead>
          <tr><th>말한 길이</th><th>브라우저: 멈춘 뒤 글까지</th><th>서버 왕복</th><th>Whisper</th><th>CNN 3개</th><th>서버 메모리(지금/최고 MB)</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.sec.toFixed(0)}초</td>
              <td>{r.browserSec.toFixed(1)}초</td>
              <td>{r.serverSec.toFixed(1)}초</td>
              <td>{String(r.server.whisper_sec)}초</td>
              <td>{String(r.server.cnn_sec)}초</td>
              <td>{JSON.stringify(r.server.memory)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.map((r, i) => (
        <details key={i}><summary>{i + 1}번 글 비교</summary><p>브라우저: {r.browserText}</p><p>Whisper: {String(r.server.text)}</p></details>
      ))}
      <h2>서버 시작 기록</h2>
      <pre style={{ background: '#f4f4f4', padding: 12 }}>{stats}</pre>
    </main>
  )
}
