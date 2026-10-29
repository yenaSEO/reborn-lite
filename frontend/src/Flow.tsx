// 연습 흐름 화면: 단계 시작 확인 → 1단계 채팅 → 2단계 하루 영상 통화 → 이해 카드 → 3단계 실전 면접 → 결과.
// 시안 flow-v3-haru 1~11번을 옮겼다. 대화는 정해 둔 질문으로 돌고, 분석·Claude는 아직 없다.
import { useEffect, useRef, useState } from 'react'
import { COACH, FACE, HABITS, NODS, PROFILE, STAGE1, STAGE2, STAGE3, type Q } from './script'
import { cam, getMedia, listen, speak, stopCam } from './voice'
import { Bars, Cam, Check, Dots, Mic, Pentagon } from './ui'
import type { Screen } from './App'

const demo = new URLSearchParams(location.search).has('demo')
type Line = { ai: boolean; text: string }

// 한 단계의 주고받기: 질문 읽기 → 기다림 → 듣기 → 정리 중 → 다음 질문. auto면 질문 뒤 바로 듣는다(3단계)
function useTalk(qs: Q[], who: 'haru' | 'interviewer', onDone: () => void, auto = false) {
  const say = (n: number) => (n ? (who === 'haru' ? NODS[n % NODS.length] : '네, 잘 들었습니다.') + ' ' : '') + qs[n].q
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState<'speak' | 'ready' | 'listen' | 'think'>('speak')
  const [live, setLive] = useState('')
  const [log, setLog] = useState<Line[]>([{ ai: true, text: say(0) }])
  const ear = useRef<{ stop(): void } | null>(null)
  const timer = useRef(0)
  const turn = useRef(0) // 읽기를 끊고 다시 읽을 때, 끊긴 읽기의 끝 신호를 무시하려고 센다

  const start = () => { setLive(''); setPhase('listen'); ear.current = listen(setLive) }
  const stopEar = () => { ear.current?.stop(); ear.current = null }
  // 질문을 읽고, 다 읽으면 기다리거나(1·2단계) 바로 듣는다(3단계)
  const ask = (n: number) => {
    const my = ++turn.current
    setPhase('speak')
    speak(say(n), who).then(() => { if (my !== turn.current) return; if (auto) start(); else setPhase('ready') })
    return () => { turn.current++; speechSynthesis.cancel() }
  }
  useEffect(() => ask(i), [i])
  useEffect(() => () => { stopEar(); clearTimeout(timer.current) }, [])

  // 대답 끝(skip이면 넘어가기): 대답을 남기고 잠깐 정리하는 척한 뒤 다음 질문
  const finish = (skip = false) => {
    stopEar()
    const text = skip ? '(넘어갔어요)' : live || (demo ? qs[i].demo : '(말로 대답했어요)')
    setLog((l) => [...l, { ai: false, text }])
    setPhase('think')
    timer.current = setTimeout(() => {
      if (i + 1 >= qs.length) return onDone()
      setLog((l) => [...l, { ai: true, text: say(i + 1) }])
      setI(i + 1)
    }, 1200)
  }
  const again = () => { stopEar(); start() }
  const replay = () => { stopEar(); ask(i) }
  return { i, n: qs.length, q: qs[i], phase, live, log, start, finish, again, replay }
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
export function Talk1({ done }: { done: () => void }) {
  const t = useTalk(STAGE1, 'haru', done)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { box.current?.scrollTo(0, box.current.scrollHeight) }, [t.log, t.phase, t.live])
  const status = { speak: '말하고 있어요', ready: '기다리고 있어요', listen: '듣고 있어요', think: '생각하고 있어요' }[t.phase]
  const turn = t.phase === 'ready' || t.phase === 'listen'

  return (
    <main><div className="chatwrap">
      <aside className="who"><div className="orb"><Bars still={turn} /></div><div><div className="nm">하루</div><div className="small">{status}</div></div><p className="small">대답은 글이 아니라<br />목소리로 해요</p></aside>
      <section className="chat">
        <div className="log" ref={box}>
          {t.log.map((l, k) => <div key={k} className={`bub ${l.ai ? 'ai' : 'me'}`}><small>{l.ai ? '하루' : '내 대답'}</small>{l.text}</div>)}
          {turn && (t.phase === 'listen' || demo) && (
            <div className="bub me live"><small>{t.phase === 'listen' ? '말하는 중' : '대답 예시'}</small>{t.live || (demo ? t.q.demo : '…')}</div>
          )}
          {t.phase === 'think' && <div className="bub ai"><small>하루</small><Dots /></div>}
        </div>
        <div className="ctrl">
          <div className="micbtn">
            <button className={`mic ${turn ? '' : 'off'}`} disabled={!turn} aria-label={t.phase === 'listen' ? '말하기 끝내기' : '말하기 시작'} onClick={() => (t.phase === 'listen' ? t.finish() : t.start())}><Mic /></button>
            <div>{t.phase === 'listen' ? <><b>듣고 있어요</b><span>다 말했으면 버튼을 한 번 더 눌러요</span></>
              : t.phase === 'ready' ? <><b>버튼을 누르고 말해요</b><span>천천히 말해도 괜찮아요</span></>
              : <><b>하루 차례예요</b><span>하루 말이 끝나면 다시 말할 수 있어요</span></>}</div>
          </div>
          <div className="row"><span className="small">질문 {t.i + 1} / {t.n}</span>{turn && <button className="btn ghost" onClick={() => t.finish(true)}>넘어갈게요</button>}</div>
        </div>
      </section>
    </div></main>
  )
}

