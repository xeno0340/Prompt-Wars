import { doc, setDoc } from 'firebase/firestore'
import { db } from './config'

export const initializeEventConfig = async () => {
  try {
    await setDoc(doc(db, 'eventConfig', 'config'), {
      // Round status
      round1Active: false,
      round2Active: false,
      round3Active: false,
      
      // Deadlines (April 8, 2026)
      round1Deadline: new Date('2026-04-08T10:55:00+05:30'),
      round2Deadline: new Date('2026-04-08T14:15:00+05:30'),
      
      // Round 2 content
      round2Scenario: "You're designing an AI therapy bot for mental health support. Create a 3-prompt chain that: 1) Gathers user context, 2) Analyzes emotional state, 3) Provides personalized coping strategies.",
      round2Twist: "PLOT TWIST: Your AI gives terrible advice that makes people feel worse. Fix your prompts to ensure empathetic, helpful responses.",
      twistRevealTime: new Date('2026-04-08T13:50:00+05:30'),
      twistRevealed: false,
      
      // Logic challenges
      challengeActive: false,
      currentChallenge: null,
      
      // Public display
      announcement: "",
      announcementActive: false,
      leaderboardPublished: false,
      top40Published: false,
      top8Published: false,
      
      // Commentary
      commentaryMessages: [],
      
      // Stats
      totalRegistered: 0,
      round1Submitted: 0,
      round2Submitted: 0,
      
      // Admin control
      pausedGlobal: false,
      
      // Metadata
      createdAt: new Date(),
      lastUpdated: new Date()
    })
    
    console.log('✅ Event config initialized!')
  } catch (error) {
    console.error('Error initializing event config:', error)
  }
}

export const createChallengesPool = async () => {
  const challenges = [
    {
      id: 'pattern-seq',
      type: 'pattern',
      difficulty: 'medium',
      question: 'Complete the sequence: 2, 6, 12, 20, 30, __',
      answer: '42',
      explanation: 'Pattern: n×(n+1) where n increases by 1 each time',
      timer: 40,
      penalty: -0.5,
      active: true
    },
    {
      id: 'river-crossing',
      type: 'logic',
      difficulty: 'medium',
      question: 'A farmer needs to cross a river with a chicken, fox, and grain. The boat can only carry the farmer and one item. If left alone, the fox will eat the chicken, and the chicken will eat the grain. What should the farmer take first?',
      options: ['Chicken', 'Fox', 'Grain'],
      answer: 'Chicken',
      explanation: 'Take chicken first, return alone, take fox/grain, bring chicken back, take grain/fox, return alone, take chicken',
      timer: 45,
      penalty: -0.5,
      active: true
    },
    {
      id: 'handshake',
      type: 'math',
      difficulty: 'easy',
      question: 'In a room with 10 people, everyone shakes hands with everyone else exactly once. How many handshakes occur in total?',
      answer: '45',
      explanation: 'Formula: n(n-1)/2 = 10×9/2 = 45',
      timer: 35,
      penalty: -0.5,
      active: true
    },
    {
      id: 'clock-angle',
      type: 'math',
      difficulty: 'hard',
      question: 'What is the angle between the hour and minute hands of a clock at 3:15?',
      answer: '7.5',
      explanation: 'Hour hand moves 0.5° per minute. At 3:15, hour is at 97.5°, minute at 90°. Difference = 7.5°',
      timer: 50,
      penalty: -0.5,
      active: true
    },
    {
      id: 'shadow-direction',
      type: 'logic',
      difficulty: 'easy',
      question: 'At 6 PM, the sun is setting in the west. If your shadow points east, which direction are you facing?',
      options: ['North', 'South', 'East', 'West'],
      answer: 'West',
      explanation: 'Shadow points opposite to light source. If shadow points east, you face west toward the sun',
      timer: 25,
      penalty: -0.5,
      active: true
    },
    {
      id: 'missing-number',
      type: 'pattern',
      difficulty: 'easy',
      question: 'Find the missing number: 1, 4, 9, 16, __, 36, 49',
      answer: '25',
      explanation: 'Perfect squares: 1², 2², 3², 4², 5², 6², 7²',
      timer: 30,
      penalty: -0.5,
      active: true
    }
  ]
  
  try {
    for (const challenge of challenges) {
      await setDoc(doc(db, 'challenges', challenge.id), challenge)
    }
    console.log('✅ Challenges pool created!')
  } catch (error) {
    console.error('Error creating challenges:', error)
  }
}