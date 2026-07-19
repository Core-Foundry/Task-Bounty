#  TASKBOUNTY: Decentralized Task & Reward Board on Stellar 
A trustless, decentralized platform for posting tasks, submitting work, and managing bounty payments on the Stellar blockchain using Soroban smart contracts.

🎯 Problem
Traditional bounty systems require trust in centralized platforms or intermediaries. Contributors risk not getting paid, and task posters have no guarantee of quality work. There's no transparent, trustless way to manage task-based payments.

✨ Solution
TaskBounty provides a Soroban smart contract system that:

Escrows funds when tasks are posted (using Stellar native assets or tokens)
Enables transparent submission of work with IPFS/Arweave links
Automates payouts upon approval
Handles disputes through a decentralized arbitrator mechanism
Aligns with Drips for direct contributor funding
Low fees thanks to Stellar's efficient network
Fast finality with 3-5 second confirmation times
🌟 Why Stellar?
Low Transaction Costs: Fractions of a cent per transaction
Fast Finality: 3-5 second confirmation times
Built-in DEX: Native token support and atomic swaps
Soroban: Modern Rust-based smart contracts with WebAssembly
Scalability: Thousands of transactions per second
Developer Friendly: Excellent tooling and documentation
🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                          │
│   Task Board  │  Create Task  │  Submit Work  │  Wallet Connect     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  Stellar Wallets Kit (RPC calls)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Stellar Network (Soroban RPC)                    │
└──────────┬──────────────────────────────────┬───────────────────────┘
           │                                  │
           ▼                                  ▼
┌──────────────────────┐          ┌───────────────────────┐
│   TaskBounty         │  calls   │   DisputeResolver     │
│   Contract           │ ───────► │   Contract            │
│                      │          │                       │
│  • create_task       │          │  • raise_dispute      │
│  • submit_work       │          │  • resolve_dispute    │
│  • approve_submission│          │  • manage_arbitrators │
│  • reject_submission │          └───────────────────────┘
│  • cancel_task       │
│  • get_task          │
│  • get_submission    │
└──────────────────────┘
           │
           │  token transfers via SAC interface
           ▼
┌──────────────────────┐
│  Token Contract      │
│  (XLM / SAC token)   │
│  Escrowed rewards    │
└──────────────────────┘
```

### Task Lifecycle

```
                        ┌─────────┐
                        │  OPEN   │ ◄── create_task() — reward escrowed
                        └────┬────┘
                             │ submit_work()
                             ▼
                      ┌────────────┐
                      │ IN PROGRESS│
                      └─────┬──────┘
              ┌─────────────┤
              │             │
              ▼             ▼
        ┌──────────┐  ┌──────────┐
        │ APPROVED │  │ REJECTED │
        │ (payout) │  │ (re-open)│
        └──────────┘  └──────────┘
              │
              │ raise_dispute()
              ▼
        ┌──────────┐
        │ DISPUTED │ ──► DisputeResolver ──► COMPLETED or refund
        └──────────┘

       poster cancels anytime before approval
              │
              ▼
        ┌──────────┐
        │CANCELLED │ (reward refunded to poster)
        └──────────┘
```

### Task Creation & Payout Flow

```
Poster                  Contract              Token (SAC)
  │                        │                      │
  │── create_task() ──────►│                      │
  │                        │── transfer_from() ──►│  escrow reward
  │◄── task_id ────────────│                      │
  │                        │                      │
Contributor               │                      │
  │── submit_work() ──────►│                      │
  │◄── submission_id ──────│                      │
  │                        │                      │
Poster                    │                      │
  │── approve_submission()►│                      │
  │                        │── transfer() ───────►│  pay contributor
  │                        │   emit Approved      │
  │◄── tx confirmed ───────│                      │
```

### Dispute Resolution Flow

```
Contributor           TaskBounty           DisputeResolver      Arbitrator
     │                    │                      │                   │
     │── raise_dispute() ►│                      │                   │
     │                    │── forward dispute ──►│                   │
     │                    │                      │◄── resolve() ─────│
     │                    │                      │    (true/false)   │
     │                    │◄── resolution ────────│                   │
     │                    │                      │                   │
     │                    │  if true: pay contrib │                   │
     │                    │  if false: refund poster                  │
