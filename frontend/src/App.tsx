// 빈 뼈대 화면: 서버 /health 응답을 받아 연결됐는지만 보여 준다.
import { useEffect, useState } from 'react'

// 배포에서는 Render가 서버 주소를 넣어 주고, 내 컴퓨터에서는 5000번 포트를 쓴다.
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

// 서버 상태를 한 줄로 보여 주는 화면
export default function App() {
  const [status, setStatus] = useState('서버 확인 중…')

  useEffect(() => {
    fetch(`${API}/health`)
      .then((r) => r.json())
      .then((d) => setStatus(`서버 연결됨 (${d.status})`))
      .catch(() => setStatus('서버에 연결하지 못했어요 (무료 서버는 깨어나는 데 1분쯤 걸려요)'))
  }, [])

  return (
    <main>
      <h1>reborn</h1>
      <p>{status}</p>
    </main>
  )
}
