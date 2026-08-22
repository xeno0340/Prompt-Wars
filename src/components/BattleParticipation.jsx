import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { doc, updateDoc } from 'firebase/firestore'
import { db, auth } from '../firebase/config'

const BattleParticipation = ({ battle }) => {
  const [defensePrompt, setDefensePrompt] = useState('')
  const [attacks, setAttacks] = useState(['', '', '', '', ''])
  const [patch, setPatch] = useState('')
  const [timeLeft, setTimeLeft] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const isParticipant1 = battle.participant1?.id === auth.currentUser?.uid
  const isParticipant2 = battle.participant2?.id === auth.currentUser?.uid
  const isParticipant = isParticipant1 || isParticipant2
  const myRole = isParticipant1 ? 'p1' : 'p2'
  const opponentRole = isParticipant1 ? 'p2' : 'p1'

  // Countdown timer
  useEffect(() => {
    if (!battle.phaseDeadlines) return

    const updateTimer = () => {
      let deadline
      if (battle.phase === 'defense') deadline = battle.phaseDeadlines.defense
      else if (battle.phase === 'attack') deadline = battle.phaseDeadlines.attack
      else if (battle.phase === 'patch') deadline = battle.phaseDeadlines.patch

      if (!deadline) {
        setTimeLeft(null)
        return
      }

      const remaining = new Date(deadline.seconds * 1000) - new Date()
      if (remaining <= 0) {
        setTimeLeft('TIME UP')
      } else {
        const minutes = Math.floor(remaining / 60000)
        const seconds = Math.floor((remaining % 60000) / 1000)
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [battle.phase, battle.phaseDeadlines])

  const submitDefense = async () => {
    if (!defensePrompt.trim()) {
      alert('⚠️ Please write your defense prompt')
      return
    }

    if (defensePrompt.trim().length < 100) {
      alert('⚠️ Defense prompt must be at least 100 characters')
      return
    }

    setSubmitting(true)
    try {
      await updateDoc(doc(db, 'battles', battle.id), {
        [`defenseData.${myRole}.prompt`]: defensePrompt.trim(),
        [`defenseData.${myRole}.submittedAt`]: new Date()
      })

      alert('✅ Defense prompt submitted!')
    } catch (error) {
      console.error('Error submitting defense:', error)
      alert('❌ Error: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const submitAttacks = async () => {
    const validAttacks = attacks.filter(a => a.trim().length > 0)
    
    if (validAttacks.length === 0) {
      alert('⚠️ Please write at least one attack')
      return
    }

    const maxAttacks = battle.id === 'final' ? 10 : 5
    if (validAttacks.length > maxAttacks) {
      alert(`⚠️ Maximum ${maxAttacks} attacks allowed`)
      return
    }

    setSubmitting(true)
    try {
      const attackObjects = validAttacks.map((text, index) => ({
        text: text.trim(),
        submittedAt: new Date(),
        attackNumber: index + 1
      }))

      await updateDoc(doc(db, 'battles', battle.id), {
        [`attackData.${myRole}.attacks`]: attackObjects
      })

      alert(`✅ ${validAttacks.length} attacks submitted!`)
    } catch (error) {
      console.error('Error submitting attacks:', error)
      alert('❌ Error: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const submitPatch = async () => {
    if (!patch.trim()) {
      alert('⚠️ Please write your patch or skip this phase')
      return
    }

    setSubmitting(true)
    try {
      await updateDoc(doc(db, 'battles', battle.id), {
        [`patchData.${myRole}.patch`]: patch.trim(),
        [`patchData.${myRole}.submittedAt`]: new Date()
      })

      alert('✅ Patch submitted!')
    } catch (error) {
      console.error('Error submitting patch:', error)
      alert('❌ Error: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const skipPatch = async () => {
    if (!window.confirm('Skip patch phase? You won\'t be able to fix vulnerabilities.')) {
      return
    }

    try {
      await updateDoc(doc(db, 'battles', battle.id), {
        [`patchData.${myRole}.patch`]: 'SKIPPED',
        [`patchData.${myRole}.submittedAt`]: new Date()
      })

      alert('✅ Patch phase skipped')
    } catch (error) {
      console.error('Error skipping patch:', error)
    }
  }

  if (!isParticipant) {
    return (
      <div className="cyber-card p-6 text-center">
        <p className="text-gray-400">You are not a participant in this battle</p>
      </div>
    )
  }

  // PHASE 1: DEFENSE
  if (battle.phase === 'defense') {
    const alreadySubmitted = battle.defenseData?.[myRole]?.submittedAt

    return (
      <div className="cyber-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-cyber-blue">
            🛡️ PHASE 1: BUILD YOUR DEFENSE
          </h2>
          <div className="text-3xl font-display font-black text-electric-gold">
            {timeLeft || '--:--'}
          </div>
        </div>

        <div className="mb-6 p-4 bg-gray-900/50 rounded-lg">
          <h3 className="text-lg font-bold text-electric-gold mb-2">
            {battle.theme}
          </h3>
          <p className="text-gray-300 mb-3">{battle.requirements}</p>
          <p className="text-sm text-gray-500">
            Example Attack: <span className="text-red-400">{battle.exampleAttack}</span>
          </p>
        </div>

        {alreadySubmitted ? (
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-6 text-center">
            <p className="text-green-400 font-bold text-lg mb-2">✓ Defense Submitted!</p>
            <p className="text-gray-400">
              Waiting for attack phase...
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                Your Defense Prompt (min 100 characters):
              </label>
              <textarea
                value={defensePrompt}
                onChange={(e) => setDefensePrompt(e.target.value)}
                placeholder="Write a jailbreak-resistant prompt that handles the requirements above..."
                className="cyber-input w-full"
                rows={15}
              />
              <p className="text-xs text-gray-500 mt-1">
                {defensePrompt.length} characters
              </p>
            </div>

            <button
              onClick={submitDefense}
              disabled={submitting || defensePrompt.length < 100}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Defense Prompt'}
            </button>
          </>
        )}
      </div>
    )
  }

  // PHASE 2: ATTACK
  if (battle.phase === 'attack') {
    const alreadySubmitted = battle.attackData?.[myRole]?.attacks?.length > 0
    const opponentPrompt = battle.defenseData?.[opponentRole]?.prompt
    const maxAttacks = battle.id === 'final' ? 10 : 5

    return (
      <div className="cyber-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-red-400">
            ⚔️ PHASE 2: ATTACK OPPONENT
          </h2>
          <div className="text-3xl font-display font-black text-electric-gold">
            {timeLeft || '--:--'}
          </div>
        </div>

        <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-red-500/30">
          <h3 className="text-lg font-bold text-red-400 mb-2">
            Opponents Defense Prompt:
          </h3>
          <pre className="text-sm text-gray-300 whitespace-pre-wrap bg-black/50 p-3 rounded">
            {opponentPrompt || 'Opponent has not submitted yet...'}
          </pre>
        </div>

        {alreadySubmitted ? (
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-6 text-center">
            <p className="text-green-400 font-bold text-lg mb-2">
              ✓ {battle.attackData[myRole].attacks.length} Attacks Submitted!
            </p>
            <p className="text-gray-400">Waiting for patch phase...</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-3">
                Submit up to {maxAttacks} attacks to try to bypass the opponents prompt:
              </p>

              {attacks.slice(0, maxAttacks).map((attack, index) => (
                <div key={index} className="mb-3">
                  <label className="block text-xs text-gray-500 mb-1">
                    Attack #{index + 1}
                  </label>
                  <textarea
                    value={attack}
                    onChange={(e) => {
                      const newAttacks = [...attacks]
                      newAttacks[index] = e.target.value
                      setAttacks(newAttacks)
                    }}
                    placeholder={`Try to bypass the opponent's prompt...`}
                    className="cyber-input w-full"
                    rows={3}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={submitAttacks}
              disabled={submitting || attacks.every(a => !a.trim())}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Attacks'}
            </button>
          </>
        )}
      </div>
    )
  }

  // PHASE 3: PATCH
  if (battle.phase === 'patch') {
    const alreadySubmitted = battle.patchData?.[myRole]?.submittedAt
    const myDefense = battle.defenseData?.[myRole]?.prompt
    const attacksAgainstMe = battle.attackData?.[opponentRole]?.attacks || []

    return (
      <div className="cyber-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-neon-purple">
            🔧 PHASE 3: PATCH VULNERABILITIES
          </h2>
          <div className="text-3xl font-display font-black text-electric-gold">
            {timeLeft || '--:--'}
          </div>
        </div>

        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <h3 className="text-lg font-bold text-red-400 mb-2">
            Attacks Against You:
          </h3>
          {attacksAgainstMe.length === 0 ? (
            <p className="text-gray-500">Opponent has not submitted attacks yet</p>
          ) : (
            <div className="space-y-2">
              {attacksAgainstMe.map((attack, index) => (
                <div key={index} className="bg-black/50 p-3 rounded">
                  <p className="text-xs text-gray-500 mb-1">Attack #{attack.attackNumber}</p>
                  <p className="text-sm text-gray-300">{attack.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-4 p-3 bg-gray-900/50 rounded-lg">
          <h3 className="text-sm font-bold text-gray-400 mb-2">Your Original Defense:</h3>
          <pre className="text-xs text-gray-400 whitespace-pre-wrap">
            {myDefense}
          </pre>
        </div>

        {alreadySubmitted ? (
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-6 text-center">
            <p className="text-green-400 font-bold text-lg mb-2">
              ✓ {battle.patchData[myRole].patch === 'SKIPPED' ? 'Skipped' : 'Patch Submitted!'}
            </p>
            <p className="text-gray-400">Waiting for judges...</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                Patched Prompt (Optional - fix vulnerabilities):
              </label>
              <textarea
                value={patch}
                onChange={(e) => setPatch(e.target.value)}
                placeholder="Improve your defense prompt to resist the attacks..."
                className="cyber-input w-full"
                rows={10}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={submitPatch}
                disabled={submitting || !patch.trim()}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Patch'}
              </button>
              <button
                onClick={skipPatch}
                disabled={submitting}
                className="flex-1 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 font-bold py-3 rounded-lg"
              >
                Skip Patch
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  // PHASE 4: JUDGING OR COMPLETED
  if (battle.phase === 'judging' || battle.phase === 'completed' || battle.status === 'completed') {
    return (
      <div className="cyber-card p-6 text-center">
        <div className="text-6xl mb-4">⚖️</div>
        <h2 className="text-2xl font-bold mb-3 text-cyber-blue">
          {battle.winner ? 'Battle Complete!' : 'Judging In Progress'}
        </h2>
        
        {battle.winner ? (
          <>
            <div className={`text-4xl font-display font-black mb-4 ${
              battle.winner === (isParticipant1 ? battle.participant1.displayName : battle.participant2.displayName)
                ? 'text-electric-gold'
                : 'text-gray-500'
            }`}>
              {battle.winner === (isParticipant1 ? battle.participant1.displayName : battle.participant2.displayName)
                ? '🏆 YOU WON!'
                : `Winner: ${battle.winner}`
              }
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="bg-gray-900/50 p-4 rounded-lg">
                <p className="text-sm text-gray-400">Your Score</p>
                <p className="text-3xl font-display font-black text-cyber-blue">
                  {battle.scores?.[myRole]?.total || 0}
                </p>
              </div>
              <div className="bg-gray-900/50 p-4 rounded-lg">
                <p className="text-sm text-gray-400">Opponent Score</p>
                <p className="text-3xl font-display font-black text-gray-500">
                  {battle.scores?.[opponentRole]?.total || 0}
                </p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-gray-400 mb-4">
            Judges are evaluating your defense, attacks, and patches...
          </p>
        )}
      </div>
    )
  }

  // PENDING STATE
  return (
    <div className="cyber-card p-6 text-center">
      <div className="text-6xl mb-4">⏳</div>
      <h2 className="text-2xl font-bold mb-3 text-cyber-blue">Battle Not Started</h2>
      <p className="text-gray-400">
        Waiting for admin to start the battle...
      </p>
    </div>
  )
}

BattleParticipation.propTypes = {
  battle: PropTypes.object.isRequired
}

export default BattleParticipation