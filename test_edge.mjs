import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const anonKeyLine = envFile.split('\n').find(l => l.startsWith('EXPO_PUBLIC_SUPABASE_ANON_KEY='));
const anonKey = anonKeyLine.replace('EXPO_PUBLIC_SUPABASE_ANON_KEY=', '').trim();

fetch('https://xbbczjhopadjykqzpmgo.supabase.co/functions/v1/analyze-disaster-priority', { 
  method: 'POST', 
  headers: { 
    'Authorization': 'Bearer ' + anonKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({})
}).then(async r => {
  console.log("STATUS:", r.status);
  console.log("BODY:", await r.text());
}).catch(e => console.error(e));
