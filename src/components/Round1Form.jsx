import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { doc, updateDoc } from 'firebase/firestore'
import { db, auth } from '../firebase/config'

const Round1Form = ({ userData, eventConfig }) => {
  const [formData, setFormData] = useState({
    task1: '',
    task2: '',
    task3: ''
  })
  const [wordCount, setWordCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')

  // Load saved data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`round1_${auth.currentUser.uid}`)
    if (saved && !userData?.round1?.submittedAt) {
      setFormData(JSON.parse(saved))
    } else if (userData?.round1?.task1) {
      // Load from Firebase if already submitted
      setFormData({
        task1: userData.round1.task1,
        task2: userData.round1.task2,
        task3: userData.round1.task3
      })
    }
  }, [userData])

  // Auto-save to localStorage
  useEffect(() => {
    if (!userData?.round1?.submittedAt) {
      localStorage.setItem(`round1_${auth.currentUser.uid}`, JSON.stringify(formData))
    }
  }, [formData, userData])

  // Count words in Task 3
  useEffect(() => {
    const words = formData.task3.trim().split(/\s+/).filter(word => word.length > 0)
    setWordCount(words.length)
  }, [formData.task3])

  // Countdown timer
  useEffect(() => {
    const updateTimer = () => {
      if (!eventConfig?.round1Deadline) return

      const deadline = eventConfig.round1Deadline.toDate()
      const now = new Date()
      const diff = deadline - now

      if (diff <= 0) {
        setTimeLeft('TIME UP')
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [eventConfig])

  const handleSubmit = async () => {
    if (!formData.task1 || !formData.task2 || !formData.task3) {
      alert('Please complete all 3 tasks before submitting')
      return
    }

    if (!window.confirm('Are you sure you want to submit? You cannot edit after submission.')) {
      return
    }

    setSubmitting(true)

    try {
      await updateDoc(doc(db, 'participants', auth.currentUser.uid), {
        'round1.task1': formData.task1,
        'round1.task2': formData.task2,
        'round1.task3': formData.task3,
        'round1.submittedAt': new Date(),
        'round1.status': 'pending'
      })

      localStorage.removeItem(`round1_${auth.currentUser.uid}`)
      alert('Submission successful! ✅')
    } catch (error) {
      console.error('Submission error:', error)
      alert('Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const isSubmitted = !!userData?.round1?.submittedAt
  const isDeadlinePassed = timeLeft === 'TIME UP'

  return (
    <div className="cyber-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-cyber-blue/20">
        <div>
          <h2 className="text-3xl font-bold neon-text mb-1">Round 1: Foundational Prompt Engineering</h2>
          <p className="text-gray-400">Complete all 3 tasks • 30 marks total</p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-display font-black ${
            timeLeft === 'TIME UP' ? 'text-red-500' : 'text-electric-gold'
          }`}>
            {timeLeft}
          </div>
          <p className="text-xs text-gray-400">Time Remaining</p>
        </div>
      </div>

      {isSubmitted && (
        <div className="bg-green-500/10 border border-green-500 rounded-lg p-4 mb-6">
          <p className="text-green-400 font-bold">✅ Submitted Successfully</p>
          <p className="text-sm text-gray-400 mt-1">
            Your submission is being evaluated. Results will be published soon.
          </p>
        </div>
      )}

      {/* Task 1 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-cyber-blue">Task 1: Reconstruct Bad Prompt (10 marks)</h3>
          <span className="text-sm bg-cyber-blue/20 px-3 py-1 rounded-full">10 marks</span>
        </div>
        
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-300 mb-2"><strong>Bad Prompt:</strong></p>
          <p className="text-red-400 italic">
            &quot;Explain quantum physics to me.&quot;
          </p>
        </div>

        <p className="text-sm text-gray-400 mb-3">
          <strong>Your Task:</strong> Rewrite this prompt to make it more effective. Include: role definition, target audience, clear constraints, and output format.
        </p>

        <textarea
          value={formData.task1}
          onChange={(e) => setFormData({...formData, task1: e.target.value})}
          disabled={isSubmitted || isDeadlinePassed}
          placeholder="Your improved prompt here..."
          className="cyber-input w-full h-32 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Task 2 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-cyber-blue">Task 2: Fix Image Generation Prompt (10 marks)</h3>
          <span className="text-sm bg-cyber-blue/20 px-3 py-1 rounded-full">10 marks</span>
        </div>

        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-300 mb-2"><strong>Bad Prompt:</strong></p>
          <p className="text-red-400 italic">
            &quot;Generate a picture of a city.&quot;
          </p>
        </div>

        <p className="text-sm text-gray-400 mb-3">
          <strong>Your Task:</strong> Rewrite for DALL-E/Midjourney. Include: art style, camera angle, lighting, mood, specific visual details, and resolution specs.
        </p>

        <textarea
          value={formData.task2}
          onChange={(e) => setFormData({...formData, task2: e.target.value})}
          disabled={isSubmitted || isDeadlinePassed}
          placeholder="Your improved image generation prompt here..."
          className="cyber-input w-full h-32 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Task 3 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-cyber-blue">Task 3: Constraint Engineering (10 marks)</h3>
          <span className="text-sm bg-cyber-blue/20 px-3 py-1 rounded-full">10 marks</span>
        </div>

        <p className="text-sm text-gray-400 mb-3">
          <strong>Your Task:</strong> Write a product description prompt for a &quot;wireless noise-canceling headphones&quot; with these constraints:
        </p>

        <ul className="text-sm text-gray-300 mb-4 space-y-1 list-disc list-inside">
          <li>Exactly 120-140 words (strict limit)</li>
          <li>Must mention 2 technical features</li>
          <li>Professional yet friendly tone</li>
          <li>Include a clear call-to-action at the end</li>
        </ul>

        <textarea
          value={formData.task3}
          onChange={(e) => setFormData({...formData, task3: e.target.value})}
          disabled={isSubmitted || isDeadlinePassed}
          placeholder="Your constrained prompt here..."
          className="cyber-input w-full h-40 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <div className="flex items-center justify-between mt-2">
          <p className={`text-sm ${
            wordCount >= 120 && wordCount <= 140 
              ? 'text-green-400' 
              : wordCount > 0 
                ? 'text-yellow-400' 
                : 'text-gray-500'
          }`}>
            Word Count: {wordCount} / 120-140
          </p>
          {wordCount > 0 && (wordCount < 120 || wordCount > 140) && (
            <p className="text-xs text-yellow-400">⚠️ Outside target range</p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      {!isSubmitted && !isDeadlinePassed && (
        <button
          onClick={handleSubmit}
          disabled={submitting || !formData.task1 || !formData.task2 || !formData.task3}
          className="btn-primary w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : 'Submit Round 1'}
        </button>
      )}

      {isDeadlinePassed && !isSubmitted && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-center">
          <p className="text-red-400 font-bold">⏰ Deadline Passed</p>
          <p className="text-sm text-gray-400 mt-1">You can no longer submit for Round 1</p>
        </div>
      )}
    </div>
  )
}

// PropTypes validation
Round1Form.propTypes = {
  userData: PropTypes.shape({
    round1: PropTypes.shape({
      task1: PropTypes.string,
      task2: PropTypes.string,
      task3: PropTypes.string,
      submittedAt: PropTypes.any,
    }),
  }),
  eventConfig: PropTypes.shape({
    round1Deadline: PropTypes.any,
  }),
}

export default Round1Form