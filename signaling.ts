import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = 3001;
const server = createServer();
const wss = new WebSocketServer({ server });
const rooms = new Map<string, Set<WebSocket>>();

const handlePortConflict = (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\x1b[33m[SIGNAL] Port ${PORT} is already in use. Reusing the existing Tobu signaling server instance.\x1b[0m`);
    process.exit(0);
  } else {
    console.error('\x1b[31m[SIGNAL] Server error:\x1b[0m', err);
    process.exit(1);
  }
};

server.on('error', handlePortConflict);
wss.on('error', handlePortConflict);

wss.on('connection', (ws: WebSocket) => {
  let joinedRoom: string | null = null;

  ws.on('message', (message: string) => {
    try {
      const parsed = JSON.parse(message);
      
      if (parsed.type === 'join') {
        const room = parsed.room;
        
        // Validation room name
        if (!room || typeof room !== 'string') {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid room ID' }));
          return;
        }

        // Initialize room set
        if (!rooms.has(room)) {
          rooms.set(room, new Set<WebSocket>());
        }

        const clients = rooms.get(room)!;

        // Room capacity check (max 2 peers)
        if (clients.size >= 2) {
          console.log(`\x1b[35m[SIGNAL]\x1b[0m Room ${room} is full. Rejecting join.`);
          ws.send(JSON.stringify({ type: 'error', message: 'Handshake Room is full (Max 2 peers).' }));
          return;
        }

        joinedRoom = room;
        clients.add(ws);

        console.log(`\x1b[35m[SIGNAL]\x1b[0m Peer joined room \x1b[33m#${room}\x1b[0m. Total peers in room: ${clients.size}/2`);

        // Notify the existing peer in the room that a new peer joined
        clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'peer-joined' }));
          }
        });
      } else if (parsed.type === 'signal') {
        const room = parsed.room;
        const clients = rooms.get(room);

        if (clients) {
          clients.forEach((client) => {
            // Forward signal payload to the OTHER peer in the room
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'signal',
                data: parsed.data
              }));
            }
          });
        }
      }
    } catch (err) {
      console.error('\x1b[31m[SIGNAL] Error processing signaling message:\x1b[0m', err);
    }
  });

  ws.on('close', () => {
    if (joinedRoom && rooms.has(joinedRoom)) {
      const clients = rooms.get(joinedRoom)!;
      clients.delete(ws);
      
      console.log(`\x1b[35m[SIGNAL]\x1b[0m Peer left room \x1b[33m#${joinedRoom}\x1b[0m. Remaining peers: ${clients.size}/2`);
      
      if (clients.size === 0) {
        rooms.delete(joinedRoom);
        console.log(`\x1b[35m[SIGNAL]\x1b[0m Room \x1b[33m#${joinedRoom}\x1b[0m has been recycled.`);
      } else {
        // Notify the remaining peer that their partner disconnected
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'peer-left' }));
          }
        });
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`\x1b[35m[SIGNAL]\x1b[0m Signaling server listening on port ${PORT}`);
});
