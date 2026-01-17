#!/usr/bin/env node
/**
 * Get a random word from the dictionary
 */

const Database = require('better-sqlite3');
const path = require('path');

try {
  const dbPath = path.join(__dirname, '..', '..', 'database', 'dict_en_v2.db');
  const db = new Database(dbPath, { readonly: true });
  
  // Get a random word
  const row = db.prepare(`
    SELECT * FROM words 
    ORDER BY RANDOM() 
    LIMIT 1
  `).get();
  
  if (row) {
    const result = {
      ...row,
      phonetics: row.phonetics ? JSON.parse(row.phonetics) : [],
      meanings: row.meanings ? JSON.parse(row.meanings) : []
    };
    console.log(JSON.stringify(result));
  } else {
    console.log(JSON.stringify(null));
  }
  
  db.close();
} catch (err) {
  console.error(err.message);
  console.log(JSON.stringify(null));
}
