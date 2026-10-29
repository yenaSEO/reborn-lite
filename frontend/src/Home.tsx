// 메인(첫 화면), 내 연습, 폰 안내 화면. 시안 main-v3와 flow-v2 12·13번을 옮겼다.
import { useEffect, useState, type ReactNode } from 'react'
import { HABITS } from './script'
import { Mic, Pentagon } from './ui'
import type { Progress, Screen } from './App'

const NEXT: Screen[] = ['prep1', 'prep2', 'prep3', 'result']
const STAGE = ['목소리 대화', '영상 통화', '실전 면접']

// 메인: 면접관 카드 3장, 단계 소개 4개, 자주 묻는 질문
export function Home({ p, go, start }: { p: Progress; go: (s: Screen) => void; start: (s: Screen) => void }) {
  const [dock, setDock] = useState(false)
  useEffect(() => {
    const on = () => setDock(scrollY > 500)
    addEventListener('scroll', on)
    return () => removeEventListener('scroll', on)
  }, [])
  const resume = p.done === 1 || p.done === 2

  return (
    <div className="home">
      <header><div className="wrap"><div className="logo">reborn</div>
        <nav className="hnav"><a href="#faq">자주 묻는 질문</a><button className="mine" onClick={() => go('mine')}>내 연습</button></nav></div></header>
      <section className="hero"><div className="wrap">
        <h1><em>천천히</em>, 한 단계씩</h1>
        <p className="lead">가벼운 대화부터 실전 면접까지 함께 연습해요.</p>
        <div className="fan">
          <div className="iv voice"><div className="ph"><div className="bars"><i /><i /><i /><i /><i /></div></div><Meta stage="1단계 · 목소리 대화" name="하루" say="편하게 이야기 나눠요." /></div>
          <div className="iv char"><div className="ph" style={{ backgroundImage: 'url(/haru.jpg)' }} /><Meta stage="2단계 · 영상 통화" name="하루" say="같은 하루를 이번엔 얼굴 보고 만나요." /></div>
          <div className="iv human"><div className="ph" style={{ backgroundImage: 'url(/interviewer.jpg)' }} /><Meta stage="3단계 · 실전 면접" name="실전 면접관" say="실제 면접처럼 질문해요." /></div>
        </div>
        {resume ? (
          <>
            <div className="resume"><div><b>{p.name ? `${p.name} 님, ` : ''}{p.done}단계까지 했어요</b><span>지난번 이야기에 이어서 {p.done + 1}단계를 시작해요.</span></div>
              <button className="btn" onClick={() => start(NEXT[p.done])}>{p.done + 1}단계 이어서 하기</button></div>
            <p className="note"><button className="link" onClick={() => start('prep1')}>처음부터 다시 하기</button></p>
          </>
        ) : (
          <>
            <button className="btn" onClick={() => start('prep1')}>연습 시작하기</button>
            <p className="note">이력서 없이 시작해요 · 약 15분 · 나눠서 해도 돼요</p>
          </>
        )}
      </div></section>

      {STEPS.map(([h, t, mock], i) => (
        <section key={h} className={i % 2 ? '' : 'alt'}><div className={`wrap step ${i % 2 ? 'flip' : ''}`}>
          <div className="txt"><span className="num">{i + 1}</span><h2>{h}</h2><p>{t}</p></div><div>{mock}</div>
        </div></section>
      ))}

      <section id="faq"><div className="wrap"><h2 className="center" style={{ marginBottom: 40 }}>자주 묻는 질문</h2>
        <div className="faq">{FAQ.map(([q, a]) => <div key={q}><b>{q}</b><p>{a}</p></div>)}</div></div></section>
      <footer><div className="wrap">reborn</div></footer>
      <div className={`dock ${dock ? 'on' : ''}`}><span>약 15분 · 로그인 없이 바로 시작해요</span>
        <button className="btn dark" onClick={() => start(resume ? NEXT[p.done] : 'prep1')}>연습 시작하기 →</button></div>
    </div>
  )
}

// 면접관 카드 아래 글
function Meta({ stage, name, say }: { stage: string; name: string; say: string }) {
  return <div className="meta"><div className="stage">{stage}</div><div className="name">{name}</div><div className="say">{say}</div></div>
}

