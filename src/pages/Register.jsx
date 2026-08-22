import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const profanityList = ['badword1', 'badword2'] // Add actual list or use a library

const Register = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    realName: '',
    displayName: '',
    email: '',
    phone: '',
    regNumber: ''
  })

  const validateDisplayName = (name) => {
    // 3-15 characters
    if (name.length < 3 || name.length > 15) {
      return 'Display name must be 3-15 characters'
    }
    
    // No special characters except underscore
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      return 'Only letters, numbers, and underscore allowed'
    }
    
    // Profanity check (basic)
    const lowerName = name.toLowerCase()
    for (const word of profanityList) {
      if (lowerName.includes(word)) {
        return 'Display name contains inappropriate content'
      }
    }
    
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate display name
      const displayNameError = validateDisplayName(formData.displayName)
      if (displayNameError) {
        setError(displayNameError)
        setLoading(false)
        return
      }

      // Check if display name already exists
      const displayNameQuery = query(
        collection(db, 'participants'),
        where('displayName', '==', formData.displayName)
      )
      const displayNameSnapshot = await getDocs(displayNameQuery)
      
      if (!displayNameSnapshot.empty) {
        setError('Display name already taken. Choose another one.')
        setLoading(false)
        return
      }

      // Check if email already registered
      const emailQuery = query(
        collection(db, 'participants'),
        where('email', '==', formData.email)
      )
      const emailSnapshot = await getDocs(emailQuery)
      
      if (!emailSnapshot.empty) {
        setError('Email already registered. Please login instead.')
        setLoading(false)
        return
      }

      // Create auth account (email = email, password = phone for simplicity)
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.phone
      )

      const userId = userCredential.user.uid

      // Create participant document
      await setDoc(doc(db, 'participants', userId), {
        id: userId,
        realName: formData.realName,
        displayName: formData.displayName,
        email: formData.email,
        phone: formData.phone,
        regNumber: formData.regNumber,
        createdAt: new Date(),
        
        round1: {
          task1: '',
          task2: '',
          task3: '',
          submittedAt: null,
          status: 'not_started',
          scores: null,
          aiFlags: null,
          rank: null,
          qualified: false
        },
        
        round2: {
          prompt1: '',
          prompt2: '',
          prompt3: '',
          screenshotUrl: '',
          screenshotStatus: 'pending',
          submittedAt: null,
          status: 'not_started',
          scores: null,
          cumulativeScore: 0,
          rank: null,
          qualified: false,
          twistRevealed: false
        },
        
        round3: {
          seed: null,
          battles: [],
          finalRank: null
        },
        
        challengeResponses: []
      })

      // Navigate to dashboard
      navigate('/dashboard')
      
    } catch (err) {
      console.error('Registration error:', err)
      
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use. Please login instead.')
      } else if (err.code === 'auth/weak-password') {
        setError('Phone number must be at least 6 digits.')
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen circuit-bg flex items-center justify-center px-4 py-12">
      <div className="cyber-card max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-display font-black mb-2">
            <span className="neon-text">REGISTER</span>
          </h1>
          <p className="text-gray-400">Join the competition</p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Real Name */}
          <div>
            <label className="block text-sm font-medium mb-2 text-cyber-blue">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="cyber-input w-full"
              placeholder="Abdul Rahman"
              value={formData.realName}
              onChange={(e) => setFormData({...formData, realName: e.target.value})}
            />
            <p className="text-xs text-gray-500 mt-1">Private - Only visible to admins</p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium mb-2 text-cyber-blue">
              Display Name (Public) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={15}
              className="cyber-input w-full"
              placeholder="PromptMaster"
              value={formData.displayName}
              onChange={(e) => setFormData({...formData, displayName: e.target.value})}
            />
            <p className="text-xs text-gray-500 mt-1">
              3-15 characters • Letters, numbers, underscore only • This will be shown on leaderboard
            </p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-2 text-cyber-blue">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              className="cyber-input w-full"
              placeholder="abdul.23w8@gmail.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-2 text-cyber-blue">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              pattern="[0-9]{10}"
              className="cyber-input w-full"
              placeholder="9618970918"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
            <p className="text-xs text-gray-500 mt-1">10 digits without +91</p>
          </div>

          {/* Registration Number */}
          <div>
            <label className="block text-sm font-medium mb-2 text-cyber-blue">
              College Registration Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="cyber-input w-full"
              placeholder="21W81A05B0"
              value={formData.regNumber}
              onChange={(e) => setFormData({...formData, regNumber: e.target.value})}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                Registering...
              </span>
            ) : (
              'Register for Competition'
            )}
          </button>

          {/* Login Link */}
          <p className="text-center text-sm text-gray-400">
            Already registered?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-cyber-blue hover:underline"
            >
              Login here
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}

export default Register