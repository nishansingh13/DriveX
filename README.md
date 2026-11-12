# DriveX

Self-hosted file storage: files are split into 1 MB chunks, every chunk is
stored on two of four storage nodes with a SHA-256 hash, and damaged or
missing copies are repaired automatically.

## Run it

1. **Server**
   ```
   cd server
   npm install
   cp .env.example .env        # then set MONGO_URI and JWT_SECRET
   node scripts/createAdmin.js admin@drivex.local <password>
   npm run dev                 # http://localhost:5000/api/health
   ```
2. **Client** (in a second terminal)
   ```
   cd client
   npm install
   cp .env.example .env
   npm run dev                 # http://localhost:5173
   ```

Log in as the admin to see the **Storage nodes** tab. Any new account you
register is a normal user.

## Demo

On **Storage nodes**: take a node offline, or press **Damage a chunk**. Then
go to **My files** and download a file. The download dialog lists every
step the server recorded: offline copies skipped, damaged copies found and
repaired, and the final whole-file hash check.
