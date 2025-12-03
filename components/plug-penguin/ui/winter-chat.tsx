'use client'

import { useState, useEffect, useRef } from 'react'
import { chatService, ChatMessage } from '../../../services/chat-service'
import { ChatHistory } from './chat-history'
import { setChatInputFocus } from '../hooks/use-keyboard-controls'

interface WinterChatProps {
  username?: string
  maxMessages?: number
}

// Emote mapping for quick chat expressions
const EMOTES = {
  ':)': '😊',
  ':(': '😢',
  ':D': '😃',
  ':P': '😛',
  ':O': '😮',
  ';)': '😉',
  '<3': '❤️',
  'o/': '👋',
  '\\o': '🙌',
  ':snow:': '❄️',
  ':fish:': '🐟',
  ':igloo:': '🏠',
  ':wave:': '👋',
  ':dance:': '💃',
  ':cool:': '😎',
  ':waddle:': '🐧',
  ':p:': '🅿️', // Special blue P emoji
}

// Filter inappropriate words
const FILTERED_WORDS = [
  'badword1',
  'badword2',
  // Add more filtered words as needed
]

export function WinterChat({ 
  username: propUsername, 
  maxMessages = 50 
}: WinterChatProps) {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [username, setUsername] = useState(() => {
    // Generate a username with the blue P emoji
    const randomNum = Math.floor(Math.random() * 1000)
    const generatedUsername = `Penguin_${randomNum}`
    return generatedUsername.replace(/[pP]/g, '🅿️')
  })
  const [isFocused, setIsFocused] = useState(false)
  const [showEmotes, setShowEmotes] = useState(false)
  const [bluePMode, setBluePMode] = useState(true)
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Subscribe to chat messages
  useEffect(() => {
    console.log('Subscribing to chat messages...')
    const unsubscribe = chatService.subscribeToMessages((newMessages) => {
      console.log('Received messages update:', newMessages)
      setMessages(newMessages)
    }, maxMessages)
    
    return unsubscribe
  }, [maxMessages])
  
  // Update username if prop changes
  useEffect(() => {
    if (propUsername) {
      // Apply blue P to provided username as well
      setUsername(propUsername.replace(/[pP]/g, '🅿️'))
    }
  }, [propUsername])
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle chat with Enter key when not already focused
      if (e.key === 'Enter' && document.activeElement !== inputRef.current) {
        e.preventDefault() // Prevent default action
        e.stopPropagation() // Stop event propagation to other handlers
        setChatInputFocus(true) // Set global chat focus state first
        inputRef.current?.focus() // Then focus the input
        return
      }
      
      // Close chat with Escape key when focused
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        e.preventDefault() // Prevent default action
        e.stopPropagation() // Stop event propagation to other handlers
        setChatInputFocus(false) // Clear global chat focus state first
        inputRef.current?.blur() // Then blur the input
        return
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  // Input focusing and blurring with improved handling
  const handleInputFocus = () => {
    setIsFocused(true)
    setChatInputFocus(true)
    console.log('Chat input focused - ALL keyboard shortcuts disabled')
    
    // Disable other key handlers immediately
    window.dispatchEvent(new CustomEvent('chatInputStateChanged', { 
      detail: { focused: true } 
    }))
  }
  
  const handleInputBlur = () => {
    setIsFocused(false)
    setChatInputFocus(false)
    console.log('Chat input blurred - keyboard shortcuts enabled')
    
    // Re-enable other key handlers
    window.dispatchEvent(new CustomEvent('chatInputStateChanged', { 
      detail: { focused: false } 
    }))
  }
  
  // Process message with emotes and filtering
  const processMessage = (message: string): string => {
    let processed = message
    
    // Replace all P's (uppercase and lowercase) with the blue P emoji if P Mode is enabled
    if (bluePMode) {
      processed = processed.replace(/[pP]/g, '🅿️')
    }
    
    // Replace emotes with emoji
    Object.entries(EMOTES).forEach(([code, emoji]) => {
      processed = processed.replace(new RegExp(code.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1'), 'g'), emoji)
    })
    
    // Filter inappropriate words
    FILTERED_WORDS.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi')
      processed = processed.replace(regex, '***')
    })
    
    return processed
  }
  
  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim()) return
    
    try {
      const processedMessage = processMessage(newMessage)
      console.log('Sending message:', processedMessage)
      await chatService.sendMessage(username, processedMessage)
      setNewMessage('')
      inputRef.current?.focus()
      setShowEmotes(false)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }
  
  // Insert emote into message
  const insertEmote = (emote: string) => {
    setNewMessage(prev => `${prev} ${emote} `)
    inputRef.current?.focus()
  }
  
  // Toggle P Mode
  const toggleBluePMode = () => {
    setBluePMode(!bluePMode)
    
    // Send a system message about the mode change
    const modeMessage = !bluePMode 
      ? "P Mode activated! All 🅿️'s will be re🅿️laced with 🅿️."
      : "P Mode deactivated. P's will be displayed normally."
    
    chatService.sendMessage("System", modeMessage)
  }
  
  return (
    <>
      {/* Chat History Component */}
      <ChatHistory 
        messages={messages} 
        currentUsername={username} 
        bluePMode={bluePMode}
      />
      
      {/* Input Box (Bottom Center) */}
      <div className="fixed bottom-0 left-0 w-full z-20 pointer-events-none">
        <div className="container mx-auto max-w-lg px-4 pb-2 pointer-events-auto">
          {/* P Mode toggle */}
          <div className="flex justify-end mb-1">
            <button
              onClick={toggleBluePMode}
              className={`px-2 py-1 rounded-t-md text-xs flex items-center gap-1 ${
                bluePMode ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              <span>P Mode</span>
              <span className={`w-3 h-3 rounded-full ${bluePMode ? 'bg-green-400' : 'bg-red-400'}`}></span>
            </button>
          </div>
          
          {/* Emote selector */}
          {showEmotes && (
            <div className="bg-black bg-opacity-80 border-2 border-blue-900 rounded-sm p-2 mb-1 flex flex-wrap gap-2">
              {Object.entries(EMOTES).map(([code, emoji]) => (
                <button
                  key={code}
                  onClick={() => insertEmote(code)}
                  className="px-2 py-1 bg-blue-900/50 hover:bg-blue-800 rounded-sm transition-colors"
                  title={code}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          
          {/* Input Box */}
          <form 
            onSubmit={handleSendMessage}
            className="flex items-center"
          >
            <div className="flex-1 flex items-center bg-black bg-opacity-70 border-2 border-blue-900 rounded-sm overflow-hidden"
              style={{
                imageRendering: 'pixelated',
                boxShadow: '0 0 0 1px rgba(120, 180, 255, 0.3), inset 0 0 10px rgba(30, 60, 120, 0.5)'
              }}
            >
              <button 
                type="button"
                className="pl-2 pr-1 text-blue-300 hover:text-blue-100 transition-colors"
                onClick={() => setShowEmotes(!showEmotes)}
                aria-label="Open emoji selector"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
                </svg>
              </button>
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="🅿️ress Enter to chat..."
                className="flex-1 p-1 bg-transparent border-none font-mono text-white focus:outline-none"
                maxLength={80}
                aria-label="Chat message input"
              />
            </div>
            <button
              type="submit"
              className="ml-1 px-2 py-1 bg-blue-900 text-white font-mono text-sm border-2 border-blue-800 rounded-sm hover:bg-blue-800 transition-colors"
              style={{
                imageRendering: 'pixelated',
                boxShadow: '0 0 0 1px rgba(120, 180, 255, 0.3)'
              }}
              disabled={!newMessage.trim()}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </>
  )
} 