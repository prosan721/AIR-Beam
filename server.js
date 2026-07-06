const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Active file sharing rooms memory store
// roomId -> { senderWs, receivers: Map<id, ws>, fileMeta: {}, activeChunks: Map }
const rooms = new Map();

// Helper to get local Wi-Fi / Hotspot IPv4 Address
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          interface: name,
          ip: iface.address
        });
      }
    }
  }
  return addresses;
}

// Endpoint to retrieve server connection info & QR code
app.get('/api/info', async (req, res) => {
  const ips = getLocalIpAddresses();
  const primaryIp = ips.length > 0 ? ips[0].ip : 'localhost';
  const room = req.query.room;
  const serverUrl = room ? `http://${primaryIp}:${PORT}/?room=${room}` : `http://${primaryIp}:${PORT}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(serverUrl, {
      margin: 1,
      width: 280,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    res.json({
      success: true,
      url: serverUrl,
      ip: primaryIp,
      port: PORT,
      allIps: ips,
      qrCode: qrDataUrl
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper for generating short room codes
function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// WebSocket Signaling & Chunk Relay Server
wss.on('connection', (ws) => {
  let userRoomId = null;
  let userId = Math.random().toString(36).substring(2, 9);
  let isSender = false;

  ws.on('message', (message, isBinary) => {
    // Handle binary chunk relay if using WS binary protocol
    if (isBinary) {
      if (userRoomId && rooms.has(userRoomId)) {
        const room = rooms.get(userRoomId);
        // Relay binary payload from sender to all connected receivers
        if (isSender) {
          room.receivers.forEach((clientWs) => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(message, { binary: true });
            }
          });
        }
      }
      return;
    }

    // JSON Signaling Messages
    try {
      const data = JSON.parse(message.toString());

      switch (data.type) {
        case 'CREATE_ROOM': {
          const roomId = generateRoomCode();
          userRoomId = roomId;
          isSender = true;

          rooms.set(roomId, {
            senderWs: ws,
            fileMeta: data.fileMeta,
            receivers: new Map()
          });

          ws.send(JSON.stringify({
            type: 'ROOM_CREATED',
            roomId: roomId,
            peerId: userId,
            fileMeta: data.fileMeta
          }));
          console.log(`[ROOM CREATED] Code: ${roomId} by Sender ${userId}`);
          break;
        }

        case 'JOIN_ROOM': {
          const targetRoomId = data.roomId;
          if (!rooms.has(targetRoomId)) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: 'Invalid or expired room code!'
            }));
            return;
          }

          const room = rooms.get(targetRoomId);
          if (room.receivers.size >= 10) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: 'Room full! Maximum 10 receiving devices allowed.'
            }));
            return;
          }

          userRoomId = targetRoomId;
          isSender = false;
          room.receivers.set(userId, ws);

          // Confirm join to receiver
          ws.send(JSON.stringify({
            type: 'ROOM_JOINED',
            roomId: targetRoomId,
            peerId: userId,
            fileMeta: room.fileMeta,
            totalReceivers: room.receivers.size
          }));

          // Notify sender about new device
          if (room.senderWs && room.senderWs.readyState === WebSocket.OPEN) {
            room.senderWs.send(JSON.stringify({
              type: 'RECEIVER_CONNECTED',
              peerId: userId,
              deviceInfo: data.deviceInfo || 'Connected Device',
              totalReceivers: room.receivers.size
            }));
          }

          console.log(`[RECEIVER JOINED] Device ${userId} joined Room ${targetRoomId}`);
          break;
        }

        case 'SIGNAL': {
          // WebRTC signaling relay (Offer/Answer/ICE)
          if (!userRoomId || !rooms.has(userRoomId)) return;
          const room = rooms.get(userRoomId);

          if (isSender) {
            // Forward from sender to specific receiver
            const targetReceiver = room.receivers.get(data.targetPeerId);
            if (targetReceiver && targetReceiver.readyState === WebSocket.OPEN) {
              targetReceiver.send(JSON.stringify({
                type: 'SIGNAL',
                fromPeerId: userId,
                signal: data.signal
              }));
            }
          } else {
            // Forward from receiver to sender
            if (room.senderWs && room.senderWs.readyState === WebSocket.OPEN) {
              room.senderWs.send(JSON.stringify({
                type: 'SIGNAL',
                fromPeerId: userId,
                signal: data.signal
              }));
            }
          }
          break;
        }

        case 'CHUNK_META': {
          // Metadata header before chunk stream
          if (userRoomId && rooms.has(userRoomId)) {
            const room = rooms.get(userRoomId);
            room.receivers.forEach((clientWs) => {
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({
                  type: 'CHUNK_META',
                  chunkIndex: data.chunkIndex,
                  totalChunks: data.totalChunks,
                  byteOffset: data.byteOffset,
                  chunkSize: data.chunkSize
                }));
              }
            });
          }
          break;
        }

        case 'TRANSFER_PROGRESS': {
          if (userRoomId && rooms.has(userRoomId)) {
            const room = rooms.get(userRoomId);
            // Notify room of current progress
            if (room.senderWs && room.senderWs.readyState === WebSocket.OPEN) {
              room.senderWs.send(JSON.stringify({
                type: 'RECEIVER_PROGRESS',
                peerId: userId,
                progress: data.progress,
                receivedBytes: data.receivedBytes
              }));
            }
          }
          break;
        }

        case 'TRANSFER_COMPLETE': {
          if (userRoomId && rooms.has(userRoomId)) {
            const room = rooms.get(userRoomId);
            if (room.senderWs && room.senderWs.readyState === WebSocket.OPEN) {
              room.senderWs.send(JSON.stringify({
                type: 'RECEIVER_COMPLETE',
                peerId: userId
              }));
            }
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('[WS ERROR]', err.message);
    }
  });

  ws.on('close', () => {
    if (userRoomId && rooms.has(userRoomId)) {
      const room = rooms.get(userRoomId);
      if (isSender) {
        // Notify all receivers sender has closed
        room.receivers.forEach((clientWs) => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({
              type: 'SENDER_DISCONNECTED',
              message: 'Sender closed the connection.'
            }));
          }
        });
        rooms.delete(userRoomId);
        console.log(`[ROOM CLOSED] ${userRoomId}`);
      } else {
        room.receivers.delete(userId);
        if (room.senderWs && room.senderWs.readyState === WebSocket.OPEN) {
          room.senderWs.send(JSON.stringify({
            type: 'RECEIVER_DISCONNECTED',
            peerId: userId,
            totalReceivers: room.receivers.size
          }));
        }
        console.log(`[RECEIVER LEFT] Device ${userId} left Room ${userRoomId}`);
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log(`===================================================`);
  console.log(`🚀 Ultra-Fast Local Wi-Fi Sharing Server Running!`);
  console.log(`---------------------------------------------------`);
  console.log(`Access on this device: http://localhost:${PORT}`);
  if (ips.length > 0) {
    console.log(`Access from Mobile/PC on same Wi-Fi / Hotspot:`);
    ips.forEach(item => {
      console.log(`  👉 http://${item.ip}:${PORT}  (${item.interface})`);
    });
  } else {
    console.log(`⚠️ No active local Wi-Fi network interface detected.`);
  }
  console.log(`===================================================`);
});
