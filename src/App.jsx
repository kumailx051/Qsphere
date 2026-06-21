import { useEffect, useState } from 'react'
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
import CreateOpportunityPage from './pages/CreateOpportunityPage'
import EventsPage from './pages/EventsPage'
import EventDetailPage from './pages/EventDetailPage'
import PositionsPage from './pages/PositionsPage'
import PositionDetailPage from './pages/PositionDetailPage'
import NotFoundPage from './pages/NotFoundPage'

import ScrollToTop from './components/ScrollToTop'
import GlobalSnackbar from './components/GlobalSnackbar'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { hydrateGroupsCache } from './utils/groupStore'
import './App.css'

const DESKTOP_MIN_WIDTH = 1024

function App() {
  const basename = import.meta.env.BASE_URL
  const [isDesktopViewport, setIsDesktopViewport] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= DESKTOP_MIN_WIDTH,
  )

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

  useEffect(() => {
    const updateViewportAccess = () => {
      setIsDesktopViewport(window.innerWidth >= DESKTOP_MIN_WIDTH)
    }

    updateViewportAccess()
    window.addEventListener('resize', updateViewportAccess)

    return () => window.removeEventListener('resize', updateViewportAccess)
  }, [])

  return (
    <div className="App">
      {isDesktopViewport ? (
        <BrowserRouter basename={basename}>
          <ThemeProvider>
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
              <Route path="/events/new" element={<CreateOpportunityPage />} />
              <Route path="/positions/new" element={<CreateOpportunityPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/positions" element={<PositionsPage />} />
              <Route path="/positions/:id" element={<PositionDetailPage />} />
              <Route path="/projects/:id" element={<ProjectDetailsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      ) : (
        <main className="desktop-gate" aria-label="Desktop only access notice">
          <section className="desktop-gate__panel">
            <div className="desktop-gate__eyebrow">Desktop only</div>
            <h1 className="desktop-gate__title">Open QSphere on a desktop or laptop</h1>
            <p className="desktop-gate__copy">
              This website is currently available only on larger screens. Mobile and tablet access is disabled while the dedicated app experience is being built.
            </p>
            <p className="desktop-gate__hint">
              Please reopen this site on a desktop browser to continue.
            </p>
          </section>
        </main>
      )}
    </div>
  )
}

export default App
