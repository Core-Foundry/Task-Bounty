#![cfg(test)]

use super::*;
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Events as _, Ledger},
    token, Address, Env, IntoVal, String,
};
use types::{TaskStatus, SubmissionStatus};

fn create_token_contract<'a>(env: &Env, admin: &Address) -> token::Client<'a> {
    let token_address = env.register_stellar_asset_contract(admin.clone());
    token::Client::new(env, &token_address)
}

fn setup_test() -> (Env, Address, Address, Address, token::Client<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let poster = Address::generate(&env);
    let contributor = Address::generate(&env);
    let token_client = create_token_contract(&env, &admin);

    // Mint tokens to poster
    token::StellarAssetClient::new(&env, &token_client.address).mint(&poster, &10_000_000_000); // 1000 XLM

    // Deploy contract
    let contract_id = env.register_contract(None, TaskBountyContract);
    let client = TaskBountyContractClient::new(&env, &contract_id);

    // Initialize
    let dispute_resolver = Address::generate(&env);
    client.initialize(&dispute_resolver, &admin);

    (env, poster, contributor, admin, token_client, contract_id)
}

#[test]
fn test_create_task() {
    let (env, poster, _, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);

    let title = String::from_str(&env, "Build DEX Interface");
    let description = String::from_str(&env, "Create a React frontend for Stellar DEX");
    let reward = 100_000_000; // 10 XLM
    let deadline = env.ledger().timestamp() + 2_592_000; // 30 days

    let task_id = client.create_task(
        &poster,
        &title,
        &description,
        &token_client.address,
        &reward,
        &deadline,
        &3,
    );

    assert_eq!(task_id, 1);

    let task = client.get_task(&task_id);
    assert_eq!(task.poster, poster);
    assert_eq!(task.title, title);
    assert_eq!(task.reward, reward);
    assert_eq!(task.deadline, deadline);
    assert_eq!(task.max_submissions, 3);
    assert_eq!(task.status, TaskStatus::Open);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")] // InsufficientReward
fn test_create_task_insufficient_reward() {
    let (env, poster, _, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);

    let title = String::from_str(&env, "Task");
    let description = String::from_str(&env, "Description");
    let reward = 100_000; // Too low
    let deadline = env.ledger().timestamp() + 86400;

    client.create_task(
        &poster,
        &title,
        &description,
        &token_client.address,
        &reward,
        &deadline,
        &1,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")] // InvalidDeadline
fn test_create_task_past_deadline() {
    let (env, poster, _, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);

    // Advance the ledger first so "now - 1" can't underflow a fresh env's zero timestamp.
    env.ledger().with_mut(|li| {
        li.timestamp = 100_000;
    });

    let title = String::from_str(&env, "Task");
    let description = String::from_str(&env, "Description");
    let reward = 10_000_000;
    let deadline = env.ledger().timestamp() - 1; // Past

    client.create_task(
        &poster,
        &title,
        &description,
        &token_client.address,
        &reward,
        &deadline,
        &1,
    );
}

#[test]
fn test_submit_work() {
    let (env, poster, contributor, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);

    // Create task
    let task_id = client.create_task(
        &poster,
        &String::from_str(&env, "Task"),
        &String::from_str(&env, "Description"),
        &token_client.address,
        &10_000_000,
        &(env.ledger().timestamp() + 86400),
        &3,
    );

    // Submit work
    let work_url = String::from_str(&env, "ipfs://QmXxxx");
    let description = String::from_str(&env, "Completed work");

    let submission_id = client.submit_work(&task_id, &contributor, &work_url, &description);

    assert_eq!(submission_id, 1);

    let submission = client.get_submission(&submission_id);
    assert_eq!(submission.task_id, task_id);
    assert_eq!(submission.contributor, contributor);
    assert_eq!(submission.work_url, work_url);
    assert_eq!(submission.status, SubmissionStatus::Pending);

    // Check task updated
    let task = client.get_task(&task_id);
    assert_eq!(task.status, TaskStatus::InProgress);
    assert_eq!(task.submission_count, 1);
}

#[test]
#[should_panic(expected = "Error(Contract, #10)")] // AlreadySubmitted
fn test_submit_work_twice() {
    let (env, poster, contributor, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);

    let task_id = client.create_task(
        &poster,
        &String::from_str(&env, "Task"),
        &String::from_str(&env, "Description"),
        &token_client.address,
        &10_000_000,
        &(env.ledger().timestamp() + 86400),
        &3,
    );

    let work_url = String::from_str(&env, "ipfs://QmXxxx");
    let description = String::from_str(&env, "Work");

    client.submit_work(&task_id, &contributor, &work_url, &description);
    client.submit_work(&task_id, &contributor, &work_url, &description); // Should panic
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")] // TaskExpired
fn test_submit_work_expired() {
    let (env, poster, contributor, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);

    let task_id = client.create_task(
        &poster,
        &String::from_str(&env, "Task"),
        &String::from_str(&env, "Description"),
        &token_client.address,
        &10_000_000,
        &(env.ledger().timestamp() + 86400),
        &1,
    );

    // Fast forward past deadline
    env.ledger().with_mut(|li| {
        li.timestamp = li.timestamp + 86401;
    });

    client.submit_work(
        &task_id,
        &contributor,
        &String::from_str(&env, "ipfs://QmXxxx"),
        &String::from_str(&env, "Work"),
    );
}

#[test]
fn test_approve_submission() {
    let (env, poster, contributor, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);

    let reward = 10_000_000;

    // Create task
    let task_id = client.create_task(
        &poster,
        &String::from_str(&env, "Task"),
        &String::from_str(&env, "Description"),
        &token_client.address,
        &reward,
        &(env.ledger().timestamp() + 86400),
        &1,
    );

    // Submit work
    let submission_id = client.submit_work(
        &task_id,
        &contributor,
        &String::from_str(&env, "ipfs://QmXxxx"),
        &String::from_str(&env, "Work"),
    );

    let contributor_balance_before = token_client.balance(&contributor);

    // Approve
    client.approve_submission(&task_id, &submission_id, &poster);

    // Check payment
    let contributor_balance_after = token_client.balance(&contributor);
    assert_eq!(contributor_balance_after, contributor_balance_before + reward);

    // Check statuses
    let task = client.get_task(&task_id);
    assert_eq!(task.status, TaskStatus::Completed);

    let submission = client.get_submission(&submission_id);
    assert_eq!(submission.status, SubmissionStatus::Approved);
}

#[test]
fn test_reject_submission() {
    let (env, poster, contributor, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);

    let task_id = client.create_task(
        &poster,
        &String::from_str(&env, "Task"),
        &String::from_str(&env, "Description"),
        &token_client.address,
        &10_000_000,
        &(env.ledger().timestamp() + 86400),
        &1,
    );

    let submission_id = client.submit_work(
        &task_id,
        &contributor,
        &String::from_str(&env, "ipfs://QmXxxx"),
        &String::from_str(&env, "Work"),
    );

    client.reject_submission(
        &task_id,
        &submission_id,
        &poster,
        &String::from_str(&env, "Incomplete"),
    );

    let submission = client.get_submission(&submission_id);
    assert_eq!(submission.status, SubmissionStatus::Rejected);
}

#[test]
fn test_cancel_task() {
    let (env, poster, _, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);

    let reward = 10_000_000;
    let poster_balance_before = token_client.balance(&poster);

    let task_id = client.create_task(
        &poster,
        &String::from_str(&env, "Task"),
        &String::from_str(&env, "Description"),
        &token_client.address,
        &reward,
        &(env.ledger().timestamp() + 86400),
        &1,
    );

    client.cancel_task(&task_id, &poster);

    // Check refund
    let poster_balance_after = token_client.balance(&poster);
    assert_eq!(poster_balance_after, poster_balance_before);

    // Check status
    let task = client.get_task(&task_id);
    assert_eq!(task.status, TaskStatus::Cancelled);
}

#[test]
fn test_cancel_task_emits_refund_event_with_amount() {
    let (env, poster, _, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);

    let reward = 10_000_000;
    let task_id = client.create_task(
        &poster,
        &String::from_str(&env, "Task"),
        &String::from_str(&env, "Description"),
        &token_client.address,
        &reward,
        &(env.ledger().timestamp() + 86400),
        &1,
    );

    client.cancel_task(&task_id, &poster);

    let events = env.events().all();
    let (_contract, topics, data) = events.last().unwrap();
    assert_eq!(
        topics,
        (symbol_short!("task"), symbol_short!("cancel")).into_val(&env)
    );
    let (event_task_id, event_poster, refunded_amount): (u64, Address, i128) =
        data.into_val(&env);
    assert_eq!(event_task_id, task_id);
    assert_eq!(event_poster, poster);
    assert_eq!(refunded_amount, reward);
}

#[test]
fn test_cancel_task_after_deadline_still_refunds() {
    let (env, poster, _, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);

    let reward = 10_000_000;
    let poster_balance_before = token_client.balance(&poster);

    let task_id = client.create_task(
        &poster,
        &String::from_str(&env, "Task"),
        &String::from_str(&env, "Description"),
        &token_client.address,
        &reward,
        &(env.ledger().timestamp() + 86400),
        &1,
    );

    // Fast forward past the deadline without any approved submission.
    env.ledger().with_mut(|li| {
        li.timestamp += 86_401;
    });

    client.cancel_task(&task_id, &poster);

    let poster_balance_after = token_client.balance(&poster);
    assert_eq!(poster_balance_after, poster_balance_before);

    let task = client.get_task(&task_id);
    assert_eq!(task.status, TaskStatus::Cancelled);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")] // InvalidTaskStatus
fn test_cancel_task_after_approval_fails() {
    let (env, poster, contributor, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);

    let task_id = client.create_task(
        &poster,
        &String::from_str(&env, "Task"),
        &String::from_str(&env, "Description"),
        &token_client.address,
        &10_000_000,
        &(env.ledger().timestamp() + 86400),
        &1,
    );

    let submission_id = client.submit_work(
        &task_id,
        &contributor,
        &String::from_str(&env, "ipfs://QmXxxx"),
        &String::from_str(&env, "Work"),
    );

    client.approve_submission(&task_id, &submission_id, &poster);

    // Reward has already been released to the contributor; the poster can no
    // longer cancel and pull a refund out from under them.
    client.cancel_task(&task_id, &poster);
}

#[test]
fn test_raise_dispute() {
    let (env, poster, contributor, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);

    let task_id = client.create_task(
        &poster,
        &String::from_str(&env, "Task"),
        &String::from_str(&env, "Description"),
        &token_client.address,
        &10_000_000,
        &(env.ledger().timestamp() + 86400),
        &1,
    );

    let submission_id = client.submit_work(
        &task_id,
        &contributor,
        &String::from_str(&env, "ipfs://QmXxxx"),
        &String::from_str(&env, "Work"),
    );

    client.reject_submission(
        &task_id,
        &submission_id,
        &poster,
        &String::from_str(&env, "Incomplete"),
    );

    client.raise_dispute(
        &task_id,
        &submission_id,
        &contributor,
        &String::from_str(&env, "Work is complete"),
    );

    let task = client.get_task(&task_id);
    assert_eq!(task.status, TaskStatus::Disputed);
}

#[test]
fn test_multiple_submissions() {
    let (env, poster, contributor, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);

    let task_id = client.create_task(
        &poster,
        &String::from_str(&env, "Task"),
        &String::from_str(&env, "Description"),
        &token_client.address,
        &10_000_000,
        &(env.ledger().timestamp() + 86400),
        &3,
    );

    let contributor2 = Address::generate(&env);
    let contributor3 = Address::generate(&env);

    let sub1 = client.submit_work(
        &task_id,
        &contributor,
        &String::from_str(&env, "ipfs://1"),
        &String::from_str(&env, "Work 1"),
    );

    let sub2 = client.submit_work(
        &task_id,
        &contributor2,
        &String::from_str(&env, "ipfs://2"),
        &String::from_str(&env, "Work 2"),
    );

    let sub3 = client.submit_work(
        &task_id,
        &contributor3,
        &String::from_str(&env, "ipfs://3"),
        &String::from_str(&env, "Work 3"),
    );

    let submissions = client.get_task_submissions(&task_id);
    assert_eq!(submissions.len(), 3);
    assert_eq!(submissions.get(0).unwrap(), sub1);
    assert_eq!(submissions.get(1).unwrap(), sub2);
    assert_eq!(submissions.get(2).unwrap(), sub3);
}

#[test]
fn test_get_total_tasks() {
    let (env, poster, _, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);

    assert_eq!(client.get_total_tasks(), 0);

    client.create_task(
        &poster,
        &String::from_str(&env, "Task 1"),
        &String::from_str(&env, "Description"),
        &token_client.address,
        &10_000_000,
        &(env.ledger().timestamp() + 86400),
        &1,
    );

    assert_eq!(client.get_total_tasks(), 1);

    client.create_task(
        &poster,
        &String::from_str(&env, "Task 2"),
        &String::from_str(&env, "Description"),
        &token_client.address,
        &10_000_000,
        &(env.ledger().timestamp() + 86400),
        &1,
    );

    assert_eq!(client.get_total_tasks(), 2);
}
