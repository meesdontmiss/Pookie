// Script to add a test message to the messages table
// Run with: node scripts/add-test-message.js

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

async function addTestMessage() {
  console.log('Adding test message to the messages table...');
  
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        username: 'System',
        message: 'Welcome to Plug Penguin Chat!',
        timestamp: Date.now(),
        user_id: null
      })
      .select();
    
    if (error) {
      console.error('Error adding test message:', error.message);
      return;
    }
    
    console.log('Test message added successfully!');
    console.log('Message:', data[0]);
    
    // Fetch all messages to verify
    const { data: allMessages, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: true });
    
    if (fetchError) {
      console.error('Error fetching messages:', fetchError.message);
      return;
    }
    
    console.log(`\nAll messages (${allMessages.length}):`);
    allMessages.forEach(msg => {
      console.log(`- ${msg.username}: ${msg.message}`);
    });
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

addTestMessage(); 