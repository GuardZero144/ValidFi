# ValidFi DApp on Stellar Soroban

A decentralized health credential platform built on the Stellar Soroban Smart Contract Platform. ValidFi issues tamper-proof, encrypted health credentials and enables users to prove vaccination status with zero-knowledge proofs — no names, no birthdates, and no medical history exposed to anyone but you.

## 🌟 Features

### Core Capabilities
- **Tamper-Proof Health Credentials**: Encrypted vaccination records stored on-chain with cryptographic verification
- **Privacy-Preserving zk Proofs**: Prove vaccination status without revealing names, birthdates, or medical history
- **Zero-Knowledge Vaccination Verification**: Share proof of vaccination without exposing any personal health information
- **Wallet-Based Authentication**: Secure authentication using Stellar wallets (Freighter, Albedo, LOBSTR)
- **Encrypted Health Data Storage**: Medical credentials encrypted and stored on IPFS with Pinata integration
- **User-Controlled Access**: Complete control over who can verify your health credentials
- **Instant Credential Verification**: Share vaccination proof with venues, employers, or travel authorities securely
- **Immutable Health Records**: All credential issuances and verifications recorded on-chain for auditability

### Advanced Features
- **Selective Disclosure**: Choose exactly what information to reveal in each verification
- **Time-Limited Proofs**: Set expiration dates for vaccination status proofs
- **Revocable Credentials**: Revoke access to your health credentials at any time
- **Multi-Vaccine Support**: Support for multiple vaccination types and boosters
- **Batch Verification**: Verify multiple credentials simultaneously for venues and organizations
- **Health Authority Integration**: Integration with certified health authorities for credential issuance
- **Cross-Border Recognition**: Standardized format for international travel and compliance
- **Robust Contract Upgrades**: Secure upgrade mechanism with timelock, proxy pattern, and state consistency validation

## 🏗️ Architecture

### On-Chain Components (Soroban Smart Contracts)

#### Health Credential Registry Contract
- Manages vaccination credentials and health records
- Stores encrypted credential metadata and verification status
- Links wallet addresses to health credential records
- Enables credential lookup and verification

#### Vaccination Verification Contract
- Handles vaccination status verification requests
- Validates zero-knowledge proofs for vaccination status
- Stores verification results on-chain
- Manages credential status updates and revocations

#### Access Control Contract
- Manages permissions for health credential access
- Controls who can verify vaccination status
- Implements time-based access controls for proofs
- Handles credential access revocation

#### Health Authority Contract
- Manages authorized health authority issuers
- Validates credential issuance from certified authorities
- Stores authority Ed25519 public keys and active/suspended status
- Verifies authority signatures against the registered key

#### Upgrade Mechanism
- **Proxy Pattern**: Seamless contract upgrades without data loss
- **Timelock Security**: 24-hour delay between scheduling and executing upgrades
- **Migration Registry**: Tracks all migrations with version, timestamp, and success status
- **State Consistency**: Validates storage integrity before upgrades
- **Access Control**: Admin-only upgrade functions with dual authorization for admin transfer
- **Emergency Pause**: Ability to temporarily disable upgrades for critical situations
- **Version Tracking**: Comprehensive version management with rollback prevention

### Off-Chain Components

#### Backend (NestJS)
- RESTful API for health credential management
- Business logic for vaccination verification and credential sharing
- Integration with external services (IPFS, AI, Soroban)
- Authentication and authorization middleware
- Database management with PostgreSQL
- Caching with Redis

#### Frontend (Next.js 15)
- Modern, responsive health credential interface
- Wallet connection and management
- Health credential vault for vaccination records
- Verification center for tracking vaccination status
- Secure proof sharing interface
- Real-time updates and notifications

#### Storage Layer (IPFS)
- Decentralized health credential storage
- Pinata gateway for reliable access
- Content-addressed storage
- Automatic deduplication
- Encrypted medical data storage

#### AI Layer (Groq)
- Health credential document analysis
- Vaccination record verification
- Fraud detection for health credentials
- Automated compliance checks

#### Zero-Knowledge Infrastructure
- Circom for vaccination proof circuits
- SnarkJS for proof generation
- Groth16 proving system
- Privacy-preserving vaccination verification

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15.1.0
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: Shadcn UI, Radix UI
- **Animations**: Framer Motion
- **Forms**: React Hook Form, Zod
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Wallet Integration**: @stellar/freighter-api

### Backend
- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM
- **Caching**: Redis
- **Authentication**: JWT, Passport
- **Validation**: class-validator, class-transformer
- **Blockchain**: Soroban SDK
- **Storage**: IPFS, Pinata SDK
- **AI**: Groq SDK

### Smart Contracts
- **Language**: Rust
- **Platform**: Stellar Soroban
- **Build Tool**: Cargo
- **Testing**: Soroban SDK
- **Performance**: Budget/gas, execution-time and load benchmarks for the
  credential contract — see [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md). Run with
  `cargo test --features testutils benchmarks -- --nocapture`.

