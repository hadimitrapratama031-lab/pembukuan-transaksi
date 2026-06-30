import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dqiayrsojpyglkumtsgo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaWF5cnNvanB5Z2xrdW10c2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3OTI2MTYsImV4cCI6MjA5ODM2ODYxNn0.TTueIeVBoxW_3cNuuj6JdKuiQSiqDa0g2bTutfe9Oqg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
