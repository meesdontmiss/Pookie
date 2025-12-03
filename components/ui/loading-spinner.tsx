'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { FallbackLoader } from './fallback-loader'

interface LoadingSpinnerProps {
  message?: string
  isVisible?: boolean
  loaderSrc?: string
  size?: number
  fullScreen?: boolean
  overlay?: boolean
}

/**
 * A reusable loading spinner component that displays a .gif loader
 * with an optional message underneath.
 */
export function LoadingSpinner({
  message = 'Loading...',
  isVisible = true,
  loaderSrc = '/images/pookie-loader.gif', // Default path to your loading .gif
  size = 120,
  fullScreen = false,
  overlay = true
}: LoadingSpinnerProps) {
  const [imageError, setImageError] = useState(false)
  
  if (!isVisible) return null

  const containerStyle: React.CSSProperties = fullScreen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: overlay ? 'rgba(0, 0, 0, 0.7)' : 'transparent',
        zIndex: 9999,
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: overlay ? 'rgba(0, 0, 0, 0.7)' : 'transparent',
        borderRadius: '8px',
      }

  return (
    <div style={containerStyle}>
      <div 
        style={{ 
          position: 'relative', 
          width: size, 
          height: size, 
          marginBottom: message ? '1rem' : 0 
        }}
      >
        {imageError ? (
          <FallbackLoader size={size} color="#ff3333" />
        ) : (
          <Image
            src={loaderSrc}
            alt="Loading..."
            fill
            style={{ objectFit: 'contain' }}
            onError={() => setImageError(true)}
          />
        )}
      </div>
      
      {message && (
        <div 
          style={{ 
            color: 'white', 
            fontWeight: 'bold',
            textShadow: '0px 0px 4px rgba(0, 0, 0, 0.8)',
            fontSize: '1.25rem',
            maxWidth: '80%',
            textAlign: 'center'
          }}
        >
          {message}
        </div>
      )}
    </div>
  )
} 