// 결과 리포트: 이번 연습 정리 → 1 말하기 습관 → 2 시선과 표정 → 3 질문별 다시 보기 → 4 다음 연습.
// 같은 단계를 다시 했으면(again) 지난번 같은 단계와 비교한 값을 보여 주고, 스위치로 1→2→3단계 흐름도 볼 수 있다.
import { useEffect, useState, type ReactNode } from 'react'
import { AGAIN, FIRST, type Chip } from './report'
import { Pentagon } from './ui'
import { stopCam } from './voice'
import type { Screen } from './App'

const STAGE_OBJ = ['목소리 대화를', '영상 통화를', '실전 면접을']
const AXES = ['안정성', '유창성', '침묵 조절', '지속성', '에너지']
const MARK: Record<string, string> = { f: 'f', l: 'l', p: 'ps', k: 'lk' }

// 글 안의 **굵게**를 굵은 글씨로
const rich = (t: string) => t.split(/\*\*(.+?)\*\*/).map((s, i) => (i % 2 ? <b key={i}>{s}</b> : s))
// 상태 칩 (초록·노랑·주황)
const Tag = ({ c }: { c: Chip }) => <span className={`chip ${c[0]}`}>{c[1]}</span>

// 받아쓴 대답에 표시 입히기: [f:말버릇] [l:늘인 소리] [p:긴 멈춤] [k:바라보며 말한 부분]
function Script({ t }: { t: string }) {
  const p = t.split(/\[([flpk]):([^\]]+)\]/)
  const out: ReactNode[] = []
  for (let i = 0; i < p.length; i += 3) {
    out.push(p[i])
    if (i + 2 < p.length) out.push(<span key={i} className={MARK[p[i + 1]]}>{p[i + 2]}</span>)
  }
  return <div className="script">{out}</div>
}

// 표정 줄 아이콘 (선으로 그린 얼굴): 미소 / 평소 / 굳은 순간
const MOUTH = ['M8.5 14.2q3.5 3.2 7 0', 'M9 15h6', 'M8.5 15.2q.9-1 1.75 0t1.75 0 1.75 0 1.75 0']
const Face = ({ k }: { k: number }) => (
  <svg viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="9" /><circle cx="9" cy="10" r=".6" fill="currentColor" /><circle cx="15" cy="10" r=".6" fill="currentColor" />
    {k === 2 && <path d="M7.5 7.6l3 1.1M16.5 7.6l-3 1.1" />}<path d={MOUTH[k]} /></svg>
)

