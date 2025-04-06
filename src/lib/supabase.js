import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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