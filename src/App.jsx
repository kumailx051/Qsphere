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
import ProjectDetailsPage from './pages/ProjectDetailsPage'
import NotFoundPage from './pages/NotFoundPage'

import ScrollToTop from './components/ScrollToTop'
import GlobalSnackbar from './components/GlobalSnackbar'
import { AuthProvider } from './contexts/AuthContext'
import { hydrateGroupsCache } from './utils/groupStore'
import './App.css'

function App() {
  const basename = import.meta.env.BASE_URL

  useEffect(() => {
    document.body.style.background = '#000'
  }, [])

  useEffect(() => {
    const checkSession = () => {
      const loginTime = localStorage.getItem('qsphere_login_time')
      const rememberMe = localStorage.getItem('qsphere_remember_me') === '1'
      const loggedIn = localStorage.getItem('qsphere_logged_in') === '1'

      if (loggedIn && loginTime && !rememberMe) {
        const TWO_HOURS = 2 * 60 * 60 * 1000
        if (Date.now() - parseInt(loginTime, 10) > TWO_HOURS) {
          localStorage.removeItem('qsphere_logged_in')
          localStorage.removeItem('qsphere_onboarding_profile')
          localStorage.removeItem('qsphere_login_time')
          window.location.reload()
        }
      }
    }

    checkSession()
    const interval = setInterval(checkSession, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    void hydrateGroupsCache()
  }, [])

  return (
    <div className="App">
      <BrowserRouter basename={basename}>
        <AuthProvider>
          <ScrollToTop />
          <GlobalSnackbar />
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
            <Route path="/projects/:id" element={<ProjectDetailsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  )
}

export default App
