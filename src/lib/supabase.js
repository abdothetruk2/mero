import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://oeikxnecjeqdzqvqspxs.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laWt4bmVjamVxZHpxdnFzcHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MDYyNDksImV4cCI6MjA1OTE4MjI0OX0.J4-PGG_oYZJjwi6iN0nCQeBG3aUZfwuGs7CqTwjQEek"

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getOrCreateUser = async (username) => {
  try {
    // First try to find the user
    let { data: user, error } = await supabase
      .from('chat_users')
      .select('*')
      .eq('username', username)
      .maybeSingle(); // Use maybeSingle instead of single to avoid 406 error

    // If user doesn't exist, create a new one
    if (!user) {
      const { data: newUser, error: insertError } = await supabase
        .from('chat_users')
        .insert([{ username }])
        .select()
        .single();

      if (insertError) throw insertError;
      return newUser;
    }

    return user;
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    throw error;
  }
};
