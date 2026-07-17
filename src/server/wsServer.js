const { WebSocketServer, WebSocket } = require('ws');

const wss = new WebSocketServer({ port: 3001 });

// Maps socket connection to active shopId
const clients = new Map();

console.log('[DEBUG] Standalone Nexthood WebSocket Server running on port 3001');

wss.on('connection', (ws) => {
  console.log('[DEBUG] WebSocket client connected.');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('[DEBUG] WS Message received:', data);

      if (data.type === 'subscribe') {
        clients.set(ws, data.shopId);
        console.log(`[DEBUG] Client subscribed to shopId: ${data.shopId}`);
      } else if (data.type === 'broadcast_update') {
        // Broadcast to all other clients listening to the same shopId
        const { shopId, productId, stock, updateType, change } = data;
        
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN && clients.get(client) === shopId) {
            client.send(JSON.stringify({
              type: 'stock_update',
              productId,
              stock,
              updateType,
              change
            }));
          }
        });
        console.log(`[DEBUG] Broadcasted stock update for shop ${shopId}: Product ${productId} -> Stock ${stock}`);
      }
    } catch (e) {
      console.error('[DEBUG] WS message processing error:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('[DEBUG] WebSocket client disconnected.');
  });
});
