import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import BattleControls from '../components/BattleControls'

const Admin = () => {
  const navigate = useNavigate()
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [evaluating, setEvaluating] = useState(false)
  const [eventConfig, setEventConfig] = useState(null)
  const [challenges, setChallenges] = useState([])

  useEffect(() => {
    const urlSecret = import.meta.env.VITE_ADMIN_URL_SECRET
    const urlParams = new URLSearchParams(window.location.search)
    const providedSecret = urlParams.get('secret')
    
    if (providedSecret !== urlSecret) {
      navigate('/dashboard')
      return
    }
  }, [navigate])

  useEffect(() => {
    // Real-time listeners for better performance
    const unsubscribeConfig = onSnapshot(
      doc(db, 'eventConfig', 'config'),
      (snapshot) => {
        if (snapshot.exists()) {
          setEventConfig({ id: snapshot.id, ...snapshot.data() })
        }
      }
    )

    const unsubscribeParticipants = onSnapshot(
      collection(db, 'participants'),
      (snapshot) => {
        const data = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            // Sort by Round 2 cumulative score, then Round 1 score
            const aScore = a.round2?.cumulativeScore || a.round1?.scores?.total || 0
            const bScore = b.round2?.cumulativeScore || b.round1?.scores?.total || 0
            return bScore - aScore
          })
        setParticipants(data)
        setLoading(false)
      }
    )

    loadChallenges()

    return () => {
      unsubscribeConfig()
      unsubscribeParticipants()
    }
  }, [])

  const loadChallenges = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'challenges'))
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      setChallenges(data)
    } catch (error) {
      console.error('Error loading challenges:', error)
    }
  }

  const toggleRound1 = async () => {
    try {
      await updateDoc(doc(db, 'eventConfig', 'config'), {
        round1Active: !eventConfig.round1Active
      })
      alert(`Round 1 ${!eventConfig.round1Active ? 'ACTIVATED' : 'DEACTIVATED'}`)
    } catch (error) {
      console.error('Error toggling round:', error)
    }
  }

  const toggleRound2 = async () => {
    if (!eventConfig.top40Published) {
      alert('⚠️ Please publish Top 40 results first!')
      return
    }

    try {
      await updateDoc(doc(db, 'eventConfig', 'config'), {
        round2Active: !eventConfig.round2Active
      })
      alert(`Round 2 ${!eventConfig.round2Active ? 'ACTIVATED' : 'DEACTIVATED'}`)
    } catch (error) {
      console.error('Error toggling round:', error)
    }
  }

  const triggerChallenge = async (challengeId) => {
    const challenge = challenges.find(c => c.id === challengeId)
    
    if (!window.confirm(`Trigger challenge: "${challenge.question}"?`)) {
      return
    }

    try {
      await updateDoc(doc(db, 'eventConfig', 'config'), {
        challengeActive: true,
        currentChallenge: challenge
      })

      alert('✅ Challenge triggered! All participants will see it now.')
      
      setTimeout(async () => {
        await updateDoc(doc(db, 'eventConfig', 'config'), {
          challengeActive: false,
          currentChallenge: null
        })
      }, (challenge.timer + 5) * 1000)

    } catch (error) {
      console.error('Error triggering challenge:', error)
    }
  }

  const deactivateChallenge = async () => {
    try {
      await updateDoc(doc(db, 'eventConfig', 'config'), {
        challengeActive: false,
        currentChallenge: null
      })
      alert('Challenge deactivated')
    } catch (error) {
      console.error('Error deactivating challenge:', error)
    }
  }

  const evaluateAllRound1 = async () => {
    if (!window.confirm('Evaluate all Round 1 submissions using AI? This will cost API credits.')) {
      return
    }

    setEvaluating(true)
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY

    if (!apiKey) {
      alert('OpenAI API key not configured in .env file')
      setEvaluating(false)
      return
    }

    try {
      let evaluated = 0
      const pendingParticipants = participants.filter(
        p => p.round1?.submittedAt && p.round1?.status === 'pending'
      )

      for (const participant of pendingParticipants) {
        try {
          const prompt = `You are a STRICT grader for a prompt engineering competition. Give LOW scores for poor submissions.

SUBMISSION:
Task 1: ${participant.round1.task1}
Task 2: ${participant.round1.task2}
Task 3: ${participant.round1.task3}

STRICT GRADING RULES:
- Gibberish, random text, or placeholder text = 0 marks
- Very short responses (<20 words) = 0-2 marks maximum
- Missing any required elements = automatic 0 for that criterion
- Be harsh but fair

RUBRIC:
Task 1 (10 marks) - Role-based prompt rewrite:
- Role clarity (2): Clear AI role defined? (If no role mentioned = 0)
- Audience (2): Target audience specified? (If no audience = 0)
- Constraints (3): Specific constraints/limits given? (If none = 0)
- Format (2): Output format requested? (If no format = 0)
- Coherence (1): Makes sense & follows prompt engineering principles?
MINIMUM LENGTH: 30 words (Less = automatic 0)

Task 2 (10 marks) - Image generation prompt:
- Style (2): Art style clearly defined? (If missing = 0)
- Technical (3): Camera angle, resolution, lighting specs? (Need at least 2)
- Atmosphere (2): Mood/feeling/time of day described?
- Visual details (2): Specific objects/elements mentioned?
- Clarity (1): Clear and specific overall?
MINIMUM LENGTH: 25 words (Less = automatic 0)

Task 3 (10 marks) - Constrained product description:
- Word count (3): Count EXACT words
  * 120-140 words: 3 marks
  * 115-119 or 141-145: 2 marks  
  * 110-114 or 146-150: 1 mark
  * Outside this range: 0 marks
- Features (2): At least 2 technical features mentioned?
- Call-to-action (2): Clear CTA sentence at end?
- Tone (2): Professional yet friendly?
- Compliance (1): Makes sense?

OUTPUT ONLY JSON (no markdown):
{
  "task1": {"score": 0, "reason": "..."},
  "task2": {"score": 0, "reason": "..."},
  "task3": {"score": 0, "wordCount": 1, "reason": "..."},
  "total": 0
}`

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.3
            })
          })

          const data = await response.json()
          const result = JSON.parse(data.choices[0].message.content)

          await updateDoc(doc(db, 'participants', participant.id), {
            'round1.scores': result,
            'round1.status': 'evaluated'
          })

          evaluated++
          console.log(`Evaluated ${evaluated}/${pendingParticipants.length}`)
          
          await new Promise(resolve => setTimeout(resolve, 1000))

        } catch (error) {
          console.error(`Error evaluating ${participant.displayName}:`, error)
        }
      }

      alert(`✅ Evaluated ${evaluated} submissions!`)
    } catch (error) {
      console.error('Evaluation error:', error)
      alert('Evaluation failed. Check console.')
    } finally {
      setEvaluating(false)
    }
  }

  const evaluateAllRound2 = async () => {
    if (!window.confirm('Evaluate all Round 2 submissions using AI?')) {
      return
    }

    setEvaluating(true)
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY

    if (!apiKey) {
      alert('OpenAI API key not configured')
      setEvaluating(false)
      return
    }

    try {
      let evaluated = 0
      const pendingR2 = participants.filter(
        p => p.round2?.submittedAt && p.round2?.status === 'pending'
      )

      for (const participant of pendingR2) {
        try {
          const prompt = `You are a STRICT grader for Round 2 of a prompt engineering competition. Give ZERO tolerance for gibberish.

SUBMISSION:
Prompt 1: ${participant.round2.prompt1}
Prompt 2: ${participant.round2.prompt2}
Prompt 3: ${participant.round2.prompt3}

CRITICAL RULES:
- Gibberish, random text, single words = 0/40 TOTAL
- Each prompt must be AT LEAST 30 words (if not = automatic 0/40)
- Must show CLEAR prompt engineering concepts (roles, constraints, conditionals)
- Be HARSH - this is Round 2, expect excellence

RUBRIC (40 marks total):

Logical Flow (10 marks):
- Does Prompt 2 explicitly reference/use output from Prompt 1? (If no = 0)
- Does Prompt 3 explicitly reference/use output from Prompt 2? (If no = 0)
- Is there a clear narrative chain? (3 marks)
- Each step builds logically? (2 marks)

Conditional Logic (10 marks):
- Contains "if-then" statements or conditional logic? (Must have at least 2, if not = 0)
- Conditionals make logical sense? (3 marks)
- Handles edge cases? (2 marks)

Structure & Engineering (10 marks):
- Clear AI role defined in each prompt? (3 marks, if missing = 0)
- Output formats specified? (3 marks)
- Constraints and requirements stated? (2 marks)
- Professional prompt structure? (2 marks)

Output Quality (5 marks):
- Would the output actually solve the problem? (If no = 0)
- Output would be usable/actionable?
- Shows understanding of the scenario?

Creativity & Systems Thinking (5 marks):
- Goes beyond obvious solutions?
- Shows multi-layer thinking?
- Innovative approach?

MINIMUM REQUIREMENTS (if ANY fail = 0/40):
- Each prompt MUST be 30+ words
- MUST show clear connection between prompts
- MUST have at least 2 conditional statements
- MUST NOT be gibberish/random text

OUTPUT ONLY JSON (no markdown):
{
  "logicalFlow": {"score": 0, "reason": "..."},
  "conditionals": {"score": 0, "reason": "..."},
  "structure": {"score": 0, "reason": "..."},
  "outputQuality": {"score": 0, "reason": "..."},
  "creativity": {"score": 0, "reason": "..."},
  "total": 0
}`

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.1
            })
          })

          const data = await response.json()
          const result = JSON.parse(data.choices[0].message.content)

          const r1Score = participant.round1?.scores?.total || 0
          const cumulativeScore = r1Score + result.total

          await updateDoc(doc(db, 'participants', participant.id), {
            'round2.scores': result,
            'round2.status': 'evaluated',
            'round2.cumulativeScore': cumulativeScore
          })

          evaluated++
          console.log(`Evaluated ${evaluated}/${pendingR2.length}`)
          
          await new Promise(resolve => setTimeout(resolve, 1000))

        } catch (error) {
          console.error(`Error evaluating ${participant.displayName}:`, error)
        }
      }

      alert(`✅ Evaluated ${evaluated} Round 2 submissions!`)
    } catch (error) {
      console.error('Evaluation error:', error)
    } finally {
      setEvaluating(false)
    }
  }

  const publishTop40 = async () => {
    if (!window.confirm('Publish Top 40 results? This will mark top 40 as qualified and show scores.')) {
      return
    }

    try {
      const evaluated = participants
        .filter(p => p.round1?.scores?.total !== undefined)
        .sort((a, b) => b.round1.scores.total - a.round1.scores.total)

      for (let i = 0; i < evaluated.length; i++) {
        const qualified = i < 40
        const rank = i + 1

        await updateDoc(doc(db, 'participants', evaluated[i].id), {
          'round1.rank': rank,
          'round1.qualified': qualified
        })
      }

      await updateDoc(doc(db, 'eventConfig', 'config'), {
        top40Published: true,
        leaderboardPublished: true
      })

      alert('✅ Top 40 published! You can now activate Round 2.')
    } catch (error) {
      console.error('Error publishing:', error)
    }
  }

  const publishTop8 = async () => {
    if (!window.confirm('Publish Top 8 for Round 3?')) {
      return
    }

    try {
      const evaluated = participants
        .filter(p => p.round2?.scores?.total !== undefined)
        .sort((a, b) => (b.round2?.cumulativeScore || 0) - (a.round2?.cumulativeScore || 0))

      for (let i = 0; i < evaluated.length; i++) {
        const qualified = i < 8
        const rank = i + 1

        await updateDoc(doc(db, 'participants', evaluated[i].id), {
          'round2.rank': rank,
          'round2.qualified': qualified
        })
      }

      await updateDoc(doc(db, 'eventConfig', 'config'), {
        top8Published: true
      })

      alert('✅ Top 8 published for Round 3!')
    } catch (error) {
      console.error('Error publishing:', error)
    }
  }

  const handleInitializeBattles = async () => {
    const { initializeBattles } = await import('../utils/initFirebase')
    const result = await initializeBattles()
    
    if (result.success) {
      alert('✅ Battles initialized!')
    } else if (result.message === 'Cancelled by user') {
      // User cancelled, do nothing
    } else {
      alert('❌ Error: ' + (result.error || result.message))
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

  const pendingCount = participants.filter(p => p.round1?.status === 'pending').length
  const evaluatedCount = participants.filter(p => p.round1?.status === 'evaluated').length
  const pendingR2Count = participants.filter(p => p.round2?.status === 'pending').length
  const evaluatedR2Count = participants.filter(p => p.round2?.status === 'evaluated').length

  return (
    <div className="min-h-screen circuit-bg">
      <div className="bg-red-500/20 border-b border-red-500/40 sticky top-0 z-10 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-black text-red-400">
                🔐 ADMIN PANEL
              </h1>
              <p className="text-sm text-gray-400">Prompt Wars 2026 • Control Center</p>
            </div>
            
            <div className="flex gap-4">
              {!eventConfig && (
                <button
                  onClick={async () => {
                    const { initializeEventConfig } = await import('../utils/initFirebase')
                    const result = await initializeEventConfig()
                    if (result.success) {
                      alert('✅ Event initialized!')
                    }
                  }}
                  className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-4 py-2 rounded-lg border border-green-500/40 font-bold"
                >
                  Initialize Event
                </button>
              )}
              
              {challenges.length === 0 && (
                <button
                  onClick={async () => {
                    const { createChallengesPool } = await import('../utils/initFirebase')
                    const result = await createChallengesPool()
                    if (result.success) {
                      await loadChallenges()
                      alert('✅ Challenges pool created!')
                    }
                  }}
                  className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-4 py-2 rounded-lg border border-yellow-500/40 font-bold"
                >
                  Initialize Challenges
                </button>
              )}
              
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-cyber-blue/20 hover:bg-cyber-blue/30 text-cyber-blue px-4 py-2 rounded-lg"
              >
                View as Participant
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="cyber-card">
            <p className="text-sm text-gray-400">Total Registered</p>
            <p className="text-3xl font-display font-black">{participants.length}</p>
          </div>
          <div className="cyber-card">
            <p className="text-sm text-gray-400">Round 1 Submitted</p>
            <p className="text-3xl font-display font-black">
              {participants.filter(p => p.round1?.submittedAt).length}
            </p>
          </div>
          <div className="cyber-card">
            <p className="text-sm text-gray-400">R1 Pending</p>
            <p className="text-3xl font-display font-black text-yellow-400">{pendingCount}</p>
          </div>
          <div className="cyber-card">
            <p className="text-sm text-gray-400">R1 Evaluated</p>
            <p className="text-3xl font-display font-black text-green-400">{evaluatedCount}</p>
          </div>
        </div>

        {eventConfig?.round2Active && (
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="cyber-card">
              <p className="text-sm text-gray-400">Round 2 Submitted</p>
              <p className="text-3xl font-display font-black">
                {participants.filter(p => p.round2?.submittedAt).length}
              </p>
            </div>
            <div className="cyber-card">
              <p className="text-sm text-gray-400">R2 Pending</p>
              <p className="text-3xl font-display font-black text-yellow-400">{pendingR2Count}</p>
            </div>
            <div className="cyber-card">
              <p className="text-sm text-gray-400">R2 Evaluated</p>
              <p className="text-3xl font-display font-black text-green-400">{evaluatedR2Count}</p>
            </div>
          </div>
        )}

        {/* Event Controls */}
        <div className="cyber-card mb-6">
          <h2 className="text-2xl font-bold mb-4 neon-text">Event Controls</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={toggleRound1}
              className={`px-6 py-3 rounded-lg font-bold ${
                eventConfig?.round1Active
                  ? 'bg-green-500/20 text-green-400 border border-green-500'
                  : 'bg-gray-500/20 text-gray-400 border border-gray-500'
              }`}
            >
              Round 1: {eventConfig?.round1Active ? 'ACTIVE ✓' : 'INACTIVE'}
            </button>

            <button
              onClick={toggleRound2}
              disabled={!eventConfig?.top40Published}
              className={`px-6 py-3 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed ${
                eventConfig?.round2Active
                  ? 'bg-green-500/20 text-green-400 border border-green-500'
                  : 'bg-gray-500/20 text-gray-400 border border-gray-500'
              }`}
            >
              Round 2: {eventConfig?.round2Active ? 'ACTIVE ✓' : 'INACTIVE'}
            </button>

            <button
              onClick={evaluateAllRound1}
              disabled={evaluating || pendingCount === 0}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {evaluating ? 'Evaluating...' : `Evaluate R1 (${pendingCount})`}
            </button>

            <button
              onClick={evaluateAllRound2}
              disabled={evaluating || pendingR2Count === 0}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Evaluate R2 ({pendingR2Count})
            </button>

            <button
              onClick={publishTop40}
              disabled={evaluatedCount === 0}
              className="btn-secondary disabled:opacity-50"
            >
              Publish Top 40
            </button>

            <button
              onClick={publishTop8}
              disabled={evaluatedR2Count === 0}
              className="btn-secondary disabled:opacity-50"
            >
              Publish Top 8
            </button>
          </div>
        </div>

        {/* Logic Challenges */}
        <div className="cyber-card mb-6">
          <h2 className="text-2xl font-bold mb-4 neon-text">Logic Challenges</h2>
          
          {eventConfig?.challengeActive && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-4">
              <p className="text-red-400 font-bold mb-2">🔴 CHALLENGE ACTIVE</p>
              <p className="text-gray-300 mb-3">{eventConfig.currentChallenge?.question}</p>
              <button
                onClick={deactivateChallenge}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold"
              >
                Deactivate Challenge
              </button>
            </div>
          )}

          {challenges.length === 0 ? (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
              <p className="text-yellow-400 mb-2">No challenges initialized</p>
              <p className="text-sm text-gray-400">Click Initialize Challenges button above</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {challenges.map(challenge => (
                <button
                  key={challenge.id}
                  onClick={() => triggerChallenge(challenge.id)}
                  disabled={eventConfig?.challengeActive}
                  className="cyber-card text-left hover:border-cyber-blue/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm text-electric-gold uppercase font-bold">
                      {challenge.difficulty}
                    </span>
                    <span className="text-sm text-gray-400">{challenge.timer}s</span>
                  </div>
                  <p className="text-sm text-gray-300 line-clamp-2">
                    {challenge.question}
                  </p>
                  <p className="text-xs text-red-400 mt-2">
                    Penalty: {challenge.penalty} marks
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Round 3 Battles */}
        <div className="cyber-card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-cyber-blue">Round 3: Battle Arena</h2>
            <button
              onClick={handleInitializeBattles}
              disabled={eventConfig?.battlesInitialized}
              className={`font-bold py-3 px-6 rounded-lg transition-colors ${
                eventConfig?.battlesInitialized
                  ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                  : 'bg-electric-gold/20 hover:bg-electric-gold/30 text-electric-gold'
              }`}
            >
              {eventConfig?.battlesInitialized ? '✓ Battles Initialized' : 'Initialize Battles'}
            </button>
          </div>

          {eventConfig?.battlesInitialized ? (
            <BattleControls participants={participants} />
          ) : (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
              <p className="text-yellow-400 mb-2">Battles not initialized</p>
              <p className="text-sm text-gray-400">Click Initialize Battles button above</p>
            </div>
          )}
        </div>

        {/* All Participants */}
        <div className="cyber-card">
          <h2 className="text-2xl font-bold mb-4 neon-text">All Participants</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-cyber-blue/20">
                <tr>
                  <th className="text-left p-3">Display Name</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">R1 Status</th>
                  <th className="text-left p-3">R1 Score</th>
                  <th className="text-left p-3">R2 Score</th>
                  <th className="text-left p-3">Total</th>
                  <th className="text-left p-3">Rank</th>
                </tr>
              </thead>
              <tbody>
                {participants.map(p => (
                  <tr key={p.id} className="border-b border-gray-800 hover:bg-cyber-blue/5">
                    <td className="p-3 font-bold">{p.displayName}</td>
                    <td className="p-3 text-gray-400">{p.email}</td>
                    <td className="p-3">
                      {!p.round1?.submittedAt && <span className="text-gray-500">Not submitted</span>}
                      {p.round1?.status === 'pending' && <span className="text-yellow-400">⏳ Pending</span>}
                      {p.round1?.status === 'evaluated' && <span className="text-green-400">✓ Evaluated</span>}
                    </td>
                    <td className="p-3 font-display">
                      {p.round1?.scores?.total !== undefined ? (
                        <span className={p.round1.scores.total === 0 ? 'text-red-400' : ''}>
                          {p.round1.scores.total}/30
                        </span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="p-3 font-display">
                      {p.round2?.scores?.total !== undefined ? (
                        `${p.round2.scores.total}/40`
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="p-3 font-display font-bold">
                      {p.round2?.cumulativeScore !== undefined ? (
                        `${p.round2.cumulativeScore}/70`
                      ) : p.round1?.scores?.total !== undefined ? (
                        `${p.round1.scores.total}/30`
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      {p.round2?.rank ? `#${p.round2.rank}` : p.round1?.rank ? `#${p.round1.rank}` : '-'}
                      {p.round1?.qualified && <span className="ml-2 text-green-400">✓ R1</span>}
                      {p.round2?.qualified && <span className="ml-2 text-green-400">✓ R2</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Admin