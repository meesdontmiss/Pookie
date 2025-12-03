'use client'

import { useEffect, useRef, useState } from 'react'
import { ChatMessage } from '../../../services/chat-service'

interface ChatHistoryProps {
  messages: ChatMessage[]
  currentUsername: string
  bluePMode?: boolean
}

export function ChatHistory({ 
  messages, 
  currentUsername,
  bluePMode = true 
}: ChatHistoryProps) {
  // State
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const lastMessageCountRef = useRef(0)
  
  // Scroll to bottom when messages update
  useEffect(() => {
    if (messages.length > 0) {
      // Check if we have new messages
      if (messages.length > lastMessageCountRef.current) {
        // If scrolled to bottom, keep it at bottom
        if (isScrolledToBottom) {
          setTimeout(scrollToBottom, 100)
        } else {
          // Otherwise increment unread count
          setUnreadCount(prev => prev + (messages.length - lastMessageCountRef.current))
        }
      }
      
      // Update last message count
      lastMessageCountRef.current = messages.length
    }
  }, [messages, isScrolledToBottom])
  
  // Handle scroll events to detect if user is at bottom
  useEffect(() => {
    const container = chatContainerRef.current
    if (!container) return
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10
      setIsScrolledToBottom(isAtBottom)
      
      // Reset unread count when scrolled to bottom
      if (isAtBottom && unreadCount > 0) {
        setUnreadCount(0)
      }
    }
    
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [unreadCount])
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setUnreadCount(0)
  }
  
  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }
  
  // Get message color based on username
  const getMessageColor = (msgUsername: string) => {
    if (msgUsername === currentUsername) return 'text-cyan-300'
    if (msgUsername === 'System') return 'text-yellow-300'
    
    // Generate consistent color based on username
    const colors = [
      'text-white', 
      'text-green-300', 
      'text-red-300', 
      'text-purple-300', 
      'text-blue-300',
      'text-orange-300',
      'text-pink-300'
    ]
    
    // Simple hash function to get consistent color
    let hash = 0
    for (let i = 0; i < msgUsername.length; i++) {
      hash = msgUsername.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    return colors[Math.abs(hash) % colors.length]
  }
  
  // Check if message contains emojis
  const containsEmoji = (message: string) => {
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
    return emojiRegex.test(message)
  }
  
  // Replace P's with blue P emoji
  const replaceWithBlueP = (text: string) => {
    return bluePMode ? text.replace(/[pP]/g, '🅿️') : text
  }
  
  // For debugging
  useEffect(() => {
    console.log('Chat history messages:', messages)
  }, [messages])
  
  return (
    <div className="fixed bottom-0 left-0 z-20 p-2 pointer-events-none">
      <div className="pointer-events-auto">
        <div className="relative mb-1 overflow-hidden">
          {/* Chat history box */}
          <div 
            ref={chatContainerRef}
            className="w-80 max-h-64 overflow-y-auto p-2 font-mono text-sm bg-black bg-opacity-70 border-2 border-blue-900 rounded-sm"
            style={{
              imageRendering: 'pixelated',
              boxShadow: '0 0 0 1px rgba(120, 180, 255, 0.3), inset 0 0 10px rgba(30, 60, 120, 0.5)'
            }}
          >
            {messages.length === 0 ? (
              <p className="text-blue-300 italic px-1">Welcome to Winter Chat! {bluePMode ? 'Ty🅿️e' : 'Type'} a message below.</p>
            ) : (
              messages.slice(-20).map(msg => (
                <div 
                  key={msg.id} 
                  className={`px-1 py-1 mb-1 border-b border-blue-900/30 last:border-0 last:mb-0 ${
                    msg.username === currentUsername ? 'bg-blue-900/20' : ''
                  } ${
                    msg.username === 'System' ? 'bg-yellow-900/20' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-gray-400 text-xs">[{formatTime(msg.timestamp)}] </span>
                    <span className={`font-bold ${getMessageColor(msg.username)}`}>{replaceWithBlueP(msg.username)}: </span>
                  </div>
                  <div className={`pl-2 break-words ${containsEmoji(msg.message) ? 'text-lg' : 'text-white'}`}>
                    {msg.message}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Unread messages indicator */}
          {unreadCount > 0 && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-0 right-0 bg-blue-600 text-white px-2 py-1 rounded-full text-xs animate-pulse"
            >
              {unreadCount} new {unreadCount === 1 ? 'message' : 'messages'} ↓
            </button>
          )}
          
          {/* Pixelated snow overlay */}
          <div 
            className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10"
            style={{
              backgroundImage: 'url(/images/pixel-snow.svg)',
              backgroundSize: '100px',
              backgroundRepeat: 'repeat',
              mixBlendMode: 'screen'
            }}
          />
        </div>
      </div>
    </div>
  )
} 