// 2단계 시작 전: 마이크·카메라 확인 (내 얼굴은 여기서만 보여 준다)
export function Prep2({ go }: { go: (s: Screen) => void }) {
  const mic = useMic()
  const [cm, setCm] = useState<boolean | null>(null)
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => { getMedia('video').then((s) => { setCm(!!s); if (s && video.current) video.current.srcObject = s }) }, [])
  return (
    <main><div className="between">
      <div className="panel">
        <span className="badge">1단계를 마쳤어요</span>
        <h1 style={{ marginTop: 20 }}>다음은 하루와 <em>영상 통화</em>예요</h1>
        <p className="lead">이번엔 하루의 얼굴을 보면서 이야기를 이어 가요. 카메라로 시선과 표정도 함께 살펴봐요.</p>
        <div className="checks">
          <Check icon={<Mic />} title="마이크" ok={mic} okText="잘 들려요"><p>오늘 연습 잘 부탁드려요</p></Check>
          <Check icon={<Cam />} title="카메라" ok={cm} okText="잘 보여요"><p>{cm === false ? '카메라 없이도 계속할 수 있어요' : '얼굴이 동그라미 안에 오게 해 주세요'}</p></Check>
        </div>
        <p className="small" style={{ marginBottom: 20 }}>대화 중에는 내 얼굴을 띄우지 않아요. 영상은 저장하지 않아요.</p>
        <Foot go={go} next="talk2" label="2단계 시작하기" disabled={!mic} />
      </div>
      <div className="camchk"><video ref={video} autoPlay muted playsInline /><span className="note">확인할 때만 보여요</span>
        {cm === false ? <p className="none">카메라를 찾지 못했어요</p> : <div className="guide" />}</div>
    </div></main>
  )
}

const CamDot = () => (cam ? <span className="camdot"><i />카메라 켜짐</span> : null)

// 2단계: 가운데 하루 + 아래 질문 카드
export function Talk2({ done, name }: { done: () => void; name: string }) {
  const t = useTalk(STAGE2, 'haru', done)
  const pill = <span className="pill">질문 {t.i + 1} / {t.n}</span>
  return (
    <div className="s2">
      <CamDot />
      <div className={`figure ${t.phase === 'speak' ? 'talking' : t.phase === 'think' ? 'think' : ''}`} role="img" aria-label="하루" />
      <div className="card" style={t.phase === 'think' ? { padding: '40px 36px' } : undefined}>
        {t.phase === 'think' ? (
          <><span className="pill">답변을 듣는 중</span><p className="q sm" style={{ marginTop: 16 }}>하루가 {name || '내'} 님 이야기를 정리하고 있어요</p><div style={{ marginTop: 14 }}><Dots /></div></>
        ) : t.phase === 'listen' ? (
          <>{pill}<p className="q sm">{t.q.q}</p><Hint q={t.q} />
            <div className="listen"><Bars /><b>듣고 있어요</b><span className="small">천천히 말해도 괜찮아요</span></div>
            <div className="bot"><button className="link l" onClick={t.again}>처음부터 다시 말할게요</button>
              <button className="mic done" aria-label="다 말했어요" onClick={() => t.finish()}><svg className="ico" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" /></svg></button>
              <span className="small r">다 말했으면 눌러요</span></div></>
        ) : (
          <>{pill}<p className="q">{t.q.q}</p>{t.phase === 'ready' && <Hint q={t.q} />}
            <div className="bot"><span />
              <button className={`mic ${t.phase === 'ready' ? '' : 'off'}`} disabled={t.phase !== 'ready'} aria-label="말하기 시작" onClick={t.start}><Mic /></button>
              <button className="link r" onClick={() => t.finish(true)} disabled={t.phase !== 'ready'}>넘어갈게요 →</button></div></>
        )}
      </div>
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

// 3단계: 글 없이 면접관 화면만 꽉 차게
export function Talk3({ done, quit }: { done: () => void; quit: () => void }) {
  const t = useTalk(STAGE3, 'interviewer', done, true)
  const st = { speak: '질문하는 중', ready: '', listen: '듣고 있어요', think: '잘 들었어요' }[t.phase]
  const on = t.phase === 'listen'
  return (
    <div className="s3">
      <div className={`person ${t.phase === 'speak' ? 'talking' : ''}`} role="img" aria-label="실전 면접관" />
      <div className="top"><span><b>실전 면접</b> · 질문 {t.i + 1} / {t.n}</span>
        <span>{cam && <span style={{ marginRight: 20 }}>● 카메라 켜짐</span>}<button className="quit" onClick={quit}>그만하기</button></span></div>
      {on && <Hint q={t.q} />}
      <div className="bar"><Bars still={!on} /><span className="st">{st}</span>
        <button className="btn ghost" onClick={t.replay} disabled={t.phase === 'think'}>다시 들려주세요</button>
        <button className="btn ghost" onClick={() => t.finish(true)} disabled={!on}>넘어갈게요</button>
        <button className="btn dark" onClick={() => t.finish()} disabled={!on}>답변 마치기</button></div>
    </div>
  )
}

// 결과: 말하기 습관 + 시선과 표정 + 코치 노트 + 다시 연습할 단계 고르기 (모두 예시 값)
export function Result({ name, go }: { name: string; go: (s: Screen) => void }) {
  const [tab, setTab] = useState(1)
  useEffect(stopCam, [])
  const f = FACE[tab]
  return (
    <main>
      <h1>{name ? `${name} 님, ` : ''}<em>끝까지 해냈어요</em></h1>
      <p className="lead" style={{ marginBottom: 28 }}>세 단계에서 들은 말하기 습관을 정리했어요. 점수가 아니라 다음에 해 볼 것들이에요.</p>
      <div className="result">
        <div className="panel"><h2>말하기 습관</h2><p className="small">면접 인상에 영향을 주는 다섯 가지</p>
          <div className="habit"><Pentagon v={HABITS.map((h) => h.v)} size={240} labels={HABITS.map((h) => h.short)} />
            <ul>{HABITS.map((h) => <li key={h.name}><div>{h.name}<span className={h.good ? 'good' : ''}>{h.st}</span></div><p>{h.desc}</p></li>)}</ul></div></div>
        <div className="panel"><h2>시선과 표정</h2><p className="small">2·3단계 카메라로 살펴봤어요</p>
          <div className="tabs" role="tablist">{FACE.map((x, n) => <button key={x.tab} role="tab" aria-selected={n === tab} className={n === tab ? 'on' : ''} onClick={() => setTab(n)}>{x.tab}</button>)}</div>
          <div className="fstat"><span className="sb">{f.st}</span><p>{f.text}</p></div>
          {tab === 1 && <div className="tl">
            <div className="tlr"><b>2단계</b><div className="bar2"><i style={{ left: '12%', width: '7%' }} /><i style={{ left: '38%', width: '10%' }} /><i style={{ left: '70%', width: '6%' }} /></div></div>
            <div className="tlr"><b>3단계</b><div className="bar2"><i style={{ left: '22%', width: '5%' }} /><i style={{ left: '61%', width: '4%' }} /></div></div>
            <p className="small" style={{ marginTop: 6 }}>회색 칸이 시선을 다른 곳에 둔 순간이에요.</p></div>}
          <h2 style={{ marginTop: 24 }}>코치 노트</h2>
          <div className="coach">{COACH}</div></div>
      </div>
      <div className="panel again"><h2>더 연습해 볼까요?</h2><p className="small">연습하고 싶은 단계를 골라 다시 해 볼 수 있어요.</p>
        <div className="opts">
          <button className="opt rec" onClick={() => go('prep1')}><b>1단계 목소리 대화</b><span>"음, 어"를 줄이는 연습</span></button>
          <button className="opt" onClick={() => go('prep2')}><b>2단계 영상 통화</b><span>표정을 편하게 푸는 연습</span></button>
          <button className="opt" onClick={() => go('prep3')}><b>3단계 실전 면접</b><span>처음부터 다시 실전처럼</span></button>
        </div></div>
    </main>
  )
}
