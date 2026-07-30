use soroban_sdk::{contractevent, Address, BytesN};

#[contractevent(data_format = "single-value")]
#[derive(Clone)]
pub struct AutoshareCreated {
    #[topic]
    pub creator: Address,
    pub id: BytesN<32>,
}

#[contractevent]
#[derive(Clone)]
pub struct ContractPaused {}

#[contractevent]
#[derive(Clone)]
pub struct ContractUnpaused {}

#[contractevent(data_format = "single-value")]
#[derive(Clone)]
pub struct AutoshareUpdated {
    #[topic]
    pub updater: Address,
    pub id: BytesN<32>,
}

#[contractevent(data_format = "single-value")]
#[derive(Clone)]
pub struct GroupDeactivated {
    #[topic]
    pub creator: Address,
    pub id: BytesN<32>,
}

#[contractevent(data_format = "single-value")]
#[derive(Clone)]
pub struct GroupActivated {
    #[topic]
    pub creator: Address,
    pub id: BytesN<32>,
}

#[contractevent(data_format = "single-value")]
#[derive(Clone)]
pub struct AdminTransferred {
    #[topic]
    pub old_admin: Address,
    pub new_admin: Address,
}

#[contractevent(data_format = "single-value")]
#[derive(Clone)]
pub struct Withdrawal {
    #[topic]
    pub token: Address,
    #[topic]
    pub recipient: Address,
    pub amount: i128,
}

/// Emitted when a contributor's reputation score changes.
/// The new score reflects the updated reputation after a submission is accepted.
#[contractevent(data_format = "single-value")]
#[derive(Clone)]
pub struct ContributorReputationUpdated {
    #[topic]
    pub contributor: Address,
    pub new_score: u32,
    pub completed_tasks: u32,
}
