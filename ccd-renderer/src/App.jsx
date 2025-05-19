import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import './index.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <div className="bg-red-500 text-white p-10 rounded-xl">
  TailwindCSS 적용 확인용 블록입니다~람쥐
</div>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="text-3xl font-bold text-blue-600">
        <button onClick={() => setCount((count) => count + 1)}>
          checkche dckcheck {count}
        </button>
        <p>
          왜 안바뀌죠??? <code>src/App.jsx</code> and save to test HMR
        </p>
            <div className="p-4 bg-blue-500 text-white rounded-xl">
            Hello Tailwind!
          </div>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
