import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import IncomeStatement from './pages/IncomeStatement'
import './index.css'

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')

  const renderPage = () => {
    switch (currentPage) {
      case 'income-statement':
        return <IncomeStatement onNavigate={setCurrentPage} />
      case 'dashboard':
      default:
        return <Dashboard onNavigate={setCurrentPage} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {renderPage()}
    </div>
  )
}

export default App

