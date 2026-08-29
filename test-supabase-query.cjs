const { createClient } = require('@supabase/supabase-js');

const url = "https://elwssfuzifmzsdibeuwa.supabase.co"; // user's expected URL
const envUrl = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const customFetch = async (requestUrl, options) => {
    const urlObj = new URL(requestUrl);
    console.log('- request URL hostname:', urlObj.hostname);
    
    try {
      const response = await fetch(requestUrl, options);
      console.log('- HTTP status:', response.status);
      return response;
    } catch (e) {
      console.log('- fetch exception:', e.message);
      throw e;
    }
};

const supabase = createClient(url, key, {
  global: { fetch: customFetch }
});

console.log('--- TEST WITH EXPECTED URL ---');
console.log('- resolved Supabase hostname:', new URL(url).hostname);

supabase.from('members').select('member_id,full_name').limit(1).then(({data, error, status}) => {
   if (error) {
       console.log('- Supabase error code/message:', error.code, error.message);
   } else {
       console.log('- Data returned successfully, count:', data.length);
   }
   console.log('\n--- CURRENT ENVIRONMENT VARIABLE ---');
   console.log('process.env.VITE_SUPABASE_URL:', envUrl);
}).catch(err => {
   console.log('Exception:', err.message);
});