export function Result({ name, go, again }: { name: string; go: (s: Screen) => void; again: { stage: number; n: number } | null }) {
  useEffect(stopCam, [])
  const [flow, setFlow] = useState(false) // 다시 했을 때 1→2→3단계 흐름으로 볼지
  const [open, setOpen] = useState(0)
  const r = again ? AGAIN : FIRST
  const vs = again && !flow
  const fillers = vs && r.fillers.vs ? { ...r.fillers, ...r.fillers.vs } : r.fillers
  const pauses = vs && r.pauses.vs ? { ...r.pauses, ...r.pauses.vs } : r.pauses
  const [today] = useState(() => new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }))
  const meta = again ? [`${again.stage}단계 ${again.n}번째`, today, ...r.meta] : [r.meta[0], today, ...r.meta.slice(1)]

  return (
    <main className="rep">
      <h1>{name ? `${name} 님의` : '나의'} <em>연습 리포트</em></h1>
      <div className="meta">{meta.map((m, i) => <span key={m} className={i ? '' : 't'}>{m}</span>)}</div>

      <section className="sec" style={{ marginTop: 24 }}><div className="sh"><h2>이번 연습 정리</h2></div>
        {again && <div className="again2"><span><b>{again.stage}단계 {STAGE_OBJ[again.stage - 1]} {again.n}번째로</b> 했어요. 이번 결과는 <b>지난번 {again.stage}단계</b>와 비교했어요. 나머지 단계 결과는 지난번 그대로예요.</span></div>}
        <div className="top">
          <div className="say"><b className="h">코치의 한마디</b>{rich(r.coach)}</div>
          <div className="chips"><h4>잘하고 있어요</h4><div className="row">{r.good.map((t) => <span key={t} className="chip g">{t}</span>)}</div>
            <h4>연습하면 좋아져요</h4><div className="row">{r.next.map((t) => <span key={t} className="chip p">{t}</span>)}</div></div>
        </div></section>

      <section className="sec"><div className="sh"><span className="no">1</span><h2>말하기 습관</h2></div>
        <p className="sub">{again ? `이번 ${again.stage}단계에서` : '세 단계에서'} 들은 목소리를 다섯 가지로 살펴봤어요. 막대는 {vs ? `지난번 ${again.stage}단계와 이번 ${again.stage}단계예요` : '단계별 변화예요'}(높을수록 좋아요).</p>
        {again && <div className="vsw" role="tablist">{[`지난번 ${again.stage}단계와 비교`, '1→2→3단계 흐름 보기'].map((t, i) => (
          <button key={t} role="tab" aria-selected={flow === !!i} className={flow === !!i ? 'on' : ''} onClick={() => setFlow(!!i)}>{t}</button>))}</div>}
        <div className="clg"><span className="chip g">지금처럼 하면 돼요</span><span className="chip y">가끔 있어요</span><span className="chip p">다음 연습 포인트</span></div>
        <div className="hb"><Pentagon v={r.v} size={280} labels={AXES} />
          <ul className="rows">{r.habits.map((h) => {
            const bars = vs ? h.vs : h.flow
            const names = vs ? ['지난번', '이번'] : ['1단계', '2단계', '3단계']
            return (
              <li key={h.name}><b>{h.name}<small>{h.easy}</small></b><p>{rich(h.line)}</p>
                <div><div className="spark">{bars.map((v, i) => <i key={i} style={{ height: `${v}%` }} />)}</div><div className="sparkl">{names.map((n) => <span key={n}>{n}</span>)}</div></div>
                <Tag c={h.chip} /></li>)
          })}</ul></div>

        <div className="five">
          <div className="card"><h3>"음, 어" 같은 말 <Tag c={fillers.chip} /></h3><p className="k">발화 유창성</p>
            <div className="words">{fillers.words.map(([w, n]) => <span key={w}>"{w}"<small>{n}</small></span>)}</div>
            <div className="tick">{fillers.ticks.map((t, i) => <div key={i} className="seg">{t.map((x) => <i key={x} style={{ left: `${x}%` }} />)}</div>)}</div>
            <div className="tickl">{fillers.tickNames.map((n) => <span key={n}>{n}</span>)}</div>
            <p className="d">{rich(fillers.line)}</p></div>
          <div className="card"><h3>오래 멈추기 <Tag c={pauses.chip} /></h3><p className="k">침묵 조절력 · 3초 넘게 멈춘 순간</p>
            {pauses.rows.map(([n, ps]) => <div key={n} className="pz"><span>{n}</span><div className="ln">{ps.map(([x, s]) => <i key={x} className="lg" style={{ left: `${x}%`, width: '5%' }}><b>{s}</b></i>)}</div></div>)}
            <p className="d">{rich(pauses.line)}</p></div>
          <div className="card"><h3>소리 늘이기 <Tag c={r.prolong.chip} /></h3><p className="k">발화 지속성 · 한 소리를 길게 늘인 순간</p>
            <ul className="mo">{r.prolong.items.map(([u, rest, at]) => <li key={at}><q><u>{u}</u>{rest}</q><span>{at}</span></li>)}</ul>
            <p className="d">{rich(r.prolong.line)}</p></div>
          <div className="card"><h3>끝까지 또렷하게 <Tag c={r.energy.chip} /></h3><p className="k">발화 에너지 · 한 문장 안에서 목소리 크기</p>
            <div className="en">{r.energy.bars.map((v, i) => <i key={i} style={{ height: `${v}%` }} />)}</div>
            <div className="enl"><span>문장 처음</span><span>문장 끝</span></div>
            <p className="d">{rich(r.energy.line)}</p></div>
          <div className="card wide"><h3>목소리 떨림 <Tag c={r.tremor.chip} /></h3><p className="k">음성 안정성 · 실전 면접 동안 목소리가 얼마나 고르게 나왔는지 (참고용)</p>
            <div className="tr"><svg viewBox="0 0 600 84" preserveAspectRatio="none" aria-hidden><rect x="0" y="0" width="600" height="30" fill="#e3f2ef" /><polyline points={r.tremor.points} fill="none" stroke="#0e7c74" strokeWidth="3" /><line x1="0" y1="30" x2="600" y2="30" stroke="#9ad3c9" strokeDasharray="4 4" /></svg></div>
            <div className="trl">{['Q1', 'Q2', 'Q3', 'Q4', 'Q5'].map((q) => <span key={q}>{q}</span>)}</div>
            <p className="d">{rich(r.tremor.line)}</p></div>
        </div>
        <p className="src">다섯 가지는 목소리 분석 모델로, "음, 어" 같은 말의 단어와 횟수는 대답을 받아쓴 글로 셌어요. 지금 데모는 예시 값이에요.</p></section>

      <section className="sec"><div className="sh"><span className="no">2</span><h2>시선과 표정</h2></div><p className="sub">{r.faceSub}</p>
        <div className="fx"><div className="l"><h3>눈 깜빡임 <Tag c={r.blink.chip} /></h3><p className="what">1분에 몇 번 깜빡였는지</p>
            <p className="big">{r.blink.big}</p><p className="d">{rich(r.blink.line)}</p></div>
          <div><div className="track"><div className="ok" style={{ left: '20%', width: '40%' }} />
              {r.blink.pins.map(([t, x], i) => <span key={t} className={`pin ${i ? 'p3' : 'p2'} ${x <= r.blink.pins[1 - i][1] ? 'l' : 'r'}`} style={{ left: `${x}%` }}>{t}</span>)}
              {[['0', 0], ['10번', 20], ['30번', 60], ['50번', 100]].map(([t, x]) => <span key={t} className="lb" style={{ left: `${x}%` }}>{t}</span>)}</div>
            <div className="zones"><span style={{ width: '20%' }}>적게 깜빡임<br />(한곳을 오래 응시)</span><span style={{ width: '40%', color: 'var(--accent-ink)', fontWeight: 700 }}>편안한 범위</span><span style={{ width: '40%' }}>자주 깜빡임<br />(긴장할 때 늘어요)</span></div>
            <div className="hist">{r.blink.perQ.map((h, i) => <div key={i}><i style={{ height: h }} />Q{i + 1}</div>)}</div>
            <p className="d note">{r.blink.perQLine}</p></div></div>

        <div className="fx"><div className="l"><h3>눈 맞춤 <Tag c={r.gaze.chip} /></h3><p className="what">상대를 한 번 볼 때 얼마나 오래 바라봤는지</p>
            <p className="big">{r.gaze.big}</p>
            <div className="vs">{r.gaze.vs.map(([l, v], i) => <div key={l}><small>{l}</small><b style={i ? { color: 'var(--accent-ink)' } : undefined}>{v}</b></div>)}</div>
            <p className="d">{rich(r.gaze.line)}</p></div>
          <div className="gl"><p className="k">시선 흐름 · 바라본 시간과 다른 곳을 본 시간</p>
            {r.gaze.rows.map(([l, segs]) => <div key={l} className="row"><span>{l.split('\n').map((x, i) => <span key={x}>{i > 0 && <br />}{x}</span>)}</span>
              <div className="bar">{segs.map((f, i) => <i key={i} className={i % 2 ? 'a' : ''} style={{ flex: f }} />)}</div></div>)}
            <div className="qm"><span /><div>{['Q1', 'Q2', 'Q3', 'Q4', 'Q5'].map((q) => <span key={q}>{q}</span>)}</div></div>
            <div className="leg"><span>{r.gaze.legend[0]}</span><span className="a">{r.gaze.legend[1]}</span></div>
            <div className="hist" style={{ height: 70 }}>{r.gaze.hist.map((h, i) => <div key={i}><i className={i === 2 ? 'on' : ''} style={{ height: h }} />{['1초 미만', '1~3초', '3~5초', '5초 이상'][i]}</div>)}</div>
            <p className="d note">한 번 바라본 길이별 횟수 · 가장 자연스러운 3~5초가 가장 많았어요.</p></div></div>

        <div className="fx"><div className="l"><h3>표정 <Tag c={r.expr.chip} /></h3><p className="what">미소 지은 순간과 굳은(긴장한) 순간</p>
            {r.expr.vs.map(([l, a, b], i) => <div key={l} className="vs"><div><small>{l}</small><b>{a} → <span style={i ? { color: 'var(--accent-ink)' } : undefined}>{b}</span></b></div></div>)}
            <p className="d">{rich(r.expr.line)}</p></div>
          <div className="ex2"><p className="k">실전 면접 표정 흐름</p>
            <div className="bar" style={{ marginTop: 10 }}>{r.expr.segs.map(([t, f], i) => <i key={i} className={t === 'n' ? '' : t} style={{ flex: f }} />)}</div>
            <div className="gl"><div className="qm" style={{ gridTemplateColumns: '0 1fr' }}><span /><div>{['Q1', 'Q2', 'Q3', 'Q4', 'Q5'].map((q) => <span key={q}>{q}</span>)}</div></div></div>
            <div className="leg"><span className="s">미소</span><span className="t">굳은 순간</span><span className="n">평소 표정</span></div>
            <ul className="emo">{r.expr.emo.map(([pct, time, where], k) => (
              <li key={k} className={['s', '', 't'][k]}><Face k={k} />{['미소', '평소 표정', '굳은 순간'][k]}<div className="bar"><i style={{ width: pct }} /></div><span className="pc">{pct}</span>
                {where && <small>{where} · {time}</small>}</li>))}
              <li className="nt">미소는 많을수록 좋은 게 아니에요. 인사나 가벼운 이야기처럼 어울리는 순간에 자연스럽게 나오면 충분해요.</li></ul></div></div>
        <p className="said">{rich(r.said)}</p></section>

      <section className="sec"><div className="sh"><span className="no">3</span><h2>실전 면접 질문별로 다시 보기</h2></div>
        <p className="sub">내가 한 대답을 글로 다시 보면서, 말버릇과 멈춘 곳을 확인해요. 대답 내용은 평가하지 않아요.</p>
        {r.questions.map((q, i) => (
          <div key={q.q} className={`q ${open === i && q.script ? 'open' : ''}`}>
            <button className="qh" onClick={() => setOpen(open === i ? -1 : i)} disabled={!q.script} aria-expanded={open === i}>
              <span className="qn">Q{i + 1}</span><b>{q.q}</b><span className="st">길이 <b>{q.len}</b></span><span className="st">말버릇 <b>{q.fill}</b></span><span className="st">긴 멈춤 <b>{q.pause}</b></span><span>{q.script ? (open === i ? '▴' : '▾') : ''}</span></button>
            {open === i && q.script && <div className="qb"><p className="lbl">내 대답 (받아쓴 글)</p><Script t={q.script} />
              <div className="keys"><span className="k1">말버릇</span><span className="k2">소리 늘이기</span><span className="k3">긴 멈춤</span><span className="k4">면접관을 바라보며 말한 부분</span></div>
              <div className="qg"><div className="c good"><b>이 대답에서 좋았던 점</b><span>{rich(q.good ?? '')}</span></div><div className="c next"><b>다음엔 이렇게</b><span>{rich(q.next ?? '')}</span></div></div>
              {q.tell && <div className="tell"><b>더 잘 전달되는 순서</b><div><p>{rich(q.tell[0])}</p><q>{q.tell[1]}</q></div></div>}</div>}
          </div>))}</section>

      <section className="sec"><div className="sh"><span className="no">4</span><h2>다음 연습에서 해 볼 것</h2></div><p className="sub">이번 리포트에서 골랐어요. 한 번에 하나씩만 해 봐도 충분해요.</p>
        <div className="pri">{r.actions.map((a) => (
          <div key={a.title} className="pr"><span className="k">{a.k}</span><b>{a.title}</b><p>{a.why}</p>
            <ul>{a.todo.map((t) => <li key={t}>{t}</li>)}</ul><p className="ex">추천: {a.rec}</p></div>))}</div></section>

      <div className="panel again" style={{ marginTop: 0 }}><h2>더 연습해 볼까요?</h2><p className="small">연습하고 싶은 단계를 골라 다시 해 볼 수 있어요. 다시 하면 지난번 결과와 비교해 드려요.</p>
        <div className="opts">
          <button className="opt rec" onClick={() => go('prep1')}><b>1단계 목소리 대화</b><span>{r.actions[0].title} 연습</span></button>
          <button className="opt" onClick={() => go('prep2')}><b>2단계 영상 통화</b><span>표정을 편하게 푸는 연습</span></button>
          <button className="opt" onClick={() => go('prep3')}><b>3단계 실전 면접</b><span>처음부터 다시 실전처럼</span></button>
        </div></div>
    </main>
  )
}
