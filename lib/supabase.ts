import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dczjhmrgcgptzegyhvfq.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_egx1iO8xHemqd7nX3OQBZQ_z7cysxiG';

export const supabase = createClient(supabaseUrl, supabaseKey);