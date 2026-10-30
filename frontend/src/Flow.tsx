// 연습 흐름 화면: 단계 시작 확인 → 1단계 채팅 → 2단계 하루 영상 통화 → 이해 카드 → 3단계 실전 면접. 결과는 Result.tsx.
// 시안 flow-v4~v7을 따른다. 질문 순서는 정해 두고, 대답에 맞춘 반응은 서버(Claude)가 만든다. 분석은 아직 없다.
import { useEffect, useRef, useState } from 'react'
import { NODS, PROFILE, STAGE1, STAGE2, STAGE3, type Q } from './script'
import { cam, getMedia, listen, reply, speak, stopSpeak, type Who } from './voice'
import { Bars, Cam, Check, Dots, Mic } from './ui'
import type { Screen } from './App'

const demo = new URLSearchParams(location.search).has('demo')
type Line = { ai: boolean; text: string }

// 한 단계의 주고받기: 말하기 → 기다림 → 듣기 → 반응 만드는 중 → 다음 말. auto면 말한 뒤 바로 듣는다(3단계)
function useTalk(qs: Q[], who: Who, onDone: () => void, auto = false) {
  // Claude가 안 될 때 쓰는 정해 둔 연결 문장
  const fixed = (n: number) => (who === 'haru' ? NODS[n % NODS.length] : '네, 잘 들었습니다.') + ' ' + qs[n].q
  // i: 몇 번째 질문, line: 지금 읽을 말, retried: 이 질문을 이미 다시 물었는지
  const [cur, setCur] = useState({ i: 0, line: qs[0].q, retried: false })
  const [phase, setPhase] = useState<'speak' | 'ready' | 'listen' | 'think'>('speak')
  const [live, setLive] = useState('')
  const [log, setLog] = useState<Line[]>([{ ai: true, text: qs[0].q }])
  const [bye, setBye] = useState('') // 마지막 마무리 인사 (읽는 동안 화면 글도 이걸로)
  const ear = useRef<{ stop(): void } | null>(null)
  const turn = useRef(0) // 읽기를 끊고 다시 읽을 때, 끊긴 읽기의 끝 신호를 무시하려고 센다
  const alive = useRef(true)

  const start = () => { setLive(''); setPhase('listen'); ear.current = listen(setLive) }
  const stopEar = () => { ear.current?.stop(); ear.current = null }
  // 말을 읽고, 다 읽으면 기다리거나(1·2단계) 바로 듣는다(3단계)
  const ask = (line: string) => {
    const my = ++turn.current
    setPhase('speak')
    speak(line, who).then(() => { if (my !== turn.current) return; if (auto) start(); else setPhase('ready') })
    return () => { turn.current++; stopSpeak() }
  }
  useEffect(() => ask(cur.line), [cur])
  useEffect(() => { alive.current = true; return () => { alive.current = false; stopEar() } }, [])

  // 대답 끝(skip이면 넘어가기): 대답을 남기고, Claude 반응으로 다시 묻거나 다음 질문으로 간다
  const finish = async (skip = false) => {
    stopEar()
    const answer = skip ? '' : live || (demo ? qs[cur.i].demo : '')
    const lines = [...log, { ai: false, text: skip ? '(넘어갔어요)' : answer || '(말로 대답했어요)' }]
    setLog(lines)
    setPhase('think')
    const last = cur.i + 1 >= qs.length
    const r = skip ? null : await reply({ who, question: qs[cur.i].q, answer, next: last ? null : qs[cur.i + 1].q, retried: cur.retried, history: lines })
    if (!alive.current) return
    if (r?.retry) {
      setLog([...lines, { ai: true, text: r.say }])
      return setCur({ i: cur.i, line: r.say, retried: true })
    }
    if (last) {
      if (r) { setLog([...lines, { ai: true, text: r.say }]); setBye(r.say); setPhase('speak'); await speak(r.say, who) }
      if (alive.current) onDone()
      return
    }
    const line = r?.say ?? fixed(cur.i + 1)
    setLog([...lines, { ai: true, text: line }])
    setCur({ i: cur.i + 1, line, retried: false })
  }
  const again = () => { stopEar(); start() }
  const replay = () => { stopEar(); ask(cur.line) }
  return { i: cur.i, n: qs.length, q: qs[cur.i], line: bye || cur.line, bye, phase, live, log, start, finish, again, replay }
}