### DevOps
- **Version Control**: Git
- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Deployment**: Vercel (frontend), Docker (backend)

## 📁 Project Structure

```
GuardZero/
├── contracts/                 # Soroban smart contracts (Rust)
│   ├── src/                  # Contract source code
│   └── Cargo.toml           # Rust dependencies
├── backend/                   # NestJS backend
│   ├── src/
│   │   ├── auth/            # Authentication module
│   │   ├── data-sharing/    # Credential sharing module
│   │   ├── health-credential/ # Health credential module
│   │   ├── ipfs/            # IPFS integration
│   │   ├── ai/              # AI service for health verification
│   │   ├── soroban/         # Soroban integration
│   │   └── verification/    # Vaccination verification module
│   ├── .env.example         # Environment variables template
│   └── package.json         # Backend dependencies
├── frontend/                  # Next.js 15 frontend
│   ├── src/
│   │   ├── app/            # Next.js app directory
│   │   └── components/     # React components
│   ├── public/              # Static assets
│   ├── .env.local          # Frontend environment variables
│   └── package.json        # Frontend dependencies
├── zk/                       # Zero-Knowledge proof infrastructure
│   └── README.md           # ZK proof documentation
├── scripts/                   # Deployment and utility scripts
│   ├── deploy-contracts.sh  # Smart contract deployment
│   └── deploy-backend.sh    # Backend deployment
├── .gitignore               # Git ignore rules
├── DEPLOYMENT.md            # Deployment guide
└── README.md                # This file
```

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 18.0 or higher
- **Rust**: 1.70 or higher
- **Cargo**: Latest version
- **Soroban CLI**: Latest version
- **PostgreSQL**: 14 or higher
- **Redis**: 7 or higher
- **Git**: Latest version

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/GuardZero144/SureData.git
cd GuardZero
```

#### 2. Install Smart Contract Dependencies

```bash
cd contracts
cargo build --release
```

#### 3. Setup Backend

```bash
cd ../backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run start:dev
```

#### 4. Setup Frontend

```bash
cd ../frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with your configuration
npm run dev
```

### Environment Variables

#### Backend (.env)

```bash
NODE_ENV=development
PORT=3001
API_PREFIX=api/v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=securedata

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Stellar Soroban
SOROBAN_NETWORK_URL=https://soroban-testnet.stellar.org
SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
IDENTITY_REGISTRY_CONTRACT_ID=your_contract_id
VERIFICATION_CONTRACT_ID=your_contract_id
ACCESS_CONTROL_CONTRACT_ID=your_contract_id
DATA_SHARING_CONTRACT_ID=your_contract_id

# IPFS / Pinata
PINATA_API_KEY=your_pinata_api_key
PINATA_API_SECRET=your_pinata_api_secret
PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs/

# Groq AI
GROQ_API_KEY=your_groq_api_key

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=your_32_byte_encryption_key
```

#### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## 📖 Usage Guide

### Connecting Your Wallet

1. Install a Stellar wallet (Freighter, Albedo, or LOBSTR)
2. Click "Connect Wallet" on the homepage
3. Approve the connection request in your wallet
4. Your wallet address will be displayed

### Managing Health Credentials

1. Navigate to the "Health Credential Vault" tab
2. Click "Upload Credential" to add vaccination records
3. The credential will be encrypted and uploaded to IPFS
4. The hash will be registered on-chain
5. Track verification status in the "Verification Center"

### Proving Vaccination Status

1. Navigate to the "Vaccination Proof" tab
2. Select the vaccination credential you want to prove
3. Choose what information to disclose (optional)
4. Generate a zero-knowledge proof of vaccination status
5. Share the proof with venues, employers, or travel authorities
6. No personal health information is revealed

### Sharing Credentials

1. Navigate to the "Secure Sharing" tab
2. Enter the recipient's wallet address (venue, employer, etc.)
3. Select the vaccination credential you want to share
4. Set the access duration
5. Click "Share Credential"
6. The recipient will receive access for the specified duration

## � Contract Upgrade Mechanism

### Overview

The ValidFi smart contracts include a robust upgrade mechanism that allows for secure, controlled contract upgrades without data loss. The system uses a proxy pattern with timelock security, state consistency validation, and comprehensive migration tracking.

### Upgrade Process

#### 1. Initialize Upgrade Mechanism

```bash
# Call initialize_upgrade with admin address and initial implementation hash
identity_registry.initialize_upgrade(admin_address, initial_wasm_hash)
```

#### 2. Schedule Upgrade

```bash
# Schedule an upgrade with a 24-hour timelock
identity_registry.schedule_upgrade(
    admin_address,
    new_wasm_hash,
    proposed_version
)
```

#### 3. Wait for Timelock

The timelock period (24 hours) must expire before the upgrade can be executed. This provides time for community review and emergency cancellation if needed.

#### 4. Execute Upgrade

```bash
# After timelock expires, execute the upgrade
identity_registry.execute_upgrade(admin_address)
```

#### 5. Run Data Migration (if needed)

```bash
# Execute data migrations for the new version
identity_registry.migrate_v1_to_v2(admin_address)
```

### Security Features

- **Timelock Protection**: 24-hour delay prevents rushed upgrades
- **Admin Authorization**: Only designated admin can schedule/execute upgrades
- **State Validation**: System checks storage integrity before upgrade
- **Migration Tracking**: All migrations recorded with version and timestamp
- **Emergency Pause**: Admin can pause upgrades during critical situations
- **Dual Authorization**: Admin transfer requires both current and new admin signatures

### Monitoring Upgrades

```bash
# Check current version
identity_registry.get_version()

