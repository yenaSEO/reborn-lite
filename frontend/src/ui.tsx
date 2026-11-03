// 여러 화면이 같이 쓰는 작은 조각: 아이콘, 물결, 오각형 차트, 확인 줄.
import type { ReactNode } from 'react'

// 마이크 아이콘
export const Mic = () => <svg className="ico" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
// 카메라 아이콘
export const Cam = () => <svg className="ico" viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3" /></svg>
// 소리 물결 (still이면 멈춤)
export const Bars = ({ still }: { still?: boolean }) => <div className={`bars ${still ? 'still' : ''}`}><i /><i /><i /><i /><i /></div>
export const Dots = () => <span className="dots"><i /><i /><i /></span>

// 말하기 습관 오각형: v는 축 5개의 0~1 값, labels가 있으면 꼭짓점 밖에 축 이름을 단다
export function Pentagon({ v, size = 200, labels }: { v: number[]; size?: number; labels?: string[] }) {
  const xy = (k: number, s: number) => {
    const a = ((-90 + 72 * k) * Math.PI) / 180
    return [100 + 72 * s * Math.cos(a), 100 + 72 * s * Math.sin(a)]
  }
  const pts = (f: (k: number) => number) => v.map((_, k) => xy(k, f(k)).map((n) => n.toFixed(1)).join(',')).join(' ')
  return (
    <svg viewBox={labels ? "-40 -12 280 224" : "0 0 200 200"} width={size} height={size} role="img" aria-label="말하기 습관 다섯 가지 모양">
      {[1, 0.66, 0.33].map((s) => <polygon key={s} points={pts(() => s)} fill="none" stroke="#e6e8eb" />)}
      <polygon points={pts((k) => v[k])} fill="rgba(14,124,116,.18)" stroke="#0e7c74" strokeWidth="2.5" />
      {v.map((s, k) => { const [x, y] = xy(k, s); return <circle key={k} cx={x} cy={y} r="3.5" fill="#0e7c74" /> })}
      {labels?.map((t, k) => {
        const [x, y] = xy(k, 1.2)
        return <text key={t} x={x} y={y + 4} fontSize="13" fontWeight="600" fill="#4a5059" textAnchor={k === 0 ? 'middle' : k < 3 ? 'start' : 'end'}>{t}</text>
      })}
    </svg>
  )
}

// 둘러보기 모드(?look): 자문·검토용. 말하지 않고 질문을 넘기며 화면 흐름만 볼 수 있다
export const look = new URLSearchParams(location.search).has('look')
if (look) document.body.classList.add('look') // 안내 띠 자리만큼 1단계 채팅 칸을 줄인다(styles.css)

// 둘러보기 모드 안내 띠. 대화 화면에서는 next(다음 질문)·end(이 단계 끝으로) 버튼이 붙는다
export function LookBar({ next, end }: { next?: () => void; end?: () => void }) {
  if (!look) return null
  return (
    <div className="lookbar">
      <span><b>둘러보기 모드</b> · 질문과 하루·면접관의 말은 아직 다듬는 중이고, 결과는 예시 값이에요</span>
      {next && <button onClick={next}>다음 질문 →</button>}
      {end && <button onClick={end}>이 단계 끝으로 ⏭</button>}
    </div>
  )
}

// 단계 시작 때 마이크·카메라 확인 줄. ok가 null이면 확인 중
export function Check({ icon, title, children, ok, okText }: { icon: ReactNode; title: string; children: ReactNode; ok: boolean | null; okText: string }) {
  return (
    <div className="check">
      <span className="ic">{icon}</span>
      <div className="t"><b>{title}</b>{children}</div>
      <span className={`ok ${ok ? '' : 'wait'}`}><i />{ok ? okText : ok === null ? '확인 중' : '허용이 필요해요'}</span>
    </div>
  )
}
