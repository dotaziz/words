#!/usr/bin/env node
/**
 * Simple SQLite query script for Neutralinojs Words Dictionary
 * Called via Neutralino.os.execCommand()
 */

const Database = require('better-sqlite3');
const path = require('path');

const word = process.argv[2];

if (!word) {
  console.log(JSON.stringify(null));
  process.exit(0);
}

try {
  const dbPath = path.join(__dirname, '..', '..', 'database', 'dict_en_v2.db');
  const db = new Database(dbPath, { readonly: true });
  
  const row = db.prepare('SELECT * FROM words WHERE word = ?').get(word.toLowerCase().trim());
  
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
