import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import FilterForm from './components/FilterForm/FilterForm'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <FilterForm />
    </>
  )
}

export default App
