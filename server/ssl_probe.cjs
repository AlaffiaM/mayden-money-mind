const { Client } = require('pg');
const tries = [
  ['plain (no sslmode)', 'postgresql://postgres:postgres@localhost:5432/postgres'],
  ['sslmode=require',     'postgresql://postgres:postgres@localhost:5432/postgres?sslmode=require'],
  ['current-user plain',  'postgresql://localhost:5432/postgres'],
  ['current-user sslmode=require', 'postgresql://localhost:5432/postgres?sslmode=require'],
];
async function tryConn(label, url){
  const c = new Client({ connectionString: url, connectionTimeoutMillis: 4000 });
  try { await c.connect(); const v = await c.query('select version()'); console.log('OK   |', label, '->', v.rows[0].version.split(' on ')[0]); await c.end(); }
  catch(e){ console.log('FAIL |', label, '->', e.message.split('\n')[0]); try{await c.end();}catch(_){} }
}
(async () => { for (const [l,u] of tries) await tryConn(l,u); })();