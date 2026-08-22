import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc} from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const Login = () => {
  const navigate = useNavigate()
  const [isSignup, setIsSignup] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    rollNumber: '',
    branch: '',
    semester: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignup) {
        // Signup
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        )

        // Create participant document
        await setDoc(doc(db, 'participants', userCredential.user.uid), {
          email: formData.email,
          displayName: formData.displayName,
          rollNumber: formData.rollNumber,
          branch: formData.branch,
          semester: formData.semester,
          createdAt: new Date(),
          round1: {
            status: 'not_started',
            task1: '',
            task2: '',
            task3: '',
            submittedAt: null
          },
          challengeHistory: []
        })

        // Force redirect after signup
        setTimeout(() => {
          navigate('/dashboard', { replace: true })
        }, 100)

      } else {
        // Login
        await signInWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        )

        // Force redirect after login
        setTimeout(() => {
          navigate('/dashboard', { replace: true })
        }, 100)
      }

    } catch (error) {
      console.error('Auth error:', error)
      
      if (error.code === 'auth/email-already-in-use') {
        alert('❌ Email already registered. Please login instead.')
      } else if (error.code === 'auth/invalid-credential') {
        alert('❌ Invalid email or password')
      } else if (error.code === 'auth/weak-password') {
        alert('❌ Password should be at least 6 characters')
      } else {
        alert('❌ Error: ' + error.message)
      }
      
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen circuit-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-display font-black mb-2">
            <span className="neon-text">PROMPT</span>{' '}
            <span className="gold-text">WARS</span>
          </h1>
          <p className="text-gray-400">April 8, 2026 • SANKETIKA</p>
        </div>

        {/* Form Card */}
        <div className="cyber-card">
          <div className="flex mb-6 border-b border-cyber-blue/20">
            <button
              onClick={() => setIsSignup(false)}
              className={`flex-1 py-3 font-bold transition-colors ${
                !isSignup
                  ? 'text-cyber-blue border-b-2 border-cyber-blue'
                  : 'text-gray-500'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsSignup(true)}
              className={`flex-1 py-3 font-bold transition-colors ${
                isSignup
                  ? 'text-cyber-blue border-b-2 border-cyber-blue'
                  : 'text-gray-500'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Display Name</label>
                  <input
                    type="text"
                    required
                    value={formData.displayName}
                    onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                    className="cyber-input w-full"
                    placeholder="John Doe"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Roll Number</label>
                    <input
                      type="text"
                      required
                      value={formData.rollNumber}
                      onChange={(e) => setFormData({...formData, rollNumber: e.target.value})}
                      className="cyber-input w-full"
                      placeholder="21B01A0501"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Semester</label>
                    <select
                      required
                      value={formData.semester}
                      onChange={(e) => setFormData({...formData, semester: e.target.value})}
                      className="cyber-input w-full"
                    >
                      <option value="">Select</option>
                      {[1,2,3,4,5,6,7,8].map(sem => (
                        <option key={sem} value={sem}>{sem}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Branch</label>
                  <select
                    required
                    value={formData.branch}
                    onChange={(e) => setFormData({...formData, branch: e.target.value})}
                    className="cyber-input w-full"
                  >
                    <option value="">Select Branch</option>
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="MECH">MECH</option>
                    <option value="CIVIL">CIVIL</option>
                    <option value="IT">IT</option>
                    <option value="AI&DS">AI&DS</option>
                    <option value="CS&BS">CS&BS</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-2">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="cyber-input w-full"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Password</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="cyber-input w-full"
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                  {isSignup ? 'Creating Account...' : 'Logging In...'}
                </span>
              ) : (
                isSignup ? 'Create Account' : 'Login'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Lords Institute of Engineering & Technology
        </p>
      </div>
    </div>
  )
}

export default Login