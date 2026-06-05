import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import AuthPage from './pages/AuthPage'
import OtpPage from './pages/OtpPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import AccountManagementPage from './pages/AccountManagementPage'
import BlogPage from './pages/BlogPage'
import BlogDetail from './pages/BlogDetail'
import CreateBlogPage from './pages/CreateBlogPage'
import CreateGroupPage from './pages/CreateGroupPage'
import GroupsPage from './pages/GroupsPage'
import GroupDetailPage from './pages/GroupDetailPage'

import ScrollToTop from './components/ScrollToTop'
import './App.css'

function App() {
  const basename = import.meta.env.BASE_URL

  useEffect(() => {
    document.body.style.background = '#000'
  }, [])

  return (
    <div className="App">
      <BrowserRouter basename={basename}>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/otp" element={<OtpPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/account" element={<AccountManagementPage />} />
          <Route path="/blogs" element={<BlogPage />} />
          <Route path="/blogs/new" element={<CreateBlogPage />} />
          <Route path="/blogs/:id" element={<BlogDetail />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/:id" element={<GroupDetailPage />} />
          <Route path="/groups/new" element={<CreateGroupPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App
