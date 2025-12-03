'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardBody, CardHeader, Spinner } from '@nextui-org/react'
import { supabase } from '@/services/supabase-config'

export function SupabaseConnectionTest() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [supabaseInfo, setSupabaseInfo] = useState<any>(null)

  // Test the connection on component mount
  useEffect(() => {
    testConnection()
  }, [])

  // Test the Supabase connection
  async function testConnection() {
    setStatus('loading')
    setMessage('Testing Supabase connection...')
    
    try {
      // Check if we can connect to Supabase
      const { data, error } = await supabase.from('game_states').select('count').limit(1)
      
      if (error) throw error
      
      // Get Supabase project info
      const { data: projectData } = await supabase.rpc('get_project_info', {})
      
      setStatus('success')
      setMessage('Successfully connected to Supabase!')
      setSupabaseInfo({
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        projectInfo: projectData || 'Project info not available',
        tablesAccessible: true
      })
    } catch (error: any) {
      console.error('Error connecting to Supabase:', error)
      setStatus('error')
      
      // Provide helpful error messages based on common issues
      if (error.code === 'PGRST301') {
        setMessage('Database schema error: The requested table does not exist. Make sure you have run the SQL setup scripts.')
      } else if (error.code === 'PGRST401') {
        setMessage('Authentication error: Invalid API key or missing permissions. Check your Supabase URL and anon key.')
      } else if (error.message?.includes('Failed to fetch')) {
        setMessage('Network error: Could not reach Supabase. Check your internet connection and Supabase URL.')
      } else {
        setMessage(`Error connecting to Supabase: ${error?.message || 'Unknown error'}`)
      }
      
      setSupabaseInfo({
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        error: error?.message || 'Unknown error',
        code: error?.code || 'No error code'
      })
    }
  }

  return (
    <Card className="bg-gray-800 text-white">
      <CardHeader className="flex gap-3">
        <div className="flex flex-col">
          <p className="text-xl">Supabase Connection Test</p>
          <p className="text-small text-gray-400">Testing connection to your Supabase project</p>
        </div>
      </CardHeader>
      <CardBody>
        <div className="mb-4">
          <p className="mb-2">
            <span className="font-bold">URL:</span> {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not configured'}
          </p>
          <p className="mb-4">
            <span className="font-bold">API Key:</span> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '••••••••••••••••' : 'Not configured'}
          </p>
          
          <Button 
            color={status === 'success' ? 'success' : status === 'error' ? 'danger' : 'primary'}
            onClick={testConnection}
            disabled={status === 'loading'}
            className="mb-4"
          >
            {status === 'loading' ? (
              <>
                <Spinner size="sm" color="white" />
                <span className="ml-2">Testing...</span>
              </>
            ) : 'Test Connection'}
          </Button>
          
          {message && (
            <div className={`p-3 rounded mb-4 ${
              status === 'success' ? 'bg-green-800' : 
              status === 'error' ? 'bg-red-800' : 'bg-blue-800'
            }`}>
              {message}
            </div>
          )}
          
          {supabaseInfo && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Connection Details:</h3>
              <pre className="bg-gray-900 p-3 rounded overflow-auto max-h-60">
                {JSON.stringify(supabaseInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
} 