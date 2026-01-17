/**
 * SQLite Extension for Neutralinojs Words Dictionary
 * 
 * Connects to SQLite database and handles query events from the app.
 */

const Database = require('better-sqlite3');
const WebSocket = require('ws');
const path = require('path');

let connectionInfo = '';
let db = null;
let ws = null;
let nlToken = '';

process.stdin.on('data', (data) => {
  connectionInfo += data.toString();
  try {
    const config = JSON.parse(connectionInfo);
    initExtension(config);
  } catch (e) {
    // Wait for more data
  }
});

function initExtension(config) {
  nlToken = config.nlToken;
  const { nlPort, nlConnectToken, nlExtensionId } = config;
  
  console.log(`SQLite Extension starting on port ${nlPort}`);
  
  const wsUrl = `ws://localhost:${nlPort}?extensionId=${nlExtensionId}&connectToken=${nlConnectToken}`;
  ws = new WebSocket(wsUrl);
  
  ws.on('open', () => {
    console.log('Connected to Neutralino server');
    
    try {
      const dbPath = path.join(process.cwd(), 'database', 'dict_en_v2.db');
      console.log(`Opening database: ${dbPath}`);
      db = new Database(dbPath, { readonly: true });
      console.log('Database connected successfully');
    } catch (err) {
      console.error('Failed to open database:', err);
    }
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Handle extension events dispatched from app
      if (message.event === 'queryWord' && message.data) {
        const word = message.data.word;
        const requestId = message.data.requestId;
        
        console.log(`Query received for: ${word}`);
        
        if (!db) {
          broadcastResult(requestId, null);
          return;
        }
        
        try {
          const row = db.prepare('SELECT * FROM words WHERE word = ?').get(word);
          
          if (row) {
            const result = {
              ...row,
              phonetics: row.phonetics ? JSON.parse(row.phonetics) : [],
              meanings: row.meanings ? JSON.parse(row.meanings) : []
            };
            broadcastResult(requestId, result);
          } else {
            broadcastResult(requestId, null);
          }
        } catch (err) {
          console.error('Query error:', err);
          broadcastResult(requestId, null);
        }
      }
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  });
  
  ws.on('error', (err) => console.error('WebSocket error:', err));
  ws.on('close', () => process.exit(0));
}

function broadcastResult(requestId, data) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  
  ws.send(JSON.stringify({
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    method: 'app.broadcast',
    accessToken: nlToken,
    data: {
      event: 'queryResult',
      data: { requestId, result: data }
    }
  }));
}

process.on('SIGINT', () => { db?.close(); process.exit(0); });
process.on('SIGTERM', () => { db?.close(); process.exit(0); });

console.log('SQLite extension waiting for connection info...');