// 대답하지 않고 넘어가기 (말하기 전에만 보이는 작은 글씨)
const Skip = ({ onClick, label = '이 질문은 대답하지 않고 넘어갈게요' }: { onClick: () => void; label?: string }) => <button className="skip" onClick={onClick}>{label}</button>
// 답변 마치기 (말하는 중의 주 버튼)
const Done = ({ onClick }: { onClick: () => void }) => <button className="btn dark donebtn" onClick={onClick}><svg className="ico" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" /></svg>답변 마치기</button>

// 영상 통화 버튼 줄의 빨간 통화 끝내기 (잘못 누를 수 있어 한 번 묻는다)
const HangUp = ({ quit }: { quit: () => void }) => (
  <button className="rb end" aria-label="통화 끝내기" title="통화 끝내기" onClick={() => confirm('통화를 끝낼까요? 2단계는 다음에 처음부터 다시 해요.') && quit()}>
    <svg className="ico" viewBox="0 0 24 24"><path d="M3 14c5-5 13-5 18 0l-2.5 2.5-3-1.5v-2.5c-2.2-.7-4.8-.7-7 0V15l-3 1.5z" fill="currentColor" stroke="none" /></svg>
  </button>
)

// 단계를 마치면 나오는 카드: 마쳤다는 말 + 다음으로 가는 버튼 (자동으로 넘어가지 않는다)
function EndCard({ title, sub, next, onNext, rest, dark }: { title: string; sub: string; next: string; onNext: () => void; rest?: () => void; dark?: boolean }) {
  return (
    <div className="endc">
      <div className="l"><span className="ok"><svg className="ico" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" /></svg></span><div><b>{title}</b><span className="s">{sub}</span></div></div>
      <div className="r">{rest && <button className="link" onClick={rest}>오늘은 여기까지 할게요</button>}<button className={`btn ${dark ? 'dark' : ''}`} onClick={onNext}>{next} →</button></div>
    </div>
  )
}

// 대답 예시 글 (?demo=1일 때만)
const Hint = ({ q }: { q: Q }) => (demo ? <span className="demo">읽어 보세요 · {q.demo}</span> : null)

// 마이크 권한을 받아 확인 줄에 쓴다
function useMic() {
  const [ok, setOk] = useState<boolean | null>(null)
  useEffect(() => { getMedia('audio').then((s) => setOk(!!s)) }, [])
  return ok
}

// 화면 아래 "오늘은 여기까지 / 시작" 줄
function Foot({ go, next, label, dark, disabled }: { go: (s: Screen) => void; next: Screen; label: string; dark?: boolean; disabled?: boolean }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between' }}>
      <button className="link" onClick={() => go('home')}>오늘은 여기까지 할게요</button>
      <button className={`btn ${dark ? 'dark' : ''}`} disabled={disabled} onClick={() => go(next)}>{label}</button>
    </div>
  )
}

// 1단계 시작 전: 마이크 확인
export function Prep1({ go }: { go: (s: Screen) => void }) {
  const mic = useMic()
  return (
    <main><div className="panel" style={{ maxWidth: 760, margin: '16px auto 0' }}>
      <h1>시작하기 전에 <em>마이크</em>만 확인할게요</h1>
      <p className="lead">브라우저가 마이크를 써도 되는지 물어보면 "허용"을 눌러 주세요.</p>
      <div className="checks">
        <Check icon={<Mic />} title="이 문장을 소리 내어 읽어 주세요" ok={mic} okText="잘 들려요"><span className="say">"오늘 연습 잘 부탁드려요"</span></Check>
        <Check icon={<svg className="ico" viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /></svg>} title="녹음은 분석이 끝나면 바로 지워요" ok okText="">
          <p>어디에도 저장하지 않아요. 카메라는 2단계에서 따로 물어볼게요.</p></Check>
      </div>
      {mic === false && <p className="small" style={{ marginBottom: 16 }}>주소창 왼쪽 자물쇠를 눌러 마이크를 "허용"으로 바꾼 뒤 새로고침해 주세요.</p>}
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="small">1단계는 5분쯤 걸려요 · 중간에 나가도 이어서 할 수 있어요</span>
        <button className="btn" disabled={!mic} onClick={() => go('talk1')}>1단계 시작하기</button>
      </div>
    </div></main>
  )
}

