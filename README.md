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

Log in as the admin to see the storage controls and the demo panel. Any new
account you register is a normal user.

## Demo

Log in as the admin. On **My files** the storage map shows every chunk copy
in the column of the node that holds it.

- Press **Start the demo** to walk through a node failure and a damaged copy
  step by step. Every download is replayed on the map and written to the
  read log: offline copies skipped, damaged copies found and repaired, and
  the final whole-file hash check.
- Or use **Take offline** and **Damage a chunk** on a node yourself, then
  download a file.

## Phone transfers

Move a file between a phone and the laptop by scanning a QR code.

- **Receive from phone** shows a code. Scan it, choose a photo or file, and
  it is stored like any other upload.
- **Send to phone** (on each file) shows a code that downloads that file.

Each link works once, expires after 5 minutes, and phone uploads are capped
at 20 MB. To try it on a real phone, open DriveX on the laptop using its
network address (for example `http://192.168.1.10:5173`), not `localhost`,
and start the client with `npm run dev -- --host`. Set `CLIENT_ORIGIN` in
`server/.env` and `VITE_API_URL` in `client/.env` to match.

## Storage modes

By default each node is a folder under `server/storage`. Set
`STORAGE_BACKEND=mongo` to keep every chunk copy in MongoDB instead, which
suits hosts without a persistent disk. Set `STORAGE_ROOT` to move the node
folders somewhere else, such as a mounted volume.

## Tests

`server/tests/transfer.test.sh <port>` checks the phone-transfer rules against
a running server. Point that server at a throwaway database, never your real
one: the script creates users and files.
