'use client'

import { useState } from 'react'
import { Button, Card, CardBody, CardHeader, Spinner } from '@nextui-org/react'
import { supabase } from '@/services/supabase-config'

export function CheckRealtimeStatus() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [realtimeInfo, setRealtimeInfo] = useState<any>(null)

  // Check if realtime is enabled
  async function checkRealtimeStatus() {
    setStatus('loading')
    setMessage('Checking realtime status...')
    
    try {
      // Check if the publication exists
      const { data: publicationData, error: publicationError } = await supabase.rpc(
        'check_publication_exists',
        { publication_name: 'supabase_realtime' }
      )
      
      if (publicationError) {
        // If the RPC doesn't exist, try a direct query
        const { data: directData, error: directError } = await supabase.from('pg_publication')
          .select('*')
          .eq('pubname', 'supabase_realtime')
        
        if (directError) {
          throw new Error('Could not check if publication exists: ' + directError.message)
        }
        
        if (directData && directData.length > 0) {
          // Publication exists, now check which tables are included
          const { data: tablesData, error: tablesError } = await supabase.from('pg_publication_tables')
            .select('*')
            .eq('pubname', 'supabase_realtime')
          
          if (tablesError) {
            throw new Error('Could not check publication tables: ' + tablesError.message)
          }
          
          setStatus('success')
          setMessage('Realtime is enabled!')
          setRealtimeInfo({
            publicationExists: true,
            tables: tablesData
          })
        } else {
          setStatus('error')
          setMessage('Realtime publication does not exist. Run the SQL script to enable it.')
          setRealtimeInfo({
            publicationExists: false
          })
        }
      } else {
        // RPC worked, use its result
        if (publicationData) {
          setStatus('success')
          setMessage('Realtime is enabled!')
          setRealtimeInfo({
            publicationExists: true,
            data: publicationData
          })
        } else {
          setStatus('error')
          setMessage('Realtime publication does not exist. Run the SQL script to enable it.')
          setRealtimeInfo({
            publicationExists: false
          })
        }
      }
      
      // Test realtime subscription
      const channel = supabase.channel('test-realtime')
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setMessage(prev => prev + ' Realtime subscription test successful!')
          
          // Clean up subscription after confirming it works
          setTimeout(() => {
            channel.unsubscribe()
          }, 1000)
        }
      })
      
    } catch (error: any) {
      console.error('Error checking realtime status:', error)
      setStatus('error')
      setMessage(`Error checking realtime status: ${error?.message || 'Unknown error'}`)
      setRealtimeInfo(null)
    }
  }

  // Enable realtime for all tables
  async function enableRealtimeForAllTables() {
    setStatus('loading')
    setMessage('Enabling realtime for all tables...')
    
    try {
      // Run the SQL to enable realtime
      const { data, error } = await supabase.rpc(
        'execute_sql',
        { 
          sql_string: `
            BEGIN;
              DROP PUBLICATION IF EXISTS supabase_realtime;
              CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
            COMMIT;
          `
        }
      )
      
      if (error) {
        throw new Error('Could not enable realtime: ' + error.message)
      }
      
      setStatus('success')
      setMessage('Realtime enabled for all tables! Please check the status again.')
    } catch (error: any) {
      console.error('Error enabling realtime:', error)
      setStatus('error')
      setMessage(`Error enabling realtime: ${error?.message || 'Unknown error'}. Please run the SQL script manually.`)
    }
  }

  return (
    <Card className="bg-gray-800 text-white">
      <CardHeader className="flex gap-3">
        <div className="flex flex-col">
          <p className="text-xl">Realtime Status Check</p>
          <p className="text-small text-gray-400">Check if realtime is enabled for your tables</p>
        </div>
      </CardHeader>
      <CardBody>
        <div className="mb-4">
          <div className="flex gap-2 mb-4">
            <Button 
              color="primary"
              onClick={checkRealtimeStatus}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? (
                <>
                  <Spinner size="sm" color="white" />
                  <span className="ml-2">Checking...</span>
                </>
              ) : 'Check Realtime Status'}
            </Button>
            
            <Button 
              color="secondary"
              onClick={enableRealtimeForAllTables}
              disabled={status === 'loading'}
            >
              Enable Realtime
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
          
          {realtimeInfo && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Realtime Information:</h3>
              <pre className="bg-gray-900 p-3 rounded overflow-auto max-h-60">
                {JSON.stringify(realtimeInfo, null, 2)}
              </pre>
            </div>
          )}
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Manual Steps:</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Go to the SQL Editor in your Supabase dashboard</li>
              <li>Create a new query</li>
              <li>Copy and paste the following SQL:</li>
              <pre className="bg-gray-900 p-3 rounded overflow-auto my-2">
                {`BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
COMMIT;`}
              </pre>
              <li>Run the query</li>
              <li>Click "Check Realtime Status" again to verify</li>
            </ol>
          </div>
        </div>
      </CardBody>
    </Card>
  )
} 