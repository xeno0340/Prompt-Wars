import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db, auth } from '../firebase/config'

const ChallengePopup = ({ challenge, onComplete }) => {
  const [answer, setAnswer] = useState('')
  const [timeLeft, setTimeLeft] = useState(challenge?.timer || 60)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)

  // Countdown timer
  useEffect(() => {
    if (submitted || !challenge) return

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          handleSubmit(true) // Auto-submit when time runs out
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [submitted, challenge]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (isTimeout = false) => {
    if (submitted) return
    setSubmitted(true)

    try {
      const userDoc = await getDoc(doc(db, 'participants', auth.currentUser.uid))
      const userData = userDoc.data()
      
      const isCorrect = answer.trim().toLowerCase() === challenge.answer.toLowerCase()
      const penalty = (isTimeout || !isCorrect) ? challenge.penalty : 0

      // Store result for display
      setResult({ isCorrect, penalty })

      // Apply penalty to current active round
      const updateData = {
        'challengeHistory': [
          ...(userData.challengeHistory || []),
          {
            challengeId: challenge.id,
            timestamp: new Date(),
            userAnswer: answer,
            correct: isCorrect,
            penalty: penalty,
            timeSpent: challenge.timer - timeLeft
          }
        ]
      }

      // Determine which round is active and apply penalty
      if (userData.round1?.submittedAt && userData.round1?.status === 'pending') {
        // During Round 1 submission period
        updateData['round1.challengePenalty'] = (userData.round1?.challengePenalty || 0) + penalty
      } else if (userData.round2?.submittedAt && userData.round2?.status === 'pending') {
        // During Round 2 submission period
        updateData['round2.challengePenalty'] = (userData.round2?.challengePenalty || 0) + penalty
      }

      await updateDoc(doc(db, 'participants', auth.currentUser.uid), updateData)

      // Close popup after brief delay to show result
      setTimeout(() => {
        onComplete(isCorrect, penalty)
      }, 1500)

    } catch (error) {
      console.error('Error submitting challenge:', error)
      onComplete(false, challenge.penalty)
    }
  }

  if (!challenge) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="cyber-card max-w-2xl w-full mx-4 border-2 border-red-500 shadow-2xl shadow-red-500/50">
        {/* Header */}
        <div className="bg-red-500/20 border-b border-red-500/40 p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-display font-black text-red-400">
              ⚡ CHALLENGE ACTIVATED!
            </h2>
            <div className={`text-4xl font-display font-black ${
              timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-electric-gold'
            }`}>
              {timeLeft}s
            </div>
          </div>
          <p className="text-gray-400">
            Your screen is locked. Solve this to continue. Wrong answer = {challenge.penalty} marks penalty!
          </p>
        </div>

        {/* Question */}
        <div className="mb-6 p-6 bg-cyber-blue/5 border border-cyber-blue/20 rounded-lg">
          <p className="text-sm text-gray-400 mb-2">
            Difficulty: <span className="text-electric-gold font-bold uppercase">{challenge.difficulty}</span>
          </p>
          <p className="text-xl text-gray-200 leading-relaxed">
            {challenge.question}
          </p>
        </div>

        {/* Answer Input */}
        {!submitted && (
          <div className="mb-6">
            {challenge.options ? (
              <div className="space-y-3">
                {challenge.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setAnswer(option)
                      setTimeout(() => handleSubmit(), 100)
                    }}
                    className="w-full cyber-card hover:bg-cyber-blue/10 hover:border-cyber-blue/40 transition-all text-left p-4"
                  >
                    <span className="text-cyber-blue font-bold mr-3">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <label className="block text-sm text-gray-400 mb-2">Your Answer:</label>
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && answer.trim() && handleSubmit()}
                  placeholder="Type your answer..."
                  className="cyber-input w-full mb-4"
                  autoFocus
                />
                <button
                  onClick={() => handleSubmit()}
                  disabled={!answer.trim()}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Answer
                </button>
              </div>
            )}
          </div>
        )}

        {/* Result */}
        {submitted && result && (
          <div className={`p-6 rounded-lg border-2 ${
            result.isCorrect
              ? 'bg-green-500/10 border-green-500'
              : 'bg-red-500/10 border-red-500'
          }`}>
            <p className={`text-2xl font-bold mb-2 ${
              result.isCorrect ? 'text-green-400' : 'text-red-400'
            }`}>
              {result.isCorrect ? '✅ Correct!' : `❌ Wrong! Correct answer: ${challenge.answer}`}
            </p>
            <p className="text-gray-400 mb-3">{challenge.explanation}</p>
            {!result.isCorrect && (
              <p className="text-red-400 font-bold">
                Penalty: {result.penalty} marks deducted
              </p>
            )}
            <p className="text-sm text-gray-500 mt-2">Unlocking in 1.5 seconds...</p>
          </div>
        )}

        {/* Warning */}
        <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-400">
            ⚠️ This is a ONE-TIME challenge. Choose carefully!
          </p>
        </div>
      </div>
    </div>
  )
}

ChallengePopup.propTypes = {
  challenge: PropTypes.object,
  onComplete: PropTypes.func.isRequired
}

export default ChallengePopup