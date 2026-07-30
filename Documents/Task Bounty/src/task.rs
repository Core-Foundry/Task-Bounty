use soroban_sdk::{panic_with_error, token, Address, Env, String, Vec};
use crate::types::{Task, TaskStatus, Error};
use crate::storage;
use crate::events;

const MIN_REWARD: i128 = 1_000_000; // 0.1 XLM (7 decimals)
const MAX_DEADLINE: u64 = 31_536_000; // 365 days in seconds

/// Create a new task with escrowed reward
pub fn create_task(
    env: &Env,
    poster: Address,
    title: String,
    description: String,
    token: Address,
    reward: i128,
    deadline: u64,
    max_submissions: u32,
) -> u64 {
    // Validate inputs
    if reward < MIN_REWARD {
        panic_with_error!(env, Error::InsufficientReward);
    }

    let current_time = env.ledger().timestamp();
    if deadline <= current_time {
        panic_with_error!(env, Error::InvalidDeadline);
    }

    if deadline > current_time + MAX_DEADLINE {
        panic_with_error!(env, Error::InvalidDeadline);
    }

    if max_submissions == 0 {
        panic_with_error!(env, Error::InvalidMaxSubmissions);
    }

    if storage::has_duplicate_task(env, &poster, &title, &description) {
        panic_with_error!(env, Error::DuplicateTask);
    }

    // Transfer reward to contract (escrow)
    let contract_address = env.current_contract_address();
    let token_client = token::Client::new(env, &token);
    if token_client.try_transfer(&poster, &contract_address, &reward).is_err() {
        panic_with_error!(env, Error::PaymentFailed);
    }

    // Create task
    let task_id = storage::increment_task_counter(env);
    let task = Task {
        id: task_id,
        poster: poster.clone(),
        title: title.clone(),
        description: description.clone(),
        category: String::from_str(env, "General"),
        tags: Vec::new(env),
        token,
        reward,
        deadline,
        max_submissions,
        submission_count: 0,
        status: TaskStatus::Open,
        created_at: current_time,
    };

    storage::set_task(env, &task);
    storage::set_duplicate_task(env, &poster, &title, &description);

    // Emit event
    events::emit_task_created(env, &task);

    task_id
}

/// Cancel a task and refund the poster
pub fn cancel_task(env: &Env, task_id: u64, poster: Address) {
    // Get task
    if !storage::task_exists(env, task_id) {
        panic_with_error!(env, Error::TaskNotFound);
    }

    let mut task = storage::get_task(env, task_id);

    // Verify poster
    if task.poster != poster {
        panic_with_error!(env, Error::Unauthorized);
    }

    // Check status
    if task.status == TaskStatus::Completed || task.status == TaskStatus::Cancelled {
        panic_with_error!(env, Error::InvalidTaskStatus);
    }

    // Check no approved submissions
    let submissions = storage::get_task_submissions(env, task_id);
    for i in 0..submissions.len() {
        let sub_id = submissions.get(i).unwrap();
        let submission = storage::get_submission(env, sub_id);
        if submission.status == crate::types::SubmissionStatus::Approved {
            panic_with_error!(env, Error::InvalidTaskStatus);
        }
    }

    // Update status
    task.status = TaskStatus::Cancelled;
    storage::set_task(env, &task);

    // Refund poster
    let contract_address = env.current_contract_address();
    let token_client = token::Client::new(env, &task.token);
    if token_client
        .try_transfer(&contract_address, &poster, &task.reward)
        .is_err()
    {
        panic_with_error!(env, Error::PaymentFailed);
    }

    // Emit event
    events::emit_task_cancelled(env, task_id, &poster, task.reward);
}

pub fn update_task_category(env: &Env, task_id: u64, poster: Address, category: String) {
    if !storage::task_exists(env, task_id) {
        panic_with_error!(env, Error::TaskNotFound);
    }

    let mut task = storage::get_task(env, task_id);

    if task.poster != poster {
        panic_with_error!(env, Error::Unauthorized);
    }

    task.category = category;
    storage::set_task(env, &task);
}

pub fn add_task_tag(env: &Env, task_id: u64, poster: Address, tag: String) {
    if !storage::task_exists(env, task_id) {
        panic_with_error!(env, Error::TaskNotFound);
    }

    let mut task = storage::get_task(env, task_id);

    if task.poster != poster {
        panic_with_error!(env, Error::Unauthorized);
    }

    if !task.tags.contains(tag.clone()) {
        task.tags.push_back(tag);
        storage::set_task(env, &task);
    }
}
