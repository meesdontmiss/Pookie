'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardBody, CardHeader, Input, Spinner } from '@nextui-org/react'
import { supabase } from '@/services/supabase-config'
import { chatService } from '@/services/chat-service'

export function ChatConnectionTest() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [testMessage, setTestMessage] = useState('')
  const [recentMessages, setRecentMessages] = useState<any[]>([])
  const [dbInfo, setDbInfo] = useState<any>(null)

  // Test the connection on component mount
  useEffect(() => {
    testConnection()
  }, [])

  // Subscribe to chat messages
  useEffect(() => {
    const unsubscribe = chatService.subscribeToMessages((messages) => {
      setRecentMessages(messages.slice(-5)) // Show last 5 messages
    }, 5)
    
    return unsubscribe
  }, [])

  // Check database schema
  async function checkDatabaseSchema() {
    try {
      // Get list of tables
      const { data: tables, error: tablesError } = await supabase
        .from('pg_catalog.pg_tables')
        .select('tablename')
        .eq('schemaname', 'public')
      
      if (tablesError) {
        console.error('Error fetching tables:', tablesError)
        return { tables: 'Error fetching tables' }
      }
      
      // Check if messages table exists
      const messagesTableExists = tables?.some(t => t.tablename === 'messages') || false
      
      // Try to get messages table structure if it exists
      let messagesColumns = 'Table does not exist'
      if (messagesTableExists) {
        const { data: columns, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type')
          .eq('table_name', 'messages')
          .eq('table_schema', 'public')
        
        if (!columnsError && columns) {
          messagesColumns = columns
        }
      }
      
      return {
        tables: tables || [],
        messagesTableExists,
        messagesColumns,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
      }
    } catch (error) {
      console.error('Error checking database schema:', error)
      return { error: 'Error checking database schema' }
    }
  }

  // Test the chat connection
  async function testConnection() {
    setStatus('loading')
    setMessage('Testing chat connection to Supabase...')
    
    try {
      // Get database schema info
      const schemaInfo = await checkDatabaseSchema()
      setDbInfo(schemaInfo)
      
      // If messages table doesn't exist, throw an error
      if (!schemaInfo.messagesTableExists) {
        throw new Error('Messages table does not exist in the database')
      }
      
      // Check if we can connect to the messages table
      const { data, error } = await supabase
        .from('messages')
        .select('count')
        .limit(1)
      
      if (error) throw error
      
      // Check if realtime is enabled
      const channel = supabase.channel('test-channel')
      const subscription = channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setStatus('success')
          setMessage('Successfully connected to Supabase chat! Realtime is enabled.')
          
          // Clean up subscription after confirming it works
          setTimeout(() => {
            channel.unsubscribe()
          }, 1000)
        }
      })
      
      // Set a timeout in case subscription doesn't work
      setTimeout(() => {
        if (status === 'loading') {
          setStatus('error')
          setMessage('Realtime subscription timed out. Realtime might not be enabled for the messages table.')
        }
      }, 5000)
      
    } catch (error: any) {
      console.error('Error connecting to Supabase chat:', error)
      setStatus('error')
      
      // Provide helpful error messages based on common issues
      if (error.code === 'PGRST301') {
        setMessage('Database schema error: The messages table does not exist. Make sure you have run the SQL setup scripts.')
      } else if (error.code === 'PGRST401') {
        setMessage('Authentication error: Invalid API key or missing permissions. Check your Supabase URL and anon key.')
      } else if (error.message?.includes('Failed to fetch')) {
        setMessage('Network error: Could not reach Supabase. Check your internet connection and Supabase URL.')
      } else if (error.message?.includes('Messages table does not exist')) {
        setMessage('The messages table does not exist in the database. Please run the messages-table.sql script in the Supabase SQL editor.')
      } else {
        setMessage(`Error connecting to Supabase chat: ${error?.message || 'Unknown error'}`)
      }
    }
  }

  // Send a test message
  async function sendTestMessage() {
    if (!testMessage.trim()) return
    
    try {
      await chatService.sendMessage('Test User', testMessage)
      setTestMessage('')
    } catch (error: any) {
      console.error('Error sending test message:', error)
      alert(`Error sending message: ${error?.message || 'Unknown error'}`)
    }
  }

  // Run the messages table SQL script
  async function createMessagesTable() {
    setStatus('loading')
    setMessage('Creating messages table...')
    
    try {
      // SQL script from supabase/messages-table.sql
      const sql = `
        -- Create messages table for chat functionality
        CREATE TABLE IF NOT EXISTS public.messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          username TEXT NOT NULL,
          message TEXT NOT NULL,
          timestamp BIGINT NOT NULL,
          user_id TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Enable Row Level Security
        ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
        
        -- Create policies for the messages table
        -- Allow anyone to read messages
        CREATE POLICY "Anyone can read messages"
          ON public.messages
          FOR SELECT
          USING (true);
        
        -- Allow anyone to insert messages (for guest users)
        CREATE POLICY "Anyone can insert messages"
          ON public.messages
          FOR INSERT
          USING (true);
        
        -- Enable realtime for the messages table
        BEGIN;
          DROP PUBLICATION IF EXISTS supabase_realtime;
          CREATE PUBLICATION supabase_realtime;
        COMMIT;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
      `
      
      // Execute the SQL script
      const { error } = await supabase.rpc('exec_sql', { sql })
      
      if (error) throw error
      
      setStatus('success')
      setMessage('Messages table created successfully! Please refresh the page to test the connection.')
      
      // Refresh database info
      const schemaInfo = await checkDatabaseSchema()
      setDbInfo(schemaInfo)
      
    } catch (error: any) {
      console.error('Error creating messages table:', error)
      setStatus('error')
      setMessage(`Error creating messages table: ${error?.message || 'Unknown error'}. You may need to run the SQL script manually in the Supabase SQL editor.`)
    }
  }

  return (
    <Card className="bg-gray-800 text-white">
      <CardHeader className="flex gap-3">
        <div className="flex flex-col">
          <p className="text-xl">Chat Connection Test</p>
          <p className="text-small text-gray-400">Testing connection to Supabase chat</p>
        </div>
      </CardHeader>
      <CardBody>
        <div className="mb-4">
          <p className="mb-2">
            <span className="font-bold">Project URL:</span> {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not configured'}
          </p>
          
          <div className="flex gap-2 mb-4">
            <Button 
              color={status === 'success' ? 'success' : status === 'error' ? 'danger' : 'primary'}
              onClick={testConnection}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? (
                <>
                  <Spinner size="sm" color="white" />
                  <span className="ml-2">Testing...</span>
                </>
              ) : 'Test Chat Connection'}
            </Button>
            
            <Button 
              color="warning"
              onClick={createMessagesTable}
              disabled={status === 'loading'}
            >
              Create Messages Table
            </Button>
          </div>
          
          {message && (
            <div className={`p-3 rounded mb-4 ${
              status === 'success' ? 'bg-green-800' : 
              status === 'error' ? 'bg-red-800' : 'bg-blue-800'
            }`}>
              {message}
            </div>
          )}
          
          {dbInfo && (
            <div className="mt-4 mb-4">
              <h3 className="text-lg font-semibold mb-2">Database Information:</h3>
              <div className="bg-gray-900 p-3 rounded overflow-auto max-h-60">
                <p><span className="font-bold">Messages Table Exists:</span> {dbInfo.messagesTableExists ? 'Yes ✅' : 'No ❌'}</p>
                {dbInfo.tables && Array.isArray(dbInfo.tables) && (
                  <div className="mt-2">
                    <p className="font-bold">Available Tables:</p>
                    <ul className="list-disc pl-5">
                      {dbInfo.tables.map((table: any, index: number) => (
                        <li key={index}>{table.tablename}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Send Test Message</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Enter a test message"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="flex-1"
              />
              <Button color="primary" onClick={sendTestMessage}>
                Send
              </Button>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Recent Messages</h3>
            {recentMessages.length > 0 ? (
              <div className="bg-gray-900 p-3 rounded overflow-auto max-h-60">
                {recentMessages.map((msg, index) => (
                  <div key={msg.id || index} className="mb-2">
                    <span className="font-bold">{msg.username}:</span> {msg.message}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No messages yet</p>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  )
} 