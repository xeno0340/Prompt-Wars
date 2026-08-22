import { useState, useEffect } from 'react'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db, auth } from '../firebase/config'

const LeaderboardSidebar = () => {
  const [participants, setParticipants] = useState([])
  const [eventConfig, setEventConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'participants'))
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        
        const sorted = data
          .filter(p => p.round1?.scores?.total !== undefined)
          .sort((a, b) => {
            const scoreA = b.round2?.cumulativeScore || b.round1?.scores?.total || 0
            const scoreB = a.round2?.cumulativeScore || a.round1?.scores?.total || 0
            return scoreB - scoreA
          })

        setParticipants(sorted)
        setLoading(false)
      } catch (error) {
        console.error('Error loading leaderboard:', error)
        setLoading(false)
      }
    }

    const loadEventConfig = async () => {
      try {
        const snapshot = await getDoc(doc(db, 'eventConfig', 'config'))
        if (snapshot.exists()) {
          setEventConfig(snapshot.data())
        }
      } catch (error) {
        console.error('Error loading config:', error)
      }
    }

    loadLeaderboard()
    loadEventConfig()
    
    const interval = setInterval(() => {
      loadLeaderboard()
      loadEventConfig()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  // HIDE LEADERBOARD DURING ROUND 3 BATTLES
  if (eventConfig?.round3Active || eventConfig?.activeBattleId) {
    return (
      <div className="cyber-card p-4 sticky top-24">
        <div className="text-center py-8">
          <div className="text-5xl mb-3">⚔️</div>
          <h3 className="text-lg font-bold text-cyber-blue mb-2">Battle Mode Active</h3>
          <p className="text-sm text-gray-400">Leaderboard hidden during Round 3</p>
          <p className="text-xs text-gray-600 mt-2">Check back after battles conclude</p>
        </div>
      </div>
    )
  }

  const currentUserRank = participants.findIndex(p => p.id === auth.currentUser?.uid) + 1
  const topTen = participants.slice(0, 10)

  if (loading) {
    return (
      <div className="cyber-card p-4">
        <h3 className="text-lg font-bold mb-3 text-cyber-blue">Live Rankings</h3>
        <div className="text-center py-8">
          <div className="loading-dots justify-center">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cyber-card p-4 sticky top-24">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-cyber-blue">Live Rankings</h3>
        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span className="text-xs text-gray-500">LIVE</span>
        </div>
      </div>

      {currentUserRank > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-cyber-blue/20 to-transparent border border-cyber-blue/40">
          <p className="text-xs text-gray-400 mb-1">Your Position</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-display font-black text-electric-gold">
              #{currentUserRank}
            </span>
            <span className="text-sm text-gray-400">
              of {participants.length}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {topTen.map((participant, index) => {
          const isCurrentUser = participant.id === auth.currentUser?.uid
          const rank = index + 1

          return (
            <div
              key={participant.id}
              className={`p-2 rounded-lg flex items-center justify-between ${
                isCurrentUser 
                  ? 'bg-cyber-blue/20 border border-cyber-blue/40' 
                  : 'bg-gray-800/30'
              } ${
                rank === 1 ? 'border-l-2 border-electric-gold' :
                rank === 2 ? 'border-l-2 border-gray-400' :
                rank === 3 ? 'border-l-2 border-orange-600' : ''
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`text-lg font-display font-black w-8 flex-shrink-0 ${
                  rank === 1 ? 'text-electric-gold' :
                  rank === 2 ? 'text-gray-400' :
                  rank === 3 ? 'text-orange-600' :
                  'text-gray-500'
                }`}>
                  {rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-bold truncate ${
                    isCurrentUser ? 'text-cyber-blue' : 'text-gray-300'
                  }`}>
                    {participant.displayName}
                    {isCurrentUser && <span className="ml-1 text-xs">(You)</span>}
                  </p>
                </div>
              </div>
              <span className="text-sm font-display font-bold text-electric-gold ml-2 flex-shrink-0">
                {participant.round2?.cumulativeScore || participant.round1?.scores?.total || 0}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-800 text-center">
        <p className="text-xs text-gray-600">Updates every 30s</p>
      </div>
    </div>
  )
}

export default LeaderboardSidebar