import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { doc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, auth, storage } from '../firebase/config'

const Round2Form = ({ userData, eventConfig }) => {
  const [formData, setFormData] = useState({
    prompt1: '',
    prompt2: '',
    prompt3: ''
  })
  const [screenshot, setScreenshot] = useState(null)
  const [screenshotPreview, setScreenshotPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const [twistRevealed, setTwistRevealed] = useState(false)

  // Load saved data
  useEffect(() => {
    const saved = localStorage.getItem(`round2_${auth.currentUser.uid}`)
    if (saved && !userData?.round2?.submittedAt) {
      setFormData(JSON.parse(saved))
    } else if (userData?.round2?.prompt1) {
      setFormData({
        prompt1: userData.round2.prompt1,
        prompt2: userData.round2.prompt2,
        prompt3: userData.round2.prompt3
      })
    }
  }, [userData])

  // Auto-save
  useEffect(() => {
    if (!userData?.round2?.submittedAt) {
      localStorage.setItem(`round2_${auth.currentUser.uid}`, JSON.stringify(formData))
    }
  }, [formData, userData])

  // Countdown timer
  useEffect(() => {
    const updateTimer = () => {
      if (!eventConfig?.round2Deadline) return

      const deadline = eventConfig.round2Deadline.toDate()
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

  // Check if twist should be revealed
  useEffect(() => {
    if (!eventConfig?.twistRevealTime) return

    const checkTwist = () => {
      const now = new Date()
      const revealTime = eventConfig.twistRevealTime.toDate()
      
      if (now >= revealTime || eventConfig.twistRevealed) {
        setTwistRevealed(true)
      }
    }

    checkTwist()
    const interval = setInterval(checkTwist, 1000)
    return () => clearInterval(interval)
  }, [eventConfig])

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File too large. Maximum size is 5MB.')
        return
      }
      
      setScreenshot(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setScreenshotPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async () => {
    if (!formData.prompt1 || !formData.prompt2 || !formData.prompt3) {
      alert('Please complete all 3 prompts')
      return
    }

    if (!screenshot && !userData?.round2?.screenshotUrl) {
      alert('Please upload a screenshot of your AI output')
      return
    }

    if (!window.confirm('Submit Round 2? You cannot edit after submission.')) {
      return
    }

    setSubmitting(true)

    try {
      let screenshotUrl = userData?.round2?.screenshotUrl || ''

      // Upload screenshot if new one provided
      if (screenshot) {
        setUploading(true)
        const storageRef = ref(storage, `screenshots/${auth.currentUser.uid}_round2.png`)
        await uploadBytes(storageRef, screenshot)
        screenshotUrl = await getDownloadURL(storageRef)
        setUploading(false)
      }

      await updateDoc(doc(db, 'participants', auth.currentUser.uid), {
        'round2.prompt1': formData.prompt1,
        'round2.prompt2': formData.prompt2,
        'round2.prompt3': formData.prompt3,
        'round2.screenshotUrl': screenshotUrl,
        'round2.submittedAt': new Date(),
        'round2.status': 'pending',
        'round2.screenshotStatus': 'pending'
      })

      localStorage.removeItem(`round2_${auth.currentUser.uid}`)
      alert('✅ Round 2 submitted successfully!')
    } catch (error) {
      console.error('Submission error:', error)
      alert('Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
      setUploading(false)
    }
  }

  const isSubmitted = !!userData?.round2?.submittedAt
  const isDeadlinePassed = timeLeft === 'TIME UP'

  if (!userData?.round1?.qualified) {
    return (
      <div className="cyber-card text-center py-12">
        <h2 className="text-3xl font-bold mb-4 text-red-400">🔒 Round 2 Locked</h2>
        <p className="text-gray-400">Only Top 40 from Round 1 can access Round 2</p>
      </div>
    )
  }

  return (
    <div className="cyber-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-cyber-blue/20">
        <div>
          <h2 className="text-3xl font-bold neon-text mb-1">Round 2: Multi-Layer Prompt Architecture</h2>
          <p className="text-gray-400">Build a 3-prompt chain • 40 marks total</p>
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
          <p className="text-sm text-gray-400 mt-1">Results will be published soon.</p>
        </div>
      )}

      {/* Scenario */}
      <div className="mb-6 bg-cyber-blue/5 border border-cyber-blue/20 rounded-lg p-6">
        <h3 className="text-xl font-bold text-cyber-blue mb-3">📋 Scenario</h3>
        <p className="text-gray-300">{eventConfig?.round2Scenario}</p>
      </div>

      {/* Twist Reveal */}
      {twistRevealed && (
        <div className="mb-6 bg-red-500/10 border border-red-500 rounded-lg p-6 animate-slide-in">
          <h3 className="text-xl font-bold text-red-400 mb-3">⚡ PLOT TWIST!</h3>
          <p className="text-gray-300">{eventConfig?.round2Twist}</p>
        </div>
      )}

      {/* Prompt 1 */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-cyber-blue mb-2">Prompt 1: Context Gathering</h3>
        <textarea
          value={formData.prompt1}
          onChange={(e) => setFormData({...formData, prompt1: e.target.value})}
          disabled={isSubmitted || isDeadlinePassed}
          placeholder="First prompt in your chain..."
          className="cyber-input w-full h-32 resize-none disabled:opacity-50"
        />
      </div>

      {/* Prompt 2 */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-cyber-blue mb-2">Prompt 2: Analysis/Processing</h3>
        <textarea
          value={formData.prompt2}
          onChange={(e) => setFormData({...formData, prompt2: e.target.value})}
          disabled={isSubmitted || isDeadlinePassed}
          placeholder="Second prompt that builds on Prompt 1..."
          className="cyber-input w-full h-32 resize-none disabled:opacity-50"
        />
      </div>

      {/* Prompt 3 */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-cyber-blue mb-2">Prompt 3: Output Generation</h3>
        <textarea
          value={formData.prompt3}
          onChange={(e) => setFormData({...formData, prompt3: e.target.value})}
          disabled={isSubmitted || isDeadlinePassed}
          placeholder="Final prompt that produces the output..."
          className="cyber-input w-full h-32 resize-none disabled:opacity-50"
        />
      </div>

      {/* Screenshot Upload */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-cyber-blue mb-2">Screenshot of AI Output</h3>
        <p className="text-sm text-gray-400 mb-3">
          Upload a screenshot showing your AI&apos;s final output (PNG/JPG, max 5MB)
        </p>
        
        {!isSubmitted && !isDeadlinePassed && (
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleScreenshotChange}
            className="cyber-input w-full"
          />
        )}

        {screenshotPreview && (
          <div className="mt-4 border border-cyber-blue/20 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-2">Preview:</p>
            <img src={screenshotPreview} alt="Screenshot preview" className="max-w-full rounded" />
          </div>
        )}

        {userData?.round2?.screenshotUrl && !screenshotPreview && (
          <div className="mt-4 border border-cyber-blue/20 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-2">Uploaded Screenshot:</p>
            <img src={userData.round2.screenshotUrl} alt="Uploaded screenshot" className="max-w-full rounded" />
          </div>
        )}
      </div>

      {/* Submit Button */}
      {!isSubmitted && !isDeadlinePassed && (
        <button
          onClick={handleSubmit}
          disabled={submitting || uploading}
          className="btn-primary w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading Screenshot...' : submitting ? 'Submitting...' : 'Submit Round 2'}
        </button>
      )}

      {isDeadlinePassed && !isSubmitted && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-center">
          <p className="text-red-400 font-bold">⏰ Deadline Passed</p>
        </div>
      )}
    </div>
  )
}

Round2Form.propTypes = {
  userData: PropTypes.object,
  eventConfig: PropTypes.object
}

export default Round2Form