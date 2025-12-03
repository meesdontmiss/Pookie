'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardBody, CardHeader, Input } from '@nextui-org/react'
import { supabase } from '@/services/supabase-config'

export function SimpleRealtimeTest() {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [status, setStatus] = useState('')
  
  // Subscribe to realtime changes
  useEffect(() => {
    // Log the Supabase URL to verify we're connecting to the right project
    console.log('Connecting to Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    
    // Create a channel for the messages table
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('Change received!', payload)
          setStatus(`Change received at ${new Date().toLocaleTimeString()}: ${JSON.stringify(payload.new)}`)
          
          // Add the new message to the list
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new])
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
        setStatus(`Subscription status: ${status} at ${new Date().toLocaleTimeString()}`)
      })
    
    // Fetch existing messages
    fetchMessages()
    
    // Clean up the subscription
    return () => {
      channel.unsubscribe()
    }
  }, [])
  
  // Fetch existing messages
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (error) throw error
      
      console.log('Fetched messages:', data)
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }
  
  // Send a new message
  const sendMessage = async () => {
    if (!newMessage.trim()) return
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            username: 'Realtime Test',
            message: newMessage,
            timestamp: Date.now()
          }
        ])
      
      if (error) throw error
      
      console.log('Message sent:', data)
      setNewMessage('')
    } catch (error: any) {
      console.error('Error sending message:', error)
      alert(`Error sending message: ${error?.message || 'Unknown error'}`)
    }
  }
  
  return (
    <Card className="bg-gray-800 text-white">
      <CardHeader className="flex gap-3">
        <div className="flex flex-col">
          <p className="text-xl">Simple Realtime Test</p>
          <p className="text-small text-gray-400">Testing realtime functionality with messages</p>
        </div>
      </CardHeader>
      <CardBody>
        <div className="mb-4">
          <p className="mb-2">Status: {status || 'Waiting for events...'}</p>
          
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Type a test message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1"
            />
            <Button color="primary" onClick={sendMessage}>
              Send
            </Button>
          </div>
          
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Recent Messages:</h3>
            {messages.length > 0 ? (
              <div className="bg-gray-900 p-3 rounded overflow-auto max-h-60">
                {messages.map((msg) => (
                  <div key={msg.id} className="mb-2">
                    <span className="font-bold">{msg.username}:</span> {msg.message}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No messages yet</p>
            )}
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Troubleshooting:</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Make sure you've run the SQL script to enable realtime</li>
              <li>Check the browser console for any errors</li>
              <li>Try refreshing the page</li>
              <li>Verify that your Supabase project has realtime enabled in Project Settings</li>
            </ol>
          </div>
        </div>
      </CardBody>
    </Card>
  )
} 