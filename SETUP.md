# Setup Instructions

## 1. Create Environment Variables

Create a `.env.local` file in the root directory with the following:

```env
# Supabase Configuration
# Get these from: https://app.supabase.com/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Somnia RPC Configuration
NEXT_PUBLIC_SOMNIA_RPC_URL=https://dream-rpc.somnia.network
NEXT_PUBLIC_SOMNIA_WS_URL=wss://dream-rpc.somnia.network

# Private Key (optional, for write operations)
PRIVATE_KEY=your-private-key-here

# Hardhat Configuration
SOMNIA_RPC_TESTNET=https://dream-rpc.somnia.network/
```

## 2. Get Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project or select an existing one
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 3. Create Supabase Table

Run the SQL from `supabase_schema.sql` in your Supabase SQL Editor:

1. Go to **SQL Editor** in Supabase
2. Create a new query
3. Copy and paste the contents of `supabase_schema.sql`
4. Run the query

## 4. Restart Development Server

After creating `.env.local`, restart your Next.js dev server:

```bash
npm run dev
```

## Troubleshooting

If you see "Missing Supabase environment variables":
- Make sure `.env.local` exists in the root directory
- Make sure the variable names start with `NEXT_PUBLIC_` for client-side access
- Restart the dev server after creating/updating `.env.local`

