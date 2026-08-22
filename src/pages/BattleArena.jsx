import { useState, useEffect } from 'react'
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'

const BattleArena = () => {
  const [battles, setBattles] = useState([])
  const [activeBattle, setActiveBattle] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'battles'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      
      // Sort: QF → SF → Final
      const sorted = data.sort((a, b) => {
        const order = { 'Quarterfinal': 1, 'Semifinal': 2, 'Final': 3 }
        if (order[a.round] !== order[b.round]) {
          return order[a.round] - order[b.round]
        }
        return a.battleNumber - b.battleNumber
      })

      setBattles(sorted)
      
      // Set active battle to first 'active' one
      const active = sorted.find(b => b.status === 'active')
      setActiveBattle(active)
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleVote = async (battleId, participant) => {
    try {
      const battleRef = doc(db, 'battles', battleId)
      const battle = battles.find(b => b.id === battleId)
      
      const newVotes = {
        ...battle.votes,
        [participant]: (battle.votes[participant] || 0) + 1
      }

      await updateDoc(battleRef, { votes: newVotes })
    } catch (error) {
      console.error('Error voting:', error)
    }
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
      {/* Header */}
      <div className="bg-gradient-to-r from-deep-navy via-cyber-blue/10 to-deep-navy border-b-2 border-cyber-blue/40 py-8">
        <div className="container mx-auto px-6">
          <h1 className="text-6xl font-display font-black text-center mb-2">
            <span className="neon-text">ROUND 3:</span>{' '}
            <span className="gold-text">BATTLE ARENA</span>
          </h1>
          <p className="text-center text-2xl text-gray-400 font-display">
            Head-to-Head Showdowns
          </p>
        </div>
      </div>

      {/* Active Battle Display */}
      {activeBattle && (
        <div className="container mx-auto px-6 py-12">
          <div className="mb-8 text-center">
            <h2 className="text-4xl font-display font-black text-cyber-blue mb-2">
              {activeBattle.round} - Battle {activeBattle.battleNumber}
            </h2>
            <p className="text-xl text-gray-400">{activeBattle.problem}</p>
          </div>

          {/* Battle Display */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Participant 1 */}
            <div className="cyber-card border-2 border-electric-gold">
              <div className="bg-electric-gold/20 p-4 border-b border-electric-gold/40">
                <h3 className="text-2xl font-display font-black text-electric-gold text-center">
                  {activeBattle.participant1?.displayName || 'TBD'}
                </h3>
              </div>
              <div className="p-6">
                {activeBattle.participant1?.solution ? (
                  <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm mb-4">
                    {activeBattle.participant1.solution}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Waiting for submission...</p>
                )}
                <button
                  onClick={() => handleVote(activeBattle.id, 'p1')}
                  className="w-full btn-primary"
                >
                  Vote for {activeBattle.participant1?.displayName || 'P1'}
                </button>
                <p className="text-center mt-3 text-3xl font-display font-black text-electric-gold">
                  {activeBattle.votes.p1 || 0} votes
                </p>
              </div>
            </div>

            {/* Participant 2 */}
            <div className="cyber-card border-2 border-neon-purple">
              <div className="bg-neon-purple/20 p-4 border-b border-neon-purple/40">
                <h3 className="text-2xl font-display font-black text-neon-purple text-center">
                  {activeBattle.participant2?.displayName || 'TBD'}
                </h3>
              </div>
              <div className="p-6">
                {activeBattle.participant2?.solution ? (
                  <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm mb-4">
                    {activeBattle.participant2.solution}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Waiting for submission...</p>
                )}
                <button
                  onClick={() => handleVote(activeBattle.id, 'p2')}
                  className="w-full bg-neon-purple/20 hover:bg-neon-purple/30 text-neon-purple font-bold py-3 rounded-lg transition-colors"
                >
                  Vote for {activeBattle.participant2?.displayName || 'P2'}
                </button>
                <p className="text-center mt-3 text-3xl font-display font-black text-neon-purple">
                  {activeBattle.votes.p2 || 0} votes
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Battles Overview */}
      <div className="container mx-auto px-6 py-8">
        <h2 className="text-3xl font-display font-black text-center mb-8 text-cyber-blue">
          Battle Bracket
        </h2>

        {/* Quarterfinals */}
        <div className="mb-12">
          <h3 className="text-2xl font-display font-bold mb-4 text-electric-gold">Quarterfinals</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {battles.filter(b => b.round === 'Quarterfinal').map(battle => (
              <div key={battle.id} className={`cyber-card p-4 ${battle.status === 'active' ? 'border-2 border-cyber-blue' : ''}`}>
                <p className="text-sm text-gray-500 mb-2">Battle {battle.battleNumber}</p>
                <div className="space-y-2">
                  <p className="font-bold">{battle.participant1?.displayName || 'TBD'}</p>
                  <p className="text-sm text-gray-400">vs</p>
                  <p className="font-bold">{battle.participant2?.displayName || 'TBD'}</p>
                </div>
                {battle.winner && (
                  <p className="mt-2 text-green-400 text-sm">✓ Winner: {battle.winner}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Semifinals */}
        <div className="mb-12">
          <h3 className="text-2xl font-display font-bold mb-4 text-electric-gold">Semifinals</h3>
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {battles.filter(b => b.round === 'Semifinal').map(battle => (
              <div key={battle.id} className={`cyber-card p-4 ${battle.status === 'active' ? 'border-2 border-cyber-blue' : ''}`}>
                <p className="text-sm text-gray-500 mb-2">Battle {battle.battleNumber}</p>
                <div className="space-y-2">
                  <p className="font-bold">{battle.participant1?.displayName || 'TBD'}</p>
                  <p className="text-sm text-gray-400">vs</p>
                  <p className="font-bold">{battle.participant2?.displayName || 'TBD'}</p>
                </div>
                {battle.winner && (
                  <p className="mt-2 text-green-400 text-sm">✓ Winner: {battle.winner}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Finals */}
        <div>
          <h3 className="text-2xl font-display font-bold mb-4 text-electric-gold text-center">🏆 GRAND FINAL 🏆</h3>
          <div className="max-w-md mx-auto">
            {battles.filter(b => b.round === 'Final').map(battle => (
              <div key={battle.id} className={`cyber-card p-6 ${battle.status === 'active' ? 'border-2 border-electric-gold' : ''}`}>
                <div className="space-y-3 text-center">
                  <p className="text-2xl font-bold">{battle.participant1?.displayName || 'TBD'}</p>
                  <p className="text-xl text-gray-400">vs</p>
                  <p className="text-2xl font-bold">{battle.participant2?.displayName || 'TBD'}</p>
                </div>
                {battle.winner && (
                  <p className="mt-4 text-electric-gold text-2xl font-display text-center">
                    🏆 CHAMPION: {battle.winner} 🏆
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BattleArena