// 1단계: 채팅 모양 + 목소리로 대답
export function Talk1({ done, rest }: { done: () => void; rest: () => void }) {
  const [end, setEnd] = useState(false)
  const t = useTalk(STAGE1, 'haru', () => setEnd(true))
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { box.current?.scrollTo(0, box.current.scrollHeight) }, [t.log, t.phase, t.live])
  const status = { speak: '말하고 있어요', ready: '기다리고 있어요', listen: '듣고 있어요', think: '생각하고 있어요' }[t.phase]
  const turn = t.phase === 'ready' || t.phase === 'listen'

  return (
    <main><div className="chatwrap">
      <aside className="who"><div className="orb"><Bars still={turn} /></div><div><div className="nm">하루</div><div className="small">{end ? '대화를 마쳤어요' : status}</div></div><p className="small">대답은 글이 아니라<br />목소리로 해요</p></aside>
      <section className="chat">
        <div className="log" ref={box}>
          {t.log.map((l, k) => <div key={k} className={`bub ${l.ai ? 'ai' : 'me'}`}><small>{l.ai ? '하루' : '내 대답'}</small>{l.text}</div>)}
          {turn && (t.phase === 'listen' || demo) && (
            <div className="bub me live"><small>{t.phase === 'listen' ? '말하는 중' : '대답 예시'}</small>{t.live || (demo ? t.q.demo : '…')}</div>
          )}
          {t.phase === 'think' && <div className="bub ai"><small>하루</small><Dots /></div>}
        </div>
        {end ? <div className="ctrl"><EndCard title="1단계를 마쳤어요" sub={`목소리로 질문 ${t.n}개를 끝까지 마쳤어요.`} next="2단계로 가기" onNext={done} rest={rest} /></div> : <div className="ctrl">
          <div className="micbtn">
            {t.phase === 'listen'
              ? <span className="mic" aria-hidden><Bars /></span>
              : <button className={`mic ${t.phase === 'ready' ? '' : 'off'}`} disabled={t.phase !== 'ready'} aria-label="말하기 시작" onClick={t.start}><Mic /></button>}
            <div>{t.phase === 'listen' ? <><b>듣고 있어요</b><span>다 말했으면 오른쪽 버튼을 눌러요</span></>
              : t.phase === 'ready' ? <><b>버튼을 누르고 말해요</b><span>천천히 말해도 괜찮아요</span></>
              : <><b>하루 차례예요</b><span>하루 말이 끝나면 다시 말할 수 있어요</span></>}</div>
          </div>
          <div className="row" style={{ gap: 20 }}><span className="small">질문 {t.i + 1} / {t.n}</span>
            {t.phase === 'ready' && <Skip onClick={() => t.finish(true)} />}
            {t.phase === 'listen' && <Done onClick={() => t.finish()} />}</div>
        </div>}
      </section>
    </div></main>
  )
}

// 2단계 시작 전: 영상 통화 대기실. 하루와 내 카메라를 나란히 보여 주고 마이크·카메라를 확인한다
export function Prep2({ go }: { go: (s: Screen) => void }) {
  const mic = useMic()
  const [cm, setCm] = useState<boolean | null>(null)
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => { getMedia('video').then((s) => { setCm(!!s); if (s && video.current) video.current.srcObject = s }) }, [])
  const st = mic === null || cm === null ? '확인하는 중…' : !mic ? '마이크를 찾지 못했어요' : cm ? '마이크 · 카메라 잘 연결됐어요' : '마이크 잘 연결됐어요'
  return (
    <main><div className="lobby">
      <h1>하루와 <em>영상 통화</em>를 준비해요</h1>
      <p className="lead">통화가 시작되면 내 화면은 사라지고 하루만 보여요.</p>
      <div className="two">
        <div className="tile" role="img" aria-label="하루"><span className="st"><i />기다리는 중</span><span className="tag">하루</span></div>
        <div className="tile me"><video ref={video} autoPlay muted playsInline />
          {cm === false ? <p className="none">카메라 없이도 계속할 수 있어요</p> : <div className="guide" />}
          <span className="st">{mic && <i />}{st}</span><span className="tag">나</span><span className="ns">영상은 저장하지 않아요</span></div>
      </div>
      <div className="eye"><svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>말하는 동안에는 하루를 봐 주세요 <span>· 그 밖에는 편하게 봐도 돼요</span></div>
      {mic === false && <p className="small" style={{ marginBottom: 16 }}>주소창 왼쪽 자물쇠를 눌러 마이크를 "허용"으로 바꾼 뒤 새로고침해 주세요.</p>}
      <div><button className="btn" disabled={!mic} onClick={() => go('talk2')}>통화 시작하기</button></div>
      <p style={{ marginTop: 16 }}><button className="link" onClick={() => go('home')}>오늘은 여기까지 할게요</button></p>
    </div></main>
  )
}

