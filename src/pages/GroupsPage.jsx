import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const GroupsPage = () => {
  const [filters, setFilters] = useState({
    all: true,
    my: true,
    requested: true
  })

  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [requestingGroupIds, setRequestingGroupIds] = useState({})
  const [membershipStatusByGroupId, setMembershipStatusByGroupId] = useState({})

  const currentUserEmail = typeof window !== 'undefined' ? (
    (JSON.parse(localStorage.getItem('qsphere_onboarding_profile') || '{}')).emailAddress ||
    localStorage.getItem('qsphere_email') ||
    ''
  ) : ''

  useEffect(() => {
    fetch('/api/groups')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setGroups(data)
      })
      .catch(err => console.error('Error fetching groups:', err))
  }, [])

  useEffect(() => {
    if (!currentUserEmail || groups.length === 0) return

    let isCancelled = false

    const loadMembershipStatuses = async () => {
      try {
        const statuses = await Promise.all(
          groups.map(async (group) => {
            const status = await fetchMembershipStatus(group.id)
            return [group.id, status]
          })
        )

        if (isCancelled) return

        setMembershipStatusByGroupId(
          statuses.reduce((acc, [groupId, status]) => {
            if (status) acc[groupId] = status
            return acc
          }, {})
        )
      } catch (_error) {
        if (!isCancelled) {
          setMembershipStatusByGroupId({})
        }
      }
    }

    loadMembershipStatuses()

    return () => {
      isCancelled = true
    }
  }, [groups, currentUserEmail])

  const toggleFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const showSnackbar = (message, type = 'success') => {
    if (typeof window === 'undefined') return

    window.dispatchEvent(
      new CustomEvent('qsphere-snackbar', {
        detail: { message, type }
      })
    )
  }

  const fetchMembershipStatus = async (groupId) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members`)
      if (!res.ok) return null

      const members = await res.json()
      const currentMember = Array.isArray(members)
        ? members.find((member) => member.email === currentUserEmail)
        : null

      return currentMember?.status || null
    } catch (_error) {
      return null
    }
  }

  const filterConfig = [
    { key: 'all', label: 'All Groups' },
    { key: 'my', label: 'My Groups' },
    { key: 'requested', label: 'Requested Groups' }
  ]

  return (
    <div className="relative bg-[#060a06]" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar currentPage="groups" />
      
      {/* Navigation helper */}
      
      
      {/* Background elements */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 bg-[#060a06]" />
        <div 
          className="absolute inset-0 opacity-40" 
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(16,185,129,0.15) 0%, transparent 70%)',
          }} 
        />
        <div 
          className="absolute inset-0 opacity-20" 
          style={{
            background: 'radial-gradient(circle at 100% 100%, rgba(6,182,212,0.15) 0%, transparent 50%)',
          }} 
        />
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex-grow px-6 md:px-10 lg:px-14 pt-32 pb-24">
        <div className="mx-auto max-w-5xl">
          
          {/* Header */}
          <div className="mb-12" style={{ animation: 'fadeUp 0.6s ease-out both' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="h-2 w-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 10px rgba(16,185,129,0.8)' }} />
              <span className="text-emerald-400 text-[10px] tracking-[0.3em] font-semibold uppercase">Community</span>
            </div>
            <h1 className="text-white font-black text-4xl md:text-5xl lg:text-6xl tracking-tight mb-4" style={{ fontFamily: "'Archivo Black', 'Inter', sans-serif" }}>
              Research <span className="text-emerald-400">Groups</span>
            </h1>
            <p className="text-white/50 text-sm md:text-base max-w-2xl leading-relaxed">
              Join collaborative workspaces, share knowledge, and contribute to cutting-edge quantum projects with researchers worldwide.
            </p>
          </div>

          {/* Filters & Controls */}
          <div 
            className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 p-5 rounded-2xl border border-white/[0.05] bg-white/[0.02] backdrop-blur-xl"
            style={{ animation: 'fadeUp 0.6s ease-out 0.1s both' }}
          >
            {/* Custom Checkbox filters */}
            <div className="flex flex-wrap items-center gap-6">
              {filterConfig.map(f => (
                <label key={f.key} className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-5 h-5 rounded-[4px] border border-white/20 bg-black/50 group-hover:border-emerald-400/50 transition-colors">
                    {filters[f.key] && (
                      <span className="w-3 h-3 rounded-[2px] bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)] flex items-center justify-center">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </span>
                    )}
                  </div>
                  <span className={`text-sm font-medium transition-colors ${filters[f.key] ? 'text-white' : 'text-white/50 group-hover:text-white/80'}`}>
                    {f.label}
                  </span>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={filters[f.key]}
                    onChange={() => toggleFilter(f.key)} 
                  />
                </label>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button className="flex items-center gap-3 px-5 py-3 rounded-xl border border-white/10 bg-black/60 text-sm text-white hover:bg-white/5 transition-colors shadow-lg">
                <span className="font-bold">Recent Groups</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Groups List */}
          <div className="space-y-5" style={{ perspective: '1000px' }}>
            {groups.filter((group) => {
              if (filters.all) return true
              const status = membershipStatusByGroupId[group.id]
              if (filters.my && status === 'Active') return true
              if (filters.requested && status === 'Pending') return true
              return false
            }).map((group, index) => {
              const isRequesting = Boolean(requestingGroupIds[group.id])
              const membershipStatus = membershipStatusByGroupId[group.id]
              const isRequestSent = membershipStatus === 'Pending'
              const isJoined = membershipStatus === 'Active'

              return (
                <div
                  key={group.id}
                  className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 md:p-8 rounded-3xl border border-white/[0.05] bg-white/[0.02] backdrop-blur-md transition-all duration-300 hover:bg-white/[0.04] hover:border-emerald-400/20 hover:-translate-y-1"
                  style={{ animation: `fadeUp 0.6s ease-out ${0.2 + index * 0.1}s both` }}
                >
                  {/* Hover Glow */}
                  <div
                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ boxShadow: 'inset 0 0 30px rgba(16,185,129,0.05)' }}
                  />

                  {/* Left: Info & Buttons */}
                  <div className="relative z-10 flex-1">
                    <h3 className="text-white font-bold text-xl md:text-2xl mb-1 group-hover:text-emerald-300 transition-colors" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {group.groupTitle}
                    </h3>
                    {group.groupDescription && (
                      <p className="text-white/70 text-sm md:text-base mb-2">
                        {group.groupDescription}
                      </p>
                    )}
                    <p className="text-white/40 text-sm italic mb-6">
                      Scope: {group.groupScope}
                    </p>

                    <div className="flex flex-wrap items-center gap-4">
                      <button onClick={() => {
                        const logged = typeof window !== 'undefined' && localStorage.getItem('qsphere_logged_in') === '1'
                        if (!logged) {
                          navigate('/auth', { state: { redirectTo: `/groups/${group.id}` } })
                          return
                        }
                        navigate(`/groups/${group.id}`)
                      }} className="px-6 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-white/80 text-sm font-semibold hover:bg-white/[0.08] hover:text-white transition-all">
                        Details...
                      </button>
                      {currentUserEmail !== group.ownerEmail && (
                        isJoined ? (
                          <span className="px-6 py-2.5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200 text-sm font-semibold cursor-default select-none">
                            Joined
                          </span>
                        ) : (
                          <button
                            disabled={isRequesting || isRequestSent}
                            onClick={async () => {
                              const logged = typeof window !== 'undefined' && localStorage.getItem('qsphere_logged_in') === '1'
                              if (!logged) {
                                navigate('/auth', { state: { redirectTo: '/groups' } })
                                return
                              }

                              if (!currentUserEmail) {
                                showSnackbar('Unable to identify your account', 'error')
                                return
                              }

                              if (isRequesting || isRequestSent) return

                              setRequestingGroupIds(prev => ({ ...prev, [group.id]: true }))

                              try {
                                const res = await fetch(`/api/groups/${group.id}/members`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ userEmail: currentUserEmail })
                                })
                                const data = await res.json().catch(() => null)

                                if (!res.ok) {
                                  const errorMessage = data?.error || 'Failed to send request'
                                  const alreadyRequested = /already exists|already in group/i.test(errorMessage)

                                  if (alreadyRequested) {
                                    const latestStatus = await fetchMembershipStatus(group.id)
                                    setMembershipStatusByGroupId(prev => ({
                                      ...prev,
                                      [group.id]: latestStatus || 'Pending'
                                    }))
                                    showSnackbar('Request is sent successfully', 'success')
                                    return
                                  }

                                  showSnackbar(errorMessage, 'error')
                                  return
                                }

                                setMembershipStatusByGroupId(prev => ({ ...prev, [group.id]: 'Pending' }))
                                showSnackbar('Request is sent successfully', 'success')
                              } catch (_err) {
                                showSnackbar('Network error', 'error')
                              } finally {
                                setRequestingGroupIds(prev => {
                                  const next = { ...prev }
                                  delete next[group.id]
                                  return next
                                })
                              }
                            }}
                            className={`px-6 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                              isRequestSent
                                ? 'border-white/10 bg-white/10 text-white/45 cursor-not-allowed hover:bg-white/10 hover:border-white/10'
                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                            } ${isRequesting ? 'opacity-80 cursor-wait' : ''}`}
                          >
                            {isRequestSent ? 'Request Sent' : isRequesting ? 'Sending...' : 'Request to Join'}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Right: Owner Avatar */}
                  <div className="relative z-10 flex sm:flex-col items-center gap-4 sm:gap-3 sm:min-w-[140px] pt-5 sm:pt-0 border-t border-white/5 sm:border-t-0 mt-2 sm:mt-0">
                    <div className="w-14 h-14 rounded-full border border-emerald-400/30 p-0.5 bg-black/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:border-emerald-400/60 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all">
                      <div className="w-full h-full rounded-full bg-white/10 overflow-hidden flex items-center justify-center">
                        <img src={group.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(group.owner || 'U')}`} alt={group.owner} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-white/90 text-sm font-bold">{group.owner}</div>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>

        </div>
      </main>

      <Footer />

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default GroupsPage