const cam = <span className="cam"><i />카메라 켜짐</span>
const STEPS: [string, string, ReactNode][] = [
  ['목소리로 가볍게 이야기해요', '이력서나 자료는 필요 없어요. 이름, 요즘 관심사처럼 편한 이야기부터 말로 나눠요. 하루의 말은 채팅처럼 글로도 보여요.',
    <div className="mock chat"><div className="bub ai"><small>하루</small>안녕하세요! 오늘은 편하게 이야기 나눠요. 뭐라고 불러 드리면 될까요?</div><div className="bub me"><small>내 대답 (말로 했어요)</small>음… 민지라고 불러 주세요.</div><div className="bub ai"><small>하루</small>민지 님, 반가워요. 요즘 관심 있는 건 뭐예요?</div><div className="microw"><span className="mic"><Mic /></span>말하는 중… 다 말했으면 한 번 더 눌러요</div></div>],
  ['화면 속 하루와 영상 통화해요', '같은 하루가 이번엔 캐릭터로 나와요. 내 얼굴은 화면에 띄우지 않고, 카메라로 시선과 표정만 살펴봐요.',
    <div className="mock"><div className="call">{cam}<div className="cap">요즘 해 보고 싶은 일 있어요?</div></div></div>],
  ['실전처럼 면접을 봐요', '새 면접관이 하루와 나눈 이야기로 나에게 맞는 질문을 해요. 앞 단계에서 편안했던 정도에 맞춰 난이도도 바뀌어요.',
    <div className="mock"><div className="qbar"><span>실전 면접</span><b>질문 2 / 5</b></div><div className="prog"><i /></div><div className="call real">{cam}<div className="cap">사진 동아리 경험을 조금 더 이야기해 주세요.</div></div></div>],
  ['결과를 보고, 더 연습할 곳을 골라요', '세 단계를 마치면 말하기 습관과 시선·표정을 한 번에 정리해 드려요. 그걸 보고 더 연습하고 싶은 단계를 골라 다시 해 볼 수 있어요.',
    <div className="mock"><div className="report"><Pentagon v={HABITS.map((h) => h.v)} size={150} />
      <ul>{HABITS.slice(1).map((h) => <li key={h.name}>{h.name}<span>{h.st}</span></li>)}</ul></div>
      <div className="coach"><b>코치 노트</b> · 실전 면접에서 긴 멈춤이 줄었어요. (예시)</div>
      <div className="chips"><span className="on">1단계 다시 연습</span><span>2단계 다시 연습</span><span>3단계 다시 연습</span></div></div>],
]

const FAQ = [
  ['무엇이 필요한가요?', 'PC의 크롬 브라우저와 마이크가 필요해요. 2단계부터는 카메라도 써요.'],
  ['이력서가 필요한가요?', '아니요. 하루와 나눈 대화로 실전 면접 질문을 만들어요.'],
  ['한 번에 다 해야 하나요?', '아니요. 같은 컴퓨터로 다시 오면 하던 단계부터 이어서 할 수 있어요.'],
  ['내 얼굴이 화면에 나오나요?', '시작 전 카메라 확인 때만 잠깐 보여요. 면접 중에는 내 얼굴을 띄우지 않아요.'],
  ['내 목소리와 얼굴이 저장되나요?', '분석이 끝나면 바로 지워요. 얼굴 분석은 내 컴퓨터 안에서만 해요.'],
  ['중간에 그만둬도 되나요?', '언제든 멈출 수 있어요. 대답하기 어려운 질문은 "넘어갈게요"를 누르면 돼요.'],
]

// 내 연습: 단계 진행과 이어서 하기, 기록 지우기
export function Mine({ p, start, reset }: { p: Progress; start: (s: Screen) => void; reset: () => void }) {
  return (
    <main><div className="mine">
      <h1>{p.name ? `${p.name} 님의 연습` : '내 연습'}</h1>
      <p className="lead">하던 곳부터 이어서 할 수 있어요.</p>
      <div className="track3">
        {STAGE.map((t, i) => (
          <div key={t} className={`it ${i < p.done ? 'done' : i === p.done ? 'next' : ''}`}>
            <span className="n">{i + 1}</span>
            <div className="t"><b>{t}</b><span>{i < p.done ? '마쳤어요' : i === p.done ? (i ? '지난번 이야기에 이어서 시작해요' : '여기서 시작해요') : `${i}단계를 마치면 열려요`}</span></div>
            {i < p.done && <button className="link" onClick={() => start(NEXT[i])}>다시 하기</button>}
            {i === p.done && <button className="btn" onClick={() => start(NEXT[i])}>{i ? '이어서 하기' : '시작하기'}</button>}
          </div>
        ))}
      </div>
      {p.done >= 3
        ? <div className="empty-box"><button className="btn" onClick={() => start('result')}>결과 다시 보기</button></div>
        : <div className="empty-box">아직 결과가 없어요. 실전 면접까지 마치면 여기서 다시 볼 수 있어요.</div>}
      <p className="small" style={{ marginTop: 24 }}>연습 기록은 이 컴퓨터의 브라우저에만 저장돼요. <button className="link" style={{ textDecoration: 'underline' }} onClick={reset}>기록 지우기</button></p>
    </div></main>
  )
}

// 폰에서 연습을 시작하면 보이는 안내
export function Phone({ go }: { go: (s: Screen) => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="phone">
      <div className="logo">reborn</div>
      <div className="mid">
        <div className="ic"><svg className="ico" viewBox="0 0 24 24" style={{ width: 30, height: 30 }}><rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg></div>
        <h1>연습은 PC에서 할 수 있어요</h1>
        <p>마이크와 카메라를 편하게 쓰려면 노트북이나 PC의 크롬 브라우저로 들어와 주세요.</p>
      </div>
      <button className="btn" onClick={() => navigator.clipboard.writeText(location.origin).then(() => setCopied(true))}>{copied ? '복사했어요' : '링크 복사하기'}</button>
      <button className="link" style={{ justifyContent: 'center', marginTop: 14 }} onClick={() => go('home')}>소개 먼저 보기</button>
    </div>
  )
}