// 2단계: 하루와 영상 통화. 글은 창 밖 아래에만 두고, 말하는 중은 창 테두리 빛으로 보여 준다
export function Talk2({ done, quit }: { done: () => void; quit: () => void }) {
  const [end, setEnd] = useState(false)
  const t = useTalk(STAGE2, 'haru', () => setEnd(true))
  const [sec, setSec] = useState(0)
  const [pip, setPip] = useState(true) // 연결 직후 2초만 내 화면을 작게 보여 준다
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (video.current) video.current.srcObject = cam
    const a = setInterval(() => setSec((n) => n + 1), 1000)
    const b = setTimeout(() => setPip(false), 2000)
    return () => { clearInterval(a); clearTimeout(b) }
  }, [])
  const on = !end && t.phase
  const face = on === 'speak' ? 'talk speak' : on === 'listen' ? 'listen on' : on === 'think' ? 'think' : ''
  const time = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
  return (
    <div className="vcall">
      <div className={`tile big ${face}`} role="img" aria-label="하루">
        <span className="st"><i />연결됨 · {time}</span>
        {!end && !t.bye && <span className="no">질문 {t.i + 1} / {t.n}</span>}
        <span className="tag">{on === 'speak' && <Bars />}하루</span>
        {cam && <div className={`tile me pip ${pip ? '' : 'gone'}`}><video ref={video} autoPlay muted playsInline /></div>}
      </div>
      {end ? <EndCard title="2단계를 마쳤어요" sub={`하루 얼굴을 보며 질문 ${t.n}개를 끝까지 마쳤어요.`} next="하루가 정리한 내용 보기" onNext={done} />
        : on === 'listen' ? <>
          <Hint q={t.q} />
          <div className="cbar" style={{ marginTop: 30 }}><Done onClick={() => t.finish()} /><HangUp quit={quit} /></div>
          <p className="hint"><button onClick={t.again}>처음부터 다시 말할게요</button></p></>
        : on === 'think' ? <div style={{ marginTop: 30 }}><Dots /></div>
        : <>
          <p className="q">{t.line}</p>
          {on === 'ready' && <Hint q={t.q} />}
          {!t.bye && <><div className="cbar">
            <button className="btn" disabled={on !== 'ready'} onClick={t.start}><Mic />하루를 보며 대답하기</button>
            <button className="rb" aria-label="이 질문 넘어가기" title="이 질문 넘어가기" disabled={on !== 'ready'} onClick={() => t.finish(true)}><svg className="ico" viewBox="0 0 24 24"><path d="M6 6l7 6-7 6M15 6v12" /></svg></button>
            <HangUp quit={quit} />
          </div>
          <p className="hint">가운데 버튼은 이 질문 넘어가기, 빨간 버튼은 통화 끝내기예요</p></>}</>}
    </div>
  )
}

