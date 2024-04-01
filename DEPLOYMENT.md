# Deployment Guide

This guide covers deploying the SecureData DApp to production.

## Prerequisites

- Node.js 18+
- Rust and Cargo
- Soroban CLI
- PostgreSQL
- Redis
- Pinata API account
- Groq API key

## Environment Variables

### Backend (.env)

```bash
NODE_ENV=production
PORT=3001
API_PREFIX=api/v1

# Database
DB_HOST=your-db-host
DB_PORT=5432
DB_USERNAME=your-db-user
DB_PASSWORD=your-db-password
DB_DATABASE=securedata

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Stellar Soroban
SOROBAN_NETWORK_URL=https://soroban-testnet.stellar.org
SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
IDENTITY_REGISTRY_CONTRACT_ID=your-contract-id
VERIFICATION_CONTRACT_ID=your-contract-id
ACCESS_CONTROL_CONTRACT_ID=your-contract-id
DATA_SHARING_CONTRACT_ID=your-contract-id

# IPFS / Pinata
PINATA_API_KEY=your-pinata-api-key
PINATA_API_SECRET=your-pinata-api-secret
PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs/

# Groq AI
GROQ_API_KEY=your-groq-api-key

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=your-32-byte-encryption-key
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api/v1
```

## Deploy Smart Contracts

### 1. Build Contracts

```bash
cd contracts
cargo build --release
```

### 2. Deploy to Soroban

```bash
soroban contract deploy ./target/wasm32-unknown-unknown/release/securedata_contracts.wasm \
  --source your-wallet-address \
  --network testnet
```

### 3. Record Contract IDs

Update your backend `.env` file with the deployed contract IDs.

## Deploy Backend

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Build

```bash
npm run build
```

### 3. Run Migrations

```bash
npm run typeorm migration:run
```

### 4. Start Server

```bash
npm run start:prod
```

### Using Docker

```bash
docker build -t securedata-backend .
docker run -p 3001:3001 --env-file .env securedata-backend
```

## Deploy Frontend

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Build

```bash
npm run build
```

### 3. Start Server

```bash
npm start
```

### Using Vercel

```bash
vercel deploy
```

## Deploy Smart Contracts to Mainnet

When ready for mainnet deployment:

1. Change `SOROBAN_NETWORK_URL` to mainnet endpoint
2. Update `SOROBAN_NETWORK_PASSPHRASE` to mainnet passphrase
3. Deploy contracts to mainnet
4. Update contract IDs in environment variables
5. Rebuild and redeploy backend

## Monitoring

### Health Checks

- Backend: `GET /api/v1/health`
- Frontend: Check homepage loads

### Logs

- Backend: Check application logs for errors
- Frontend: Check Vercel logs or server logs

## Security Considerations

1. Never commit `.env` files
2. Use strong secrets for JWT and encryption
3. Enable HTTPS in production
4. Implement rate limiting
5. Use a reverse proxy (nginx) for production
6. Regularly update dependencies
7. Monitor for suspicious activity

## Troubleshooting

### Contract Deployment Fails

- Ensure you have enough XLM in your wallet
- Check network connectivity
- Verify Soroban CLI is properly configured

### Database Connection Issues

- Verify PostgreSQL is running
- Check connection string in `.env`
- Ensure database exists

### IPFS Upload Fails

- Verify Pinata API credentials
- Check API rate limits
- Ensure file size is within limits

## Backup and Recovery

### Database Backup

```bash
pg_dump -U your-user -d securedata > backup.sql
```

### Restore Database

```bash
psql -U your-user -d securedata < backup.sql
```

### Contract State Backup

Contract state is on-chain and automatically backed up by the Stellar network.

## Scaling

### Horizontal Scaling

- Use a load balancer for multiple backend instances
- Implement Redis for session sharing
- Use a managed PostgreSQL service

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database queries
- Implement caching strategies
