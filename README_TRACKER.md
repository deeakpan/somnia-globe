# Volume Tracker Server

## Overview

You need a **separate server process** to maintain persistent WebSocket connections for real-time event tracking. Next.js API routes are serverless and can't maintain long-lived connections.

## Setup

### Option 1: Run as Separate Process (Recommended)

1. **Start the tracker server:**
   ```bash
   npm run tracker
   ```
   Or if TypeScript doesn't work:
   ```bash
   npm run tracker:js
   ```

2. **In a separate terminal, start Next.js:**
   ```bash
   npm run dev
   ```

### Option 2: Use PM2 (Production)

Install PM2:
```bash
npm install -g pm2
```

Start both processes:
```bash
# Start tracker
pm2 start server/tracker.js --name tracker

# Start Next.js
pm2 start npm --name nextjs -- start

# Save PM2 config
pm2 save
pm2 startup
```

### Option 3: Use Docker

Create a `docker-compose.yml`:
```yaml
version: '3.8'
services:
  tracker:
    build: .
    command: node server/tracker.js
    env_file: .env
    restart: unless-stopped
  
  nextjs:
    build: .
    command: npm start
    ports:
      - "3000:3000"
    env_file: .env
    restart: unless-stopped
```

### Option 4: Deploy Separately

- **Tracker server**: Deploy to a VPS (DigitalOcean, AWS EC2, etc.) or use a service like Railway, Render, or Fly.io
- **Next.js app**: Deploy to Vercel, Netlify, or any hosting service

## Environment Variables

Make sure your `.env` file has:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
NEXT_PUBLIC_SOMNIA_RPC_URL=https://dream-rpc.somnia.network
NEXT_PUBLIC_SOMNIA_WS_URL=wss://dream-rpc.somnia.network
PRIVATE_KEY=your_private_key_if_needed
```

## How It Works

1. Tracker server starts and connects to Somnia WebSocket
2. Subscribes to events for all registered projects
3. Tracks unique wallets from events
4. Updates Supabase database in real-time
5. Recalculates rankings every 5 seconds (debounced)
6. Assigns countries to top 194 projects

## Monitoring

The tracker logs:
- When subscriptions are created
- New wallet detections
- Ranking recalculations
- Errors

Check logs with PM2:
```bash
pm2 logs tracker
```

