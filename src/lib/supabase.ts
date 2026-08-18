import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './database.types';

// Publishable key — safe to embed; RLS is the security boundary.
const SUPABASE_URL = 'https://ylholksizarydbbrceut.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PgYn0hKryL17vjPwtoxj7Q_yMmX5S6i';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
