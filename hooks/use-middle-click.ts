import { useState, useEffect } from 'react'

export function useMiddleClick() {
  const [isMiddleClicked, setIsMiddleClicked] = useState(false)
  
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      // Middle mouse button is button 1
      if (e.button === 1) {
        e.preventDefault() // Prevent default scrolling behavior
        setIsMiddleClicked(prev => !prev) // Toggle state
      }
    }
    
    // Add event listener
    window.addEventListener('mousedown', handleMouseDown)
    
    // Clean up
    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])
  
  return isMiddleClicked
} 