# Check pending upgrade
identity_registry.get_pending_upgrade()

# Check timelock end time
identity_registry.get_timelock_end()

# Check migration status
identity_registry.is_migration_executed(version)

# Get migration record
identity_registry.get_migration_record(version)
```

### Emergency Procedures

#### Cancel Pending Upgrade

```bash
identity_registry.cancel_upgrade(admin_address)
```

#### Emergency Pause Upgrades

```bash
identity_registry.emergency_pause_upgrades(admin_address)
```

#### Unpause Upgrades

```bash
identity_registry.unpause_upgrades(admin_address)
```

### Legacy Upgrade Method

For backward compatibility, a legacy upgrade method is available:

```bash
# Direct upgrade without timelock (not recommended for production)
identity_registry.upgrade(admin_address, new_wasm_hash)
```

## � API Documentation

### Authentication Endpoints

#### POST /api/v1/auth/login
Login with wallet signature

#### POST /api/v1/auth/verify
Verify wallet signature

#### GET /api/v1/auth/profile
Get user profile (requires authentication)

### Health Credential Endpoints

#### POST /api/v1/health-credential
Create new health credential

#### GET /api/v1/health-credential/:id
Get health credential by ID

#### PUT /api/v1/health-credential/:id
Update health credential

#### DELETE /api/v1/health-credential/:id
Delete health credential

#### GET /api/v1/health-credential
List all health credentials for user

### Vaccination Verification Endpoints

#### POST /api/v1/verification/vaccination
Submit vaccination credential for verification

#### GET /api/v1/verification/vaccination/:id
Get vaccination verification status

#### POST /api/v1/verification/vaccination/proof
Generate zero-knowledge proof of vaccination status

#### GET /api/v1/verification/vaccination
List all vaccination verifications

### Credential Sharing Endpoints

#### POST /api/v1/credential-sharing
Share health credential with another user

#### GET /api/v1/credential-sharing/:id
Get sharing details

#### PUT /api/v1/credential-sharing/:id/revoke
Revoke shared access

#### PUT /api/v1/credential-sharing/:id/extend
Extend sharing duration

## 🧪 Testing

### Run Smart Contract Tests

```bash
cd contracts
cargo test
```

### Run Backend Tests

```bash
cd backend
npm run test
```

### Run Frontend Tests

```bash
cd frontend
npm run test
```

## 🚢 Deployment

### Deploy Smart Contracts

```bash
./scripts/deploy-contracts.sh testnet GYOUR_WALLET_ADDRESS
```

### Deploy Backend

```bash
./scripts/deploy-backend.sh production
```

### Deploy Frontend

The frontend can be deployed to Vercel:

```bash
cd frontend
vercel deploy
```

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## 🔒 Security Considerations

- **Never commit `.env` files** to version control
- **Use strong secrets** for JWT and encryption keys
- **Enable HTTPS** in production environments
- **Implement rate limiting** on API endpoints
- **Use a reverse proxy** (nginx) for production
- **Regularly update dependencies** to patch vulnerabilities
- **Monitor for suspicious activity** and implement alerts
- **Encrypt all sensitive data** before storage
- **Use hardware wallets** for production accounts

## 🤝 Contributing

We welcome contributions to SecureData! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting
- Use meaningful commit messages

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

- **GitHub Issues**: https://github.com/GuardZero144/SureData/issues
- **Documentation**: https://github.com/GuardZero144/SureData/wiki
- **Discord**: [Join our Discord server]

## 🙏 Acknowledgments

- Stellar Development Foundation for Soroban
- Groq for AI services
- Pinata for IPFS hosting
- The open-source community

## 🗺️ Roadmap

### Phase 1 (Completed)
- ✅ Smart contract development
- ✅ Backend API implementation
- ✅ Frontend UI development
- ✅ Basic wallet integration
- ✅ IPFS integration
- ✅ AI-powered verification
- ✅ Robust contract upgrade mechanism

### Phase 2 (In Progress)
- 🔄 Health credential-specific zk-proof circuits
- 🔄 Vaccination verification workflows
- 🔄 Health authority integration
- 🔄 Cross-border compliance features

### Phase 3 (Planned)
- 📋 Mobile app for health credentials
- 📋 Multi-vaccine support
- 📋 Travel verification integration
- 📋 Enterprise health credential management

---

**Built with ❤️ for the decentralized future**
