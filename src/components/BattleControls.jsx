import { useState, useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'

const BattleControls = ({ participants }) => {
  const [battles, setBattles] = useState([])
  const [selectedBattle, setSelectedBattle] = useState(null)
  const [viewSubmissions, setViewSubmissions] = useState(null)
  const [scores, setScores] = useState({
    p1Defense: 0,
    p1Attack: 0,
    p1Patch: 0,
    p2Defense: 0,
    p2Attack: 0,
    p2Patch: 0
  })

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'battles'),
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        
        const sorted = data.sort((a, b) => {
          const order = { 'Quarterfinal': 1, 'Semifinal': 2, 'Final': 3 }
          if (order[a.round] !== order[b.round]) {
            return order[a.round] - order[b.round]
          }
          return a.battleNumber - b.battleNumber
        })

        setBattles(sorted)
      },
      (error) => {
        console.error('Battle listener error:', error)
      }
    )

    return () => unsubscribe()
  }, [])

  const assignParticipants = async (battleId, p1Id, p2Id) => {
    try {
      const p1 = participants.find(p => p.id === p1Id)
      const p2 = participants.find(p => p.id === p2Id)

      await updateDoc(doc(db, 'battles', battleId), {
        participant1: {
          id: p1.id,
          displayName: p1.displayName,
          email: p1.email
        },
        participant2: {
          id: p2.id,
          displayName: p2.displayName,
          email: p2.email
        }
      })

      console.log(`✅ Assigned ${p1.displayName} vs ${p2.displayName}`)
    } catch (error) {
      console.error('Error assigning participants:', error)
      alert('❌ Error: ' + error.message)
    }
  }

  const startBattle = async (battleId) => {
    if (!window.confirm('Start this battle? This will activate the defense phase (15 min).')) {
      return
    }

    try {
      const now = new Date()
      
      await updateDoc(doc(db, 'battles', battleId), {
        status: 'active',
        phase: 'defense',
        startTime: now,
        'phaseDeadlines.defense': new Date(now.getTime() + 15 * 60 * 1000),
        'phaseDeadlines.attack': new Date(now.getTime() + 25 * 60 * 1000),
        'phaseDeadlines.patch': new Date(now.getTime() + 30 * 60 * 1000)
      })

      // Update active battle in event config
      await updateDoc(doc(db, 'eventConfig', 'config'), {
        activeBattleId: battleId,
        round3Active: true
      })

      alert('✅ Battle started! Defense phase active (15 min)')
    } catch (error) {
      console.error('Error starting battle:', error)
      alert('❌ Error: ' + error.message)
    }
  }

  const advancePhase = async (battleId, currentPhase) => {
    const phaseMap = {
      'defense': 'attack',
      'attack': 'patch',
      'patch': 'judging'
    }

    const nextPhase = phaseMap[currentPhase]
    
    if (!window.confirm(`Advance to ${nextPhase.toUpperCase()} phase?`)) {
      return
    }

    try {
      await updateDoc(doc(db, 'battles', battleId), {
        phase: nextPhase
      })

      alert(`✅ Advanced to ${nextPhase} phase!`)
    } catch (error) {
      console.error('Error advancing phase:', error)
      alert('❌ Error: ' + error.message)
    }
  }

  const submitScores = async (battle) => {
    if (!window.confirm('Submit final scores and declare winner?')) {
      return
    }

    try {
      const p1Total = scores.p1Defense + scores.p1Attack + scores.p1Patch
      const p2Total = scores.p2Defense + scores.p2Attack + scores.p2Patch
      
      const winner = p1Total > p2Total ? battle.participant1.displayName : 
                     p2Total > p1Total ? battle.participant2.displayName : 
                     'TIE'

      await updateDoc(doc(db, 'battles', battle.id), {
        'scores.p1': {
          defense: scores.p1Defense,
          attack: scores.p1Attack,
          patch: scores.p1Patch,
          total: p1Total
        },
        'scores.p2': {
          defense: scores.p2Defense,
          attack: scores.p2Attack,
          patch: scores.p2Patch,
          total: p2Total
        },
        winner: winner,
        phase: 'completed',
        status: 'completed'
      })

      // Clear active battle
      await updateDoc(doc(db, 'eventConfig', 'config'), {
        activeBattleId: null
      })

      alert(`✅ Winner: ${winner} (${p1Total} vs ${p2Total})`)
      setSelectedBattle(null)
      setViewSubmissions(null)
      setScores({
        p1Defense: 0, p1Attack: 0, p1Patch: 0,
        p2Defense: 0, p2Attack: 0, p2Patch: 0
      })
    } catch (error) {
      console.error('Error submitting scores:', error)
      alert('❌ Error: ' + error.message)
    }
  }

  const qualifiedParticipants = useMemo(() => 
    participants
      .filter(p => p.round2?.qualified)
      .sort((a, b) => (b.round2?.cumulativeScore || 0) - (a.round2?.cumulativeScore || 0))
      .slice(0, 8),
    [participants]
  )

  return (
    <div className="space-y-6">
      {/* Auto-assign Top 8 */}
      {qualifiedParticipants.length > 0 && (
        <div className="bg-electric-gold/10 border border-electric-gold/30 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-2">
            Top {qualifiedParticipants.length} qualified participants ready
            {qualifiedParticipants.length < 8 && ' (Testing mode: will duplicate participants)'}
          </p>
          <button
            onClick={() => {
              const qfBattles = battles.filter(b => b.round === 'Quarterfinal')
              if (qfBattles.length !== 4) {
                alert('⚠️ Need 4 quarterfinal battles initialized')
                return
              }

              if (qualifiedParticipants.length < 8) {
                // FOR TESTING: Assign same participant to multiple slots
                if (!window.confirm(`Only ${qualifiedParticipants.length} qualified. Assign for testing?`)) {
                  return
                }
                
                // Assign available participants (repeat if needed for testing)
                const p0 = qualifiedParticipants[0]?.id
                const p1 = qualifiedParticipants[1]?.id || p0
                const p2 = qualifiedParticipants[2]?.id || p0
                const p3 = qualifiedParticipants[3]?.id || p0
                const p4 = qualifiedParticipants[4]?.id || p0
                const p5 = qualifiedParticipants[5]?.id || p0
                const p6 = qualifiedParticipants[6]?.id || p0
                const p7 = qualifiedParticipants[7]?.id || p0
                
                assignParticipants(qfBattles[0].id, p0, p7)
                setTimeout(() => assignParticipants(qfBattles[1].id, p1, p6), 500)
                setTimeout(() => assignParticipants(qfBattles[2].id, p2, p5), 1000)
                setTimeout(() => assignParticipants(qfBattles[3].id, p3, p4), 1500)
                
                setTimeout(() => alert('✅ Participants assigned to all quarterfinals!'), 2000)
                return
              }

              // PRODUCTION: Proper seeding with 8 participants
              assignParticipants(qfBattles[0].id, qualifiedParticipants[0].id, qualifiedParticipants[7].id)
              setTimeout(() => assignParticipants(qfBattles[1].id, qualifiedParticipants[1].id, qualifiedParticipants[6].id), 500)
              setTimeout(() => assignParticipants(qfBattles[2].id, qualifiedParticipants[2].id, qualifiedParticipants[5].id), 1000)
              setTimeout(() => assignParticipants(qfBattles[3].id, qualifiedParticipants[3].id, qualifiedParticipants[4].id), 1500)
              
              setTimeout(() => alert('✅ Top 8 seeded to quarterfinals!'), 2000)
            }}
            className="w-full bg-electric-gold/20 hover:bg-electric-gold/30 text-electric-gold font-bold py-3 rounded-lg transition-colors"
          >
            🎯 Auto-Assign Top {qualifiedParticipants.length >= 8 ? '8' : qualifiedParticipants.length} to Quarterfinals
          </button>
        </div>
      )}

      {/* Battle Cards */}
      <div className="space-y-4">
        {battles.map(battle => (
          <div 
            key={battle.id}
            className={`cyber-card p-4 ${
              battle.status === 'active' ? 'border-2 border-cyber-blue' : ''
            }`}
          >
            {/* Battle Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-electric-gold">
                  {battle.round} {battle.battleNumber > 1 ? `- Battle ${battle.battleNumber}` : ''}
                </h3>
                <p className="text-sm text-cyber-blue">{battle.theme}</p>
              </div>
              
              <div className="flex gap-2">
                {battle.status === 'pending' && battle.participant1 && battle.participant2 && (
                  <button
                    onClick={() => startBattle(battle.id)}
                    className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-1 rounded text-sm font-bold"
                  >
                    Start Battle
                  </button>
                )}
                
                {battle.status === 'active' && (
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm font-bold">
                    ACTIVE - {battle.phase.toUpperCase()}
                  </span>
                )}
                
                {battle.status === 'completed' && (
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-sm font-bold">
                    Completed
                  </span>
                )}
              </div>
            </div>

            {/* Requirements */}
            <div className="mb-3 p-3 bg-gray-900/50 rounded text-sm">
              <p className="text-gray-400 mb-1">Requirements:</p>
              <p className="text-gray-300">{battle.requirements}</p>
            </div>

            {/* Participants */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="bg-gray-900/50 rounded p-3">
                <p className="text-sm text-gray-400 mb-1">Participant 1</p>
                <p className="font-bold">{battle.participant1?.displayName || 'Not assigned'}</p>
                {battle.defenseData?.p1?.submittedAt && (
                  <span className="text-xs text-green-400">✓ Defense submitted</span>
                )}
              </div>
              <div className="bg-gray-900/50 rounded p-3">
                <p className="text-sm text-gray-400 mb-1">Participant 2</p>
                <p className="font-bold">{battle.participant2?.displayName || 'Not assigned'}</p>
                {battle.defenseData?.p2?.submittedAt && (
                  <span className="text-xs text-green-400">✓ Defense submitted</span>
                )}
              </div>
            </div>

            {/* Phase Controls */}
            {battle.status === 'active' && (
              <div className="flex gap-2 flex-wrap mb-3">
                {battle.phase !== 'judging' && battle.phase !== 'completed' && (
                  <button
                    onClick={() => advancePhase(battle.id, battle.phase)}
                    className="bg-cyber-blue/20 hover:bg-cyber-blue/30 text-cyber-blue px-3 py-1 rounded text-sm font-bold"
                  >
                    Advance to Next Phase
                  </button>
                )}
                
                {/* View Submissions Button */}
                {(battle.phase === 'attack' || battle.phase === 'patch' || battle.phase === 'judging') && (
                  <button
                    onClick={() => setViewSubmissions(viewSubmissions === battle.id ? null : battle.id)}
                    className="bg-neon-purple/20 hover:bg-neon-purple/30 text-neon-purple px-3 py-1 rounded text-sm font-bold"
                  >
                    {viewSubmissions === battle.id ? 'Hide Submissions' : 'View Submissions'}
                  </button>
                )}
                
                {battle.phase === 'judging' && (
                  <button
                    onClick={() => setSelectedBattle(selectedBattle === battle.id ? null : battle.id)}
                    className="bg-electric-gold/20 hover:bg-electric-gold/30 text-electric-gold px-3 py-1 rounded text-sm font-bold"
                  >
                    {selectedBattle === battle.id ? 'Hide Scoring' : 'Score Battle'}
                  </button>
                )}
              </div>
            )}

            {/* Submissions Viewer */}
{viewSubmissions === battle.id && (
  <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-neon-purple/30 space-y-4">
    <h4 className="text-lg font-bold text-neon-purple mb-3">📋 Battle Submissions</h4>
    
    <div className="grid md:grid-cols-2 gap-4">
      {/* P1 Submissions */}
      <div className="space-y-3">
        <h5 className="font-bold text-electric-gold">{battle.participant1?.displayName}</h5>
        
        {/* Defense */}
        <div className="bg-black/50 p-3 rounded">
          <p className="text-xs text-gray-500 mb-1">🛡️ DEFENSE PROMPT:</p>
          <p className="text-xs text-gray-300 break-words whitespace-pre-wrap overflow-wrap-anywhere">
            {battle.defenseData?.p1?.prompt || 'Not submitted'}
          </p>
        </div>
        
        {/* Attacks */}
        {battle.attackData?.p1?.attacks?.length > 0 && (
          <div className="bg-black/50 p-3 rounded">
            <p className="text-xs text-gray-500 mb-2">⚔️ ATTACKS ({battle.attackData.p1.attacks.length}):</p>
            <div className="space-y-2">
              {battle.attackData.p1.attacks.map((attack, idx) => (
                <div key={idx} className="border-l-2 border-red-500/30 pl-2">
                  <p className="text-xs text-red-400 mb-1">Attack #{attack.attackNumber}</p>
                  <p className="text-xs text-gray-300 break-words whitespace-pre-wrap overflow-wrap-anywhere">
                    {attack.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Patch */}
        {battle.patchData?.p1?.patch && battle.patchData.p1.patch !== 'SKIPPED' && (
          <div className="bg-black/50 p-3 rounded">
            <p className="text-xs text-gray-500 mb-1">🔧 PATCH:</p>
            <p className="text-xs text-gray-300 break-words whitespace-pre-wrap overflow-wrap-anywhere">
              {battle.patchData.p1.patch}
            </p>
          </div>
        )}
      </div>

      {/* P2 Submissions */}
      <div className="space-y-3">
        <h5 className="font-bold text-neon-purple">{battle.participant2?.displayName}</h5>
        
        {/* Defense */}
        <div className="bg-black/50 p-3 rounded">
          <p className="text-xs text-gray-500 mb-1">🛡️ DEFENSE PROMPT:</p>
          <p className="text-xs text-gray-300 break-words whitespace-pre-wrap overflow-wrap-anywhere">
            {battle.defenseData?.p2?.prompt || 'Not submitted'}
          </p>
        </div>
        
        {/* Attacks */}
        {battle.attackData?.p2?.attacks?.length > 0 && (
          <div className="bg-black/50 p-3 rounded">
            <p className="text-xs text-gray-500 mb-2">⚔️ ATTACKS ({battle.attackData.p2.attacks.length}):</p>
            <div className="space-y-2">
              {battle.attackData.p2.attacks.map((attack, idx) => (
                <div key={idx} className="border-l-2 border-red-500/30 pl-2">
                  <p className="text-xs text-red-400 mb-1">Attack #{attack.attackNumber}</p>
                  <p className="text-xs text-gray-300 break-words whitespace-pre-wrap overflow-wrap-anywhere">
                    {attack.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Patch */}
        {battle.patchData?.p2?.patch && battle.patchData.p2.patch !== 'SKIPPED' && (
          <div className="bg-black/50 p-3 rounded">
            <p className="text-xs text-gray-500 mb-1">🔧 PATCH:</p>
            <p className="text-xs text-gray-300 break-words whitespace-pre-wrap overflow-wrap-anywhere">
              {battle.patchData.p2.patch}
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
)}

            {/* Scoring Panel */}
            {selectedBattle === battle.id && battle.phase === 'judging' && (
              <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-cyber-blue/30">
                <h4 className="text-lg font-bold mb-4 text-cyber-blue">Score Battle</h4>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Participant 1 Scoring */}
                  <div>
                    <h5 className="font-bold mb-3 text-electric-gold">{battle.participant1?.displayName}</h5>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm text-gray-400">Defense (0-15)</label>
                        <input
                          type="number"
                          min="0"
                          max="15"
                          value={scores.p1Defense}
                          onChange={(e) => setScores({...scores, p1Defense: parseInt(e.target.value) || 0})}
                          className="cyber-input w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Attack (0-10)</label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={scores.p1Attack}
                          onChange={(e) => setScores({...scores, p1Attack: parseInt(e.target.value) || 0})}
                          className="cyber-input w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Patch (0-5)</label>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          value={scores.p1Patch}
                          onChange={(e) => setScores({...scores, p1Patch: parseInt(e.target.value) || 0})}
                          className="cyber-input w-full"
                        />
                      </div>
                      <div className="pt-2 border-t border-gray-700">
                        <p className="text-lg font-display font-bold">
                          Total: {scores.p1Defense + scores.p1Attack + scores.p1Patch}/30
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Participant 2 Scoring */}
                  <div>
                    <h5 className="font-bold mb-3 text-neon-purple">{battle.participant2?.displayName}</h5>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm text-gray-400">Defense (0-15)</label>
                        <input
                          type="number"
                          min="0"
                          max="15"
                          value={scores.p2Defense}
                          onChange={(e) => setScores({...scores, p2Defense: parseInt(e.target.value) || 0})}
                          className="cyber-input w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Attack (0-10)</label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={scores.p2Attack}
                          onChange={(e) => setScores({...scores, p2Attack: parseInt(e.target.value) || 0})}
                          className="cyber-input w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Patch (0-5)</label>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          value={scores.p2Patch}
                          onChange={(e) => setScores({...scores, p2Patch: parseInt(e.target.value) || 0})}
                          className="cyber-input w-full"
                        />
                      </div>
                      <div className="pt-2 border-t border-gray-700">
                        <p className="text-lg font-display font-bold">
                          Total: {scores.p2Defense + scores.p2Attack + scores.p2Patch}/30
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => submitScores(battle)}
                  className="mt-4 w-full bg-electric-gold/20 hover:bg-electric-gold/30 text-electric-gold font-bold py-3 rounded-lg"
                >
                  Submit Scores & Declare Winner
                </button>
              </div>
            )}

            {/* Winner Display */}
            {battle.winner && (
              <div className="mt-3 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-center">
                <p className="text-green-400 font-bold text-lg">
                  🏆 Winner: {battle.winner}
                </p>
                <p className="text-sm text-gray-400">
                  Score: {battle.scores?.p1?.total || 0} - {battle.scores?.p2?.total || 0}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

BattleControls.propTypes = {
  participants: PropTypes.array.isRequired
}

export default BattleControls