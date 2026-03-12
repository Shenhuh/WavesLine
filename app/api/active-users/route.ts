// app/api/active-users/route.ts
import { NextRequest } from 'next/server';

// Store active users and their last ping time
const activeUsers = new Map<string, number>();
const CLEANUP_INTERVAL = 30000; // 30 seconds
const USER_TIMEOUT = 45000; // 45 seconds

// Clean up stale users every 30 seconds
setInterval(() => {
  const now = Date.now();
  let changed = false;
  
  for (const [userId, lastPing] of activeUsers.entries()) {
    if (now - lastPing > USER_TIMEOUT) {
      activeUsers.delete(userId);
      changed = true;
    }
  }
  
  // Broadcast updated count if users were removed
  if (changed) {
    broadcastToAll();
  }
}, CLEANUP_INTERVAL);

// Store all connected clients to broadcast to them
const clients = new Map<string, ReadableStreamDefaultController>();

function broadcastToAll() {
  const count = activeUsers.size;
  const message = `data: ${JSON.stringify({ count })}\n\n`;
  
  clients.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch (e) {
      // Client disconnected, will be cleaned up
    }
  });
}

export async function GET(req: NextRequest) {
  // Generate a unique ID for this user
  const userId = Math.random().toString(36).substring(7);
  
  // Add user to active users
  activeUsers.set(userId, Date.now());
  
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Store controller for this client
      clients.set(userId, controller);
      
      // Send initial count
      const initialCount = activeUsers.size;
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ count: initialCount })}\n\n`));
      
      // Broadcast to all clients that a new user joined
      broadcastToAll();
      
      // Send ping every 25 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        try {
          // Update last ping time
          activeUsers.set(userId, Date.now());
          
          // Send comment as heartbeat (clients ignore this)
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch (e) {
          clearInterval(pingInterval);
        }
      }, 25000);
      
      // Handle client disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        activeUsers.delete(userId);
        clients.delete(userId);
        
        // Broadcast updated count
        broadcastToAll();
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}