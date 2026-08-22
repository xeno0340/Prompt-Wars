import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import Round1Form from '../components/Round1Form'
import Round2Form from '../components/Round2Form'
import ChallengePopup from '../components/ChallengePopup'
import LeaderboardSidebar from '../components/LeaderboardSidebar'
import BattleParticipation from '../components/BattleParticipation'

const Dashboard = () => {
  const navigate = useNavigate()
  const [userData, setUserData] = useState(null)
  const [eventConfig, setEventConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeChallenge, setActiveChallenge] = useState(null)
  const [completedChallenges, setCompletedChallenges] = useState([])
  const [activeBattle, setActiveBattle] = useState(null)

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/login')
      return
    }

    const userUnsubscribe = onSnapshot(
      doc(db, 'participants', auth.currentUser.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data()
          setUserData(data)
          setCompletedChallenges(data.challengeHistory || [])
        }
        setLoading(false)
      }
    )

    const configUnsubscribe = onSnapshot(
      doc(db, 'eventConfig', 'config'),
      (snapshot) => {
        if (snapshot.exists()) {
          const config = snapshot.data()
          setEventConfig(config)
          
          // Check if challenge is active and not yet completed
          if (config.challengeActive && config.currentChallenge) {
            setCompletedChallenges(prev => {
              const alreadyCompleted = prev.some(
                ch => ch.challengeId === config.currentChallenge.id
              )
              
              if (!alreadyCompleted) {
                setActiveChallenge(config.currentChallenge)
              } else {
                setActiveChallenge(null)
              }
              
              return prev
            })
          } else {
            setActiveChallenge(null)
          }
        }
      }
    )

    return () => {
      userUnsubscribe()
      configUnsubscribe()
    }
  }, [navigate])

  // Listen for active battle
  useEffect(() => {
    if (!eventConfig?.activeBattleId) {
      setActiveBattle(null)
      return
    }

    const battleUnsubscribe = onSnapshot(
      doc(db, 'battles', eventConfig.activeBattleId),
      (snapshot) => {
        if (snapshot.exists()) {
          const battleData = { id: snapshot.id, ...snapshot.data() }
          
          // Check if current user is a participant
          const isParticipant = 
            battleData.participant1?.id === auth.currentUser?.uid ||
            battleData.participant2?.id === auth.currentUser?.uid
          
          if (isParticipant) {
            setActiveBattle(battleData)
          } else {
            setActiveBattle(null)
          }
        }
      }
    )

    return () => battleUnsubscribe()
  }, [eventConfig?.activeBattleId])

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const handleChallengeComplete = (isCorrect, penalty) => {
    setActiveChallenge(null)
    
    setTimeout(() => {
      if (isCorrect) {
        alert('✅ Challenge completed! No penalty.')
      } else {
        alert(`❌ Wrong answer! ${penalty} marks deducted.`)
      }
    }, 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen circuit-bg flex items-center justify-center">
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen circuit-bg">
      {/* Challenge Popup Overlay */}
      {activeChallenge && (
        <ChallengePopup 
          challenge={activeChallenge}
          onComplete={handleChallengeComplete}
        />
      )}

      {/* Header */}
      <div className="bg-deep-navy/50 border-b border-cyber-blue/20 sticky top-0 z-10 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-black">
                <span className="neon-text">PROMPT</span>{' '}
                <span className="gold-text">WARS</span>
              </h1>
              <p className="text-sm text-gray-400">April 8, 2026 • SANKETIKA</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-cyber-blue font-bold">{userData?.displayName}</p>
                <p className="text-xs text-gray-400">{userData?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr,320px] gap-6">
          {/* Left Column - Main Content */}
          <div className="space-y-8">
            {/* Status Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Round 1 Status */}
              <div className="cyber-card">
                <h3 className="text-lg font-bold mb-2 text-cyber-blue">Round 1</h3>
                <div className="flex items-center gap-2">
                  {userData?.round1?.status === 'not_started' && (
                    <span className="text-yellow-400">● Not Started</span>
                  )}
                  {userData?.round1?.status === 'pending' && (
                    <span className="text-blue-400">● Submitted</span>
                  )}
                  {userData?.round1?.status === 'evaluating' && (
                    <span className="text-blue-400">● Evaluating...</span>
                  )}
                  {userData?.round1?.status === 'evaluated' && !eventConfig?.top40Published && (
                    <span className="text-blue-400">● Evaluating...</span>
                  )}
                  {userData?.round1?.status === 'evaluated' && eventConfig?.top40Published && (
                    <span className="text-green-400">● Evaluated</span>
                  )}
                  {userData?.round1?.qualified && (
                    <span className="text-green-400 ml-2">✓ Qualified</span>
                  )}
                </div>
                {eventConfig?.top40Published && userData?.round1?.scores?.total !== undefined && (
                  <p className="text-2xl font-display mt-2">
                    {userData.round1.scores.total}/30
                  </p>
                )}
                {eventConfig?.top40Published && userData?.round1?.rank && (
                  <p className="text-sm text-gray-400 mt-1">Rank: #{userData.round1.rank}</p>
                )}
                {!eventConfig?.top40Published && userData?.round1?.status === 'evaluated' && (
                  <p className="text-sm text-yellow-400 mt-2">⏳ Results pending...</p>
                )}
              </div>

              {/* Round 2 Status */}
              <div className={`cyber-card ${!userData?.round1?.qualified && 'opacity-50'}`}>
                <h3 className="text-lg font-bold mb-2 text-cyber-blue">Round 2</h3>
                <div className="flex items-center gap-2">
                  {!userData?.round1?.qualified && (
                    <span className="text-gray-500">● Locked</span>
                  )}
                  {userData?.round1?.qualified && !userData?.round2?.submittedAt && (
                    <span className="text-yellow-400">● Available</span>
                  )}
                  {userData?.round2?.status === 'pending' && (
                    <span className="text-blue-400">● Submitted</span>
                  )}
                  {userData?.round2?.status === 'evaluated' && !eventConfig?.top8Published && (
                    <span className="text-blue-400">● Evaluating...</span>
                  )}
                  {userData?.round2?.status === 'evaluated' && eventConfig?.top8Published && (
                    <span className="text-green-400">● Evaluated</span>
                  )}
                </div>
                {eventConfig?.top8Published && userData?.round2?.scores?.total !== undefined && (
                  <>
                    <p className="text-2xl font-display mt-2">
                      {userData.round2.scores.total}/40
                    </p>
                    <p className="text-sm text-gray-400">
                      Cumulative: {userData.round2.cumulativeScore}/70
                    </p>
                  </>
                )}
                {!eventConfig?.top8Published && userData?.round2?.status === 'evaluated' && (
                  <p className="text-sm text-yellow-400 mt-2">⏳ Results pending...</p>
                )}
              </div>

              {/* Round 3 Status */}
              <div className={`cyber-card ${!userData?.round2?.qualified && 'opacity-50'}`}>
                <h3 className="text-lg font-bold mb-2 text-cyber-blue">Round 3</h3>
                {userData?.round2?.qualified ? (
                  <span className="text-green-400">● Qualified</span>
                ) : (
                  <span className="text-gray-500">● Locked</span>
                )}
              </div>
            </div>

            {/* Challenge History */}
            {completedChallenges.length > 0 && (
              <div className="cyber-card">
                <h3 className="text-lg font-bold mb-3 text-cyber-blue">Challenge History</h3>
                <div className="space-y-2">
                  {completedChallenges.map((ch, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        ch.correct 
                          ? 'bg-green-500/10 border-green-500/30' 
                          : 'bg-red-500/10 border-red-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={ch.correct ? 'text-green-400' : 'text-red-400'}>
                          {ch.correct ? '✅' : '❌'} Challenge #{idx + 1}
                        </span>
                        <span className="text-sm text-gray-400">
                          {ch.penalty !== 0 && (
                            <span className="text-red-400 font-bold">{ch.penalty} penalty</span>
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Round 3 Battle */}
            {activeBattle && userData?.round2?.qualified && (
              <BattleParticipation battle={activeBattle} />
            )}

            {/* Round Forms */}
            {eventConfig?.round1Active && !userData?.round1?.submittedAt && (
              <Round1Form 
                userData={userData} 
                eventConfig={eventConfig}
              />
            )}

            {eventConfig?.round2Active && userData?.round1?.qualified && !userData?.round2?.submittedAt && (
              <Round2Form 
                userData={userData} 
                eventConfig={eventConfig}
              />
            )}

            {/* Competition Not Started */}
            {eventConfig && !eventConfig?.round1Active && !eventConfig?.round2Active && !activeBattle && (
              <div className="cyber-card text-center py-12">
                <h2 className="text-3xl font-bold mb-4 neon-text">Competition Not Started</h2>
                <p className="text-gray-400 mb-6">
                  Round 1 will open at 10:00 AM on April 8th, 2026
                </p>
                <div className="text-5xl font-display">⏳</div>
              </div>
            )}

            {/* No Event Config */}
            {!eventConfig && (
              <div className="cyber-card text-center py-12">
                <h2 className="text-3xl font-bold mb-4 text-red-400">Event Not Initialized</h2>
                <p className="text-gray-400 mb-6">
                  Please contact event coordinators to initialize the competition.
                </p>
                <div className="text-5xl font-display">⚙️</div>
              </div>
            )}
          </div>

          {/* Right Column - Leaderboard Sidebar */}
          <div className="hidden lg:block">
            <LeaderboardSidebar />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard