const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey);
const supabase = createClient(supabaseUrl, supabaseKey);
supabase.from('members').select('*').limit(1).then(console.log).catch(console.error);
