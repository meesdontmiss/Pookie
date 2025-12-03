// Script to initialize the game_states table in Supabase
// Run with: node scripts/init-game-states-table.js

require('dotenv').config({ path: '.env.local' })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Supabase URL or anon key is missing in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function initGameStatesTable() {
  console.log('Initializing game_states table in Supabase...')
  
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '..', 'supabase', 'game-states-table.sql')
    const sql = fs.readFileSync(sqlFilePath, 'utf8')
    
    // Split the SQL into individual statements
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0)
    
    // Execute each statement
    for (const statement of statements) {
      console.log(`Executing SQL statement: ${statement.substring(0, 50)}...`)
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      
      if (error) {
        console.error(`Error executing SQL statement: ${error.message}`)
        console.error('Statement:', statement)
      }
    }
    
    console.log('Game states table initialization complete!')
    
    // Verify the table exists
    const { data, error } = await supabase
      .from('game_states')
      .select('id')
      .limit(1)
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('Table exists but is empty.')
      } else {
        console.error('Error verifying table:', error.message)
      }
    } else {
      console.log('Table verified successfully!')
    }
    
  } catch (error) {
    console.error('Error initializing game_states table:', error)
  }
}

// Create a stored procedure to execute SQL (needed for complex statements)
async function createExecSqlFunction() {
  try {
    const { error } = await supabase.rpc('exec_sql', { 
      sql: 'SELECT 1' 
    })
    
    if (error && error.message.includes('function exec_sql does not exist')) {
      console.log('Creating exec_sql function...')
      
      // Create the function using raw SQL
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
          BEGIN
            EXECUTE sql;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      })
      
      if (createError) {
        console.error('Error creating exec_sql function:', createError.message)
        
        // Try an alternative approach using the REST API directly
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({
            sql: `
              CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
              BEGIN
                EXECUTE sql;
              END;
              $$ LANGUAGE plpgsql SECURITY DEFINER;
            `
          })
        })
        
        if (!response.ok) {
          console.error('Error creating exec_sql function via REST API:', await response.text())
          console.log('Please run the SQL manually in the Supabase SQL editor.')
          process.exit(1)
        }
      }
      
      console.log('exec_sql function created successfully!')
    } else if (!error) {
      console.log('exec_sql function already exists.')
    } else {
      console.error('Error checking for exec_sql function:', error.message)
    }
  } catch (error) {
    console.error('Error creating exec_sql function:', error)
  }
}

// Run the initialization
async function run() {
  try {
    await createExecSqlFunction()
    await initGameStatesTable()
  } catch (error) {
    console.error('Error running initialization:', error)
  }
}

run() 