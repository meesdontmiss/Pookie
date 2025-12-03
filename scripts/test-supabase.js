// Test script for Supabase connection
// Run with: node scripts/test-supabase.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Supabase URL or anon key is missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabaseConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test authentication
    console.log('Testing authentication...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('Authentication error:', authError.message);
    } else {
      console.log('Authentication working correctly');
      console.log('Session:', authData.session ? 'Active' : 'None');
    }
    
    // Test database access
    console.log('\nTesting database access...');
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(5);
    
    if (messagesError) {
      if (messagesError.code === '42P01') {
        console.error('Error: The "messages" table does not exist. Please run the SQL script in supabase/messages-table.sql');
      } else {
        console.error('Database error:', messagesError.message);
      }
    } else {
      console.log('Database access working correctly');
      console.log(`Found ${messagesData.length} messages`);
    }
    
    console.log('\nTest completed');
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

testSupabaseConnection(); 