// 2단계 끝: "이렇게 이해했어요" 카드. 고친 이름은 결과·내 연습에 쓴다
export function Profile({ go, save }: { go: (s: Screen) => void; save: (name: string) => void }) {
  const [vals, setVals] = useState(PROFILE.map(([, v]) => v))
  return (
    <main><div className="profile panel">
      <span className="badge">2단계를 마쳤어요</span>
      <h1 style={{ marginTop: 20 }}>하루가 이렇게 <em>이해했어요</em></h1>
      <p className="lead">실전 면접 질문은 이 내용으로 만들어요. 틀린 부분이 있으면 눌러서 고쳐 주세요.</p>
      <div className="pf">
        {PROFILE.map(([k], n) => (
          <label key={k}><b>{k}</b><input value={vals[n]} placeholder="넘어갔어요 · 눌러서 채우기" onChange={(e) => setVals(vals.map((v, m) => (m === n ? e.target.value : v)))} /></label>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 28 }}>
        <button className="link" onClick={() => { save(vals[0]); go('home') }}>오늘은 여기까지 할게요</button>
        <button className="btn" onClick={() => { save(vals[0]); go('prep3') }}>맞아요, 다음으로</button>
      </div>
    </div></main>
  )
}

// 3단계 시작 전: 안내 + 확인
export function Prep3({ go }: { go: (s: Screen) => void }) {
  const mic = useMic()
  const [cm, setCm] = useState<boolean | null>(cam ? true : null)
  useEffect(() => { if (!cam) getMedia('video').then((s) => setCm(!!s)) }, [])
  return (
    <main><div className="panel" style={{ maxWidth: 820, margin: '16px auto 0' }}>
      <h1>이제 <em>실전 면접</em>이에요</h1>
      <p className="lead">새 면접관이 실제 면접처럼 질문해요. 하루와 나눈 이야기로 만든 질문이라 낯설지 않을 거예요.</p>
      <ul style={{ listStyle: 'none', display: 'grid', gap: 10, marginTop: 24, fontSize: 16, color: 'var(--ink-2)' }}>
        <li><b style={{ color: 'var(--ink)' }}>질문은 글로 나오지 않아요.</b> 실제 면접처럼 듣고 말로 대답해요. 못 들었으면 "다시 들려주세요"를 눌러요.</li>
        <li><b style={{ color: 'var(--ink)' }}>질문은 5개예요.</b> 대답에 따라 한두 번 더 물어볼 수 있어요.</li>
        <li><b style={{ color: 'var(--ink)' }}>어려우면 넘어가도 돼요.</b> 언제든 그만할 수 있어요.</li>
      </ul>
      <div className="checks">
        <Check icon={<Mic />} title="마이크" ok={mic} okText="잘 들려요"><p>오늘 연습 잘 부탁드려요</p></Check>
        <Check icon={<Cam />} title="카메라" ok={cm} okText="잘 보여요"><p>{cm === false ? '카메라 없이도 계속할 수 있어요' : '얼굴이 화면 가운데 와요'}</p></Check>
      </div>
      <Foot go={go} next="talk3" label="실전 면접 시작하기" dark disabled={!mic} />
    </div></main>
  )
}

// 3단계: 글 없이, 어두운 화면 가운데 영상 통화 창 (그림은 움직이지 않고 물결로만 말하는 중을 보여 준다)
export function Talk3({ done, quit }: { done: () => void; quit: () => void }) {
  const [end, setEnd] = useState(false)
  const t = useTalk(STAGE3, 'interviewer', () => setEnd(true), true)
  const st = { speak: '질문하는 중', ready: '', listen: '듣고 있어요', think: '잘 들었어요' }[t.phase]
  const on = t.phase === 'listen'
  return (
    <div className="s3">
      <div className="top"><span><b>실전 면접</b> · 질문 {t.i + 1} / {t.n}</span>
        <span>{cam && <span style={{ marginRight: 20 }}>● 카메라 켜짐</span>}<button className="quit" onClick={quit}>그만하기</button></span></div>
      <div className="win" role="img" aria-label="실전 면접관" />
      {end ? <EndCard title="면접을 마쳤어요. 수고하셨어요" sub={`질문 ${t.n}개를 끝까지 마쳤어요.`} next="결과 보러 가기" onNext={done} dark /> : <>
        <div className="bar"><Bars still={t.phase === 'think'} /><span className="st">{st}</span>
          <button className="btn ghost" onClick={t.replay} disabled={t.phase === 'think'}>다시 들려주세요</button>
          <button className="btn dark donebtn" onClick={() => t.finish()} disabled={!on}><svg className="ico" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" /></svg>답변 마치기</button></div>
        {on && <Skip onClick={() => t.finish(true)} />}
        {on && <Hint q={t.q} />}</>}
    </div>
  )
}
