# Backend API

This is the complete backend service for Tetronix (simplified single-service architecture).

## Why Not Separate Services?

Originally had 3 services (Gateway → Seed Service → Database), but for a game this size:
- **Adds latency**: Each extra hop adds 50-100ms
- **More expensive**: 3 services vs 1 on Render.com
- **Complex**: Harder to debug, deploy, and maintain
- **Overkill**: API gateway pattern is for 10+ microservices

**Current architecture (optimized):**
```
Frontend → Backend API → Database
```

This single API handles everything: seed generation, validation, game submission, and leaderboard.

## API Endpoints

### Backend API (Port 3001)

- `POST /api/startGame` - Request a new seed
  - Body: `{ uid: string }`
  - Response: `{ seed: number }`

- `POST /api/submitGame` - Submit a completed game
  - Body: `{ uid, seed, score, difficulty, name, playedSeconds, moves }`
  - Response: `{ ok: boolean }`

- `POST /api/verifySeed` - Verify a seed belongs to user
  - Body: `{ uid, seed }`
  - Response: `{ valid: boolean, reason?: string }`

- `GET /api/leaderboard` - Get top scores
  - Query: `?difficulty=casual&limit=10`
  - Response: Array of score entries

### Why `/api/` prefix?

Makes it easy to distinguish API calls from frontend routes and follows REST conventions.

## Database Schema

### `seeds` table
- `id`: Serial primary key
- `uid`: User ID (anonymous auth)
- `seed`: Generated seed value
- `created_at`: Timestamp
- `used`: Boolean flag
- `used_at`: Timestamp when seed was used

### `games` table
- `id`: Serial primary key
- `uid`: User ID
- `seed`: Game seed (references seeds)
- `name`: Player name
- `difficulty`: Game difficulty
- `score`: Final score
- `played_seconds`: Duration
- `moves`: JSONB array of moves
- `created_at`: Timestamp
- `locale`: User locale

## Development

### Start with Docker:
```bash
docker-compose up
```

### Start standalone:
```bash
# Make sure PostgreSQL is running
cd api
npm install
npm run dev
```

### Run migrations:
```bash
cd api
npm run migrate
```

## Environment Variables

See `.env.example` for required variables.

## Security Features

- Seed-per-game validation prevents replay attacks
- Each seed can only be used once
- Seeds are tied to specific user IDs
- All scores are verified against issued seeds
