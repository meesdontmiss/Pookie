'use client'

import { createContext, useContext, ReactNode } from 'react'

// Stub context for test ball
const TestBallContext = createContext({})

export function TestBallProvider({ children }: { children: ReactNode }) {
  return <TestBallContext.Provider value={{}}>{children}</TestBallContext.Provider>
}

export function useTestBall() {
  return useContext(TestBallContext)
}

export default TestBallProvider