```

### Repository Structure

```
Task-Bounty/
├── contract/
│   └── contracts/
│       └── hello-world/        # Soroban contract
│           └── src/
│               ├── lib.rs      # Contract entry points & public API
│               ├── types.rs    # Task, Submission, Dispute, Error types
│               ├── storage.rs  # Storage key helpers
│               ├── task.rs     # Task creation & cancellation
│               ├── submission.rs  # Submit, approve, reject
│               ├── dispute.rs  # Dispute handling
│               └── events.rs   # Event emission helpers
├── frontend/                   # Next.js frontend
│   └── src/
│       ├── app/                # Next.js app router pages
│       ├── components/         # Shared UI components
│       ├── hooks/              # Stellar wallet integration
│       └── lib/                # Stellar RPC utilities
├── CONTRIBUTING.md
├── SETUP.md
├── TROUBLESHOOTING.md
├── CONTRACT_API.md
└── README.md
```
Key Features
Task Posting: Create tasks with escrowed rewards (XLM or any Stellar token)
Work Submission: Contributors submit IPFS/Arweave links to their work
Approval System: Task posters review and approve/reject
Auto Payout: Approved work triggers instant payment via Stellar
Dispute Resolution: Decentralized arbitration for conflicts
Multi-submission Support: Multiple contributors can compete
Deadline Management: Time-based task expiration
Token Flexibility: Support for XLM and any Stellar Asset Contract (SAC) token
🚀 Quick Start
Prerequisites
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add wasm32 target
rustup target add wasm32-unknown-unknown

# Install Stellar CLI
cargo install --locked stellar-cli --features opt
Installation
# Clone repository
git clone <your-repo>
cd task-bounty

# Build contracts
stellar contract build
Build
# Build all contracts
stellar contract build

# Build optimized
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/task_bounty.wasm
Test
# Run all tests
cargo test

# Run with output
cargo test -- --nocapture

# Run specific test
cargo test test_create_task
Deploy
# Deploy to Testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/task_bounty.wasm \
  --source <YOUR_SECRET_KEY> \
  --network testnet

# Deploy to Mainnet (after audit!)
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/task_bounty.wasm \
  --source <YOUR_SECRET_KEY> \
  --network mainnet
📖 Usage
Creating a Task
// Initialize contract
let contract_id = Address::from_string(&String::from_str(&env, "CONTRACT_ID"));
let client = TaskBountyClient::new(&env, &contract_id);

// Create task with 100 XLM reward
client.create_task(
    &poster,
    &String::from_str(&env, "Build a DEX interface"),
    &String::from_str(&env, "Create a React frontend for Stellar DEX"),
    &token_address,  // XLM or token address
    &1_000_000_000,  // 100 XLM (7 decimals)
    &(env.ledger().timestamp() + 2_592_000), // 30 days
    &3  // max submissions
);
Submitting Work
// Submit work with IPFS link
client.submit_work(
    &task_id,
    &contributor,
    &String::from_str(&env, "ipfs://QmXxxx..."),
    &String::from_str(&env, "Completed DEX interface with all features")
);
Approving Submissions
// Approve and automatically pay contributor
client.approve_submission(&task_id, &submission_id, &poster);
Handling Disputes
// Raise a dispute
client.raise_dispute(
    &task_id,
    &submission_id,
    &contributor,
    &String::from_str(&env, "Work meets all requirements")
);

// Resolve dispute (arbitrator)
dispute_client.resolve_dispute(&dispute_id, &arbitrator, &true); // true = favor contributor
🔧 How to Extend
Add Reputation System
// Track contributor reputation
pub fn update_reputation(env: &Env, contributor: Address, positive: bool) {
    let mut rep = get_reputation(env, &contributor);
    if positive {
        rep += 1;
    } else if rep > 0 {
        rep -= 1;
    }
    set_reputation(env, &contributor, rep);
}
Add Milestone-Based Tasks
#[contracttype]
pub struct Milestone {
    pub description: String,
    pub reward: i128,
    pub completed: bool,
}

pub fn create_milestone_task(
    env: Env,
    milestones: Vec<Milestone>
) -> u64 {
    // Implementation
}
Add Multi-Token Support
Already built-in! TaskBounty supports:

XLM (Stellar's native token)
Any Stellar Asset Contract (SAC) token
Custom tokens deployed on Stellar
Integration with Drips Protocol
// Stream rewards over time
pub fn stream_reward(
    env: &Env,
    contributor: Address,
    amount: i128,
    duration: u64
) {
    // Configure streaming payment via Drips
    // Integration with Drips protocol on Stellar
}
🧪 Testing
Tests cover:

✅ Task creation and escrow
✅ Work submission
✅ Approval and rejection flows
✅ Automatic payouts
✅ Dispute creation and resolution
✅ Edge cases (expired tasks, double submissions, etc.)
✅ Access control
✅ Token transfers
Run tests:

cargo test
cargo test -- --nocapture  # With output
🔒 Security Considerations
Authorization: Uses Soroban's built-in require_auth() for access control
Fund Safety: Escrow pattern with contract-held funds
Deadline Enforcement: Timestamp-based validations
Input Validation: Comprehensive checks on all parameters
Atomic Operations: Stellar's transaction atomicity guarantees
No Reentrancy: Soroban's execution model prevents reentrancy attacks
HTTP Security Headers: The Next.js frontend applies CSP, HSTS, and related headers on all responses — see SECURITY_HEADERS.md
📊 Gas Optimization (Fee Efficiency)
Stellar advantages:

Fixed low fees: ~0.00001 XLM per operation
Predictable costs: No gas price auctions
Efficient execution: WebAssembly-based contracts
Optimized storage: Compact data structures
Typical costs:

Create Task: ~0.0001 XLM
Submit Work: ~0.00005 XLM
Approve Submission: ~0.0001 XLM
Total workflow: < $0.001 USD
Compare to Ethereum:

Ethereum: $5-50 per transaction
Stellar: $0.0001 per transaction
50,000x cheaper!
🛣️ Roadmap
 Core task management
 Work submission and approval
 Dispute resolution
 Multi-token support
 Reputation system
 Milestone-based tasks
 Frontend dApp
 Drips Protocol integration
 Mobile app
 DAO governance
🌐 Network Information
Testnet
Network Passphrase: Test SDF Network ; September 2015
Horizon URL: https://horizon-testnet.stellar.org
Friendbot: https://friendbot.stellar.org (get test XLM)
Mainnet
Network Passphrase: Public Global Stellar Network ; September 2015
Horizon URL: https://horizon.stellar.org
📚 Resources
Stellar Documentation
Soroban Documentation
Stellar CLI
Rust Book
📄 License
MIT

🤝 Contributing
Contributions welcome! Please read CONTRIBUTING.md first.

📞 Contact
GitHub: [Your GitHub]
Discord: Stellar Discord
Twitter: [Your Twitter]
Built with ❤️ on Stellar
