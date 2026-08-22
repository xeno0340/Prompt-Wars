import { useState, useEffect } from 'react'
import { collection, getDocs, doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

const Leaderboard = () => {
  const [participants, setParticipants] = useState([])
  const [eventConfig, setEventConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showConfetti, setShowConfetti] = useState(false)
  const [commentaryIndex, setCommentaryIndex] = useState(0)

  const commentaryMessages = [
    "🔥 The competition is heating up!",
    "⚡ Who will make it to the Top 40?",
    "🎯 Every prompt counts!",
    "🚀 Watch the leaderboard shift in real-time!",
    "💪 The battle for Top 8 begins!",
    "🏆 Champions are being forged!",
    "⭐ Prompt engineering excellence on display!",
    "🎨 Creativity meets technical mastery!",
    "🔮 The final rankings are taking shape!",
    "👑 Who will claim the throne?"
  ]

  // Load participants
  useEffect(() => {
    const loadParticipants = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'participants'))
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        setParticipants(data)
        setLoading(false)
      } catch (error) {
        console.error('Error loading participants:', error)
      }
    }

    loadParticipants()

    // Refresh every 30 seconds
    const interval = setInterval(loadParticipants, 30000)
    return () => clearInterval(interval)
  }, [])

  // Listen to event config changes
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'eventConfig', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        const config = snapshot.data()
        setEventConfig(config)
        
        // Trigger confetti when Top 40 is published
        if (config.top40Published && !showConfetti) {
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 10000) // 10 seconds of confetti
        }
      }
    })

    return () => unsubscribe()
  }, [showConfetti])

  // Rotating commentary
  useEffect(() => {
    const interval = setInterval(() => {
      setCommentaryIndex(prev => (prev + 1) % commentaryMessages.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [commentaryMessages.length])

  // Sort participants
  const getSortedParticipants = () => {
    return participants
      .filter(p => p.round1?.scores?.total !== undefined)
      .sort((a, b) => {
        const scoreA = b.round2?.cumulativeScore || b.round1?.scores?.total || 0
        const scoreB = a.round2?.cumulativeScore || a.round1?.scores?.total || 0
        return scoreB - scoreA
      })
  }

  const sortedParticipants = getSortedParticipants()

  if (loading) {
    return (
      <div className="min-h-screen circuit-bg flex items-center justify-center">
        <div className="text-center">
          <div className="loading-dots mb-4">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p className="text-2xl text-cyber-blue font-display">Loading Leaderboard...</p>
        </div>
      </div>
    )
  }

  const evaluatedCount = participants.filter(p => p.round1?.status === 'evaluated').length
  const totalCount = participants.filter(p => p.round1?.submittedAt).length

  return (
    <div className="min-h-screen circuit-bg relative overflow-hidden">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: ['#00D4FF', '#FFB800', '#B026FF', '#FF6B6B'][Math.floor(Math.random() * 4)]
              }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-deep-navy via-cyber-blue/10 to-deep-navy border-b-2 border-cyber-blue/40 py-8">
        <div className="container mx-auto px-6">
          <h1 className="text-6xl font-display font-black text-center mb-2">
            <span className="neon-text">PROMPT</span>{' '}
            <span className="gold-text">WARS</span>{' '}
            <span className="text-cyber-blue">2026</span>
          </h1>
          <p className="text-center text-2xl text-gray-400 font-display">
            LIVE LEADERBOARD
          </p>
          
          {/* Status Bar */}
          <div className="mt-6 flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-4xl font-display font-black text-electric-gold">{sortedParticipants.length}</p>
              <p className="text-sm text-gray-400">Ranked</p>
            </div>
            <div className="h-12 w-px bg-cyber-blue/30"></div>
            <div className="text-center">
              <p className="text-4xl font-display font-black text-cyber-blue">{totalCount}</p>
              <p className="text-sm text-gray-400">Submitted</p>
            </div>
            <div className="h-12 w-px bg-cyber-blue/30"></div>
            <div className="text-center">
              <p className="text-4xl font-display font-black text-green-400">{evaluatedCount}</p>
              <p className="text-sm text-gray-400">Evaluated</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Before Publishing */}
        {!eventConfig?.top40Published && (
          <div className="cyber-card text-center py-16 mb-8">
            <div className="text-6xl mb-6">⏳</div>
            <h2 className="text-4xl font-display font-black text-cyber-blue mb-4">
              Evaluation In Progress
            </h2>
            <p className="text-2xl text-gray-400 mb-6">
              {evaluatedCount}/{totalCount} submissions evaluated
            </p>
            <div className="max-w-2xl mx-auto">
              <div className="bg-cyber-blue/10 rounded-full h-6 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyber-blue to-electric-gold h-full transition-all duration-1000"
                  style={{ width: `${(evaluatedCount / totalCount) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* After Publishing - Full Leaderboard */}
        {eventConfig?.top40Published && sortedParticipants.length > 0 && (
          <div className="space-y-4">
            {/* Top 10 Highlight */}
            <div className="mb-8">
              <h2 className="text-3xl font-display font-black text-center mb-6 neon-text">
                🏆 TOP 10 🏆
              </h2>
              <div className="grid gap-3">
                {sortedParticipants.slice(0, 10).map((participant, index) => (
                  <div
                    key={participant.id}
                    className={`cyber-card border-2 ${
                      index === 0 
                        ? 'border-electric-gold bg-gradient-to-r from-electric-gold/20 to-transparent' 
                        : index === 1 
                        ? 'border-gray-400 bg-gradient-to-r from-gray-400/20 to-transparent'
                        : index === 2
                        ? 'border-orange-600 bg-gradient-to-r from-orange-600/20 to-transparent'
                        : 'border-cyber-blue/40'
                    } p-6 flex items-center justify-between transform hover:scale-105 transition-transform`}
                  >
                    <div className="flex items-center gap-6">
                      <div className={`text-5xl font-display font-black ${
                        index === 0 ? 'text-electric-gold' : 
                        index === 1 ? 'text-gray-400' :
                        index === 2 ? 'text-orange-600' : 'text-cyber-blue'
                      }`}>
                        #{index + 1}
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-white">{participant.displayName}</p>
                        <p className="text-sm text-gray-400">
                          {participant.round1?.qualified && <span className="text-green-400 mr-2">✓ R1</span>}
                          {participant.round2?.qualified && <span className="text-green-400">✓ R2</span>}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-display font-black text-electric-gold">
                        {participant.round2?.cumulativeScore || participant.round1?.scores?.total || 0}
                      </p>
                      <p className="text-sm text-gray-400">
                        {participant.round2?.cumulativeScore ? '/70' : '/30'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cutoff Line */}
            {sortedParticipants.length > 40 && (
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-red-500"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-deep-navy px-6 py-2 text-red-400 font-bold text-xl border-2 border-red-500 rounded-lg">
                    TOP 40 CUTOFF
                  </span>
                </div>
              </div>
            )}

            {/* Rest of Leaderboard */}
            {sortedParticipants.length > 10 && (
              <div>
                <h3 className="text-2xl font-display font-black text-center mb-4 text-cyber-blue">
                  Complete Rankings
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {sortedParticipants.slice(10).map((participant, index) => {
                    const actualRank = index + 11
                    const isCutoff = actualRank === 40 || actualRank === 41
                    
                    return (
                      <div
                        key={participant.id}
                        className={`cyber-card p-4 flex items-center justify-between ${
                          isCutoff ? 'border-red-500/50 bg-red-500/5' : ''
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-2xl font-display font-black text-gray-500">
                            #{actualRank}
                          </div>
                          <div>
                            <p className="text-lg font-bold text-white">{participant.displayName}</p>
                            {participant.round1?.qualified && (
                              <span className="text-xs text-green-400">✓ Qualified</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-display font-black text-cyber-blue">
                            {participant.round2?.cumulativeScore || participant.round1?.scores?.total || 0}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Commentary Ticker */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-cyber-blue/20 via-neon-purple/20 to-cyber-blue/20 border-t-2 border-cyber-blue/40 py-4 overflow-hidden">
        <div className="animate-scroll whitespace-nowrap">
          <span className="text-2xl font-display text-cyber-blue mx-8">
            {commentaryMessages[commentaryIndex]}
          </span>
          <span className="text-2xl font-display text-electric-gold mx-8">
            PROMPT WARS 2026
          </span>
          <span className="text-2xl font-display text-neon-purple mx-8">
            {commentaryMessages[(commentaryIndex + 1) % commentaryMessages.length]}
          </span>
        </div>
      </div>
    </div>
  )
}

export default Leaderboard