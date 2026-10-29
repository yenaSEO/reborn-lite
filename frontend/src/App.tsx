// 경량 웹 데모의 뼈대: 지금 어느 화면인지 정하고, 단계 진행을 브라우저(localStorage)에 저장한다.
// ?screen=result 처럼 주소로 화면을 바로 열 수 있다(판넬 캡처용). ?demo=1이면 대답 예시 글이 보인다.
import { useState } from 'react'
import { Home, Mine, Phone } from './Home'
import { Prep1, Prep2, Prep3, Profile, Result, Talk1, Talk2, Talk3 } from './Flow'
import { stopCam, stopSpeak } from './voice'

export type Screen = 'home' | 'mine' | 'phone' | 'prep1' | 'talk1' | 'prep2' | 'talk2' | 'profile' | 'prep3' | 'talk3' | 'result'
export type Progress = { done: number; name: string } // done: 마친 단계 수(0~3)

const KEY = 'reborn'
const STEP: Partial<Record<Screen, number>> = { prep1: 1, talk1: 1, prep2: 2, talk2: 2, profile: 2, prep3: 3, talk3: 3, result: 4 }
const STEPS = ['목소리 대화', '영상 통화', '실전 면접', '결과']
const isPhone = () => matchMedia('(max-width: 760px), (pointer: coarse)').matches

// 저장된 진행 읽기. 없거나 깨졌으면 처음부터
function load(): Progress {
  try {
    return { done: 0, name: '', ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return { done: 0, name: '' }
  }
}

// 화면 전환과 진행 저장
export default function App() {
  const [screen, setScreen] = useState<Screen>(() => (new URLSearchParams(location.search).get('screen') as Screen) || 'home')
  const [p, setP] = useState(load)

  const go = (s: Screen) => {
    if (s === 'home' || s === 'mine') { stopSpeak(); stopCam() }
    setScreen(s)
    scrollTo(0, 0)
  }
  const start = (s: Screen) => go(isPhone() ? 'phone' : s)
  const save = (q: Partial<Progress>) => {
    const next = { ...p, ...q, done: Math.max(p.done, q.done ?? 0) }
    setP(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* 저장이 막힌 브라우저면 이어서 하기만 안 된다 */ }
  }
  const reset = () => { try { localStorage.removeItem(KEY) } catch { /* 위와 같음 */ } setP({ done: 0, name: '' }) }

  if (screen === 'home') return <Home p={p} go={go} start={start} />
  if (screen === 'phone') return <Phone go={go} />
  if (screen === 'talk3') return <Talk3 done={() => { save({ done: 3 }); go('result') }} quit={() => { save({ done: 3 }); go('result') }} />

  const n = STEP[screen] ?? 0
  return (
    <>
      <header><div className="in">
        <button className="logo" onClick={() => go('home')}>reborn</button>
        <nav className="steps">{n > 0 && STEPS.map((t, i) => (
          <span key={t} style={{ display: 'contents' }}>{i > 0 && <b />}<span className={i + 1 < n ? 'done' : i + 1 === n ? 'now' : ''}><i>{i + 1}</i>{t}</span></span>
        ))}</nav>
        <button className="quit" onClick={() => go('home')}>{n > 0 && n < 4 ? '그만하기' : '처음으로'}</button>
      </div></header>
      {screen === 'mine' && <Mine p={p} start={start} reset={reset} />}
      {screen === 'prep1' && <Prep1 go={go} />}
      {screen === 'talk1' && <Talk1 done={() => { save({ done: 1 }); go('prep2') }} />}
      {screen === 'prep2' && <Prep2 go={go} />}
      {screen === 'talk2' && <Talk2 name={p.name} done={() => go('profile')} />}
      {screen === 'profile' && <Profile go={go} save={(name) => save({ done: 2, name })} />}
      {screen === 'prep3' && <Prep3 go={go} />}
      {screen === 'result' && <Result name={p.name} go={go} />}
    </>
  )
}
