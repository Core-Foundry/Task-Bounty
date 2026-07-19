#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, Address, Env, String,
};
use types::{TaskStatus, SubmissionStatus};

fn create_token_contract<'a>(env: &Env, admin: &Address) -> token::StellarAssetClient<'a> {
    let token_contract = env.register_stellar_asset_contract_v2(admin.clone());
    token::StellarAssetClient::new(env, &token_contract.address())
}

fn setup_test() -> (Env, Address, Address, Address, token::TokenClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let poster = Address::generate(&env);
    let contributor = Address::generate(&env);
    let token_admin_client = create_token_contract(&env, &admin);
    let token_client = token::TokenClient::new(&env, &token_admin_client.address);

    // Mint tokens to poster
    token_admin_client.mint(&poster, &10_000_000_000); // 1000 XLM

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
        &token_client.address(),
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
#[should_panic(expected = "Error(Contract, #7)")]
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
#[should_panic(expected = "Error(Contract, #8)")]
fn test_create_task_past_deadline() {
    let (env, poster, _, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);

    env.ledger().with_mut(|li| {
        li.timestamp = 1_000;
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
#[should_panic(expected = "Error(Contract, #9)")]
fn test_create_task_invalid_max_submissions() {
    let (env, poster, _, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);

    let title = String::from_str(&env, "Task");
    let description = String::from_str(&env, "Description");
    let reward = 10_000_000;
    let deadline = env.ledger().timestamp() + 86400;

    client.create_task(
        &poster,
        &title,
        &description,
        &token_client.address,
        &reward,
        &deadline,
        &0,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_create_task_deadline_too_far() {
    let (env, poster, _, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);

    let title = String::from_str(&env, "Task");
    let description = String::from_str(&env, "Description");
    let reward = 10_000_000;
    let deadline = env.ledger().timestamp() + 31_536_001; // > 365 days

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
#[should_panic(expected = "Error(Contract, #14)")]
fn test_create_duplicate_task() {
    let (env, poster, _, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);

    let title = String::from_str(&env, "Duplicate Task");
    let description = String::from_str(&env, "Duplicate description");
    let reward = 10_000_000;
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
fn test_same_task_allowed_for_different_poster() {
    let (env, poster, _, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);
    let other_poster = Address::generate(&env);

    let title = String::from_str(&env, "Shared Task");
    let description = String::from_str(&env, "Same details, different poster");
    let reward = 10_000_000;
    let deadline = env.ledger().timestamp() + 86400;

    let first_task_id = client.create_task(
        &poster,
        &title,
        &description,
        &token_client.address,
        &reward,
        &deadline,
        &1,
    );

    let second_task_id = client.create_task(
        &other_poster,
        &title,
        &description,
        &token_client.address,
        &reward,
        &deadline,
        &1,
    );

    assert_eq!(first_task_id, 1);
    assert_eq!(second_task_id, 2);
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
#[should_panic(expected = "Error(Contract, #10)")]
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
#[should_panic(expected = "Error(Contract, #4)")]
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
fn test_full_bounty_workflow_from_creation_to_reward_claim() {
    let (env, poster, contributor, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);

    let reward = 10_000_000;
    let poster_balance_before = token_client.balance(&poster);
    let contributor_balance_before = token_client.balance(&contributor);
    let contract_balance_before = token_client.balance(&contract_id);

    let task_id = client.create_task(
        &poster,
        &String::from_str(&env, "Build onboarding flow"),
        &String::from_str(&env, "Implement the first-time user experience"),
        &token_client.address(),
        &reward,
        &(env.ledger().timestamp() + 86_400),
        &2,
    );

    let submission_id = client.submit_work(
        &task_id,
        &contributor,
        &String::from_str(&env, "ipfs://onboarding"),
        &String::from_str(&env, "Completed the guided onboarding experience"),
    );

    let task_in_progress = client.get_task(&task_id);
    assert_eq!(task_in_progress.status, TaskStatus::InProgress);
    assert_eq!(task_in_progress.submission_count, 1);

    client.approve_submission(&task_id, &submission_id, &poster);

    let poster_balance_after = token_client.balance(&poster);
    let contributor_balance_after = token_client.balance(&contributor);
    let contract_balance_after = token_client.balance(&contract_id);

    assert_eq!(poster_balance_after, poster_balance_before - reward);
    assert_eq!(contributor_balance_after, contributor_balance_before + reward);
    assert_eq!(contract_balance_after, contract_balance_before);

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

#[test]
fn test_task_search_and_filtering() {
    let (env, poster, contributor, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);

    let base_deadline = env.ledger().timestamp();

    let first_id = client.create_task(
        &poster,
        &String::from_str(&env, "Write docs"),
        &String::from_str(&env, "Document the API surface"),
        &token_client.address(),
        &10_000_000,
        &(base_deadline + 3_600),
        &2,
    );

    let second_id = client.create_task(
        &poster,
        &String::from_str(&env, "Build dashboard"),
        &String::from_str(&env, "Filter tasks by status and reward"),
        &token_client.address(),
        &50_000_000,
        &(base_deadline + 7_200),
        &2,
    );

    let third_id = client.create_task(
        &poster,
        &String::from_str(&env, "Fix payout"),
        &String::from_str(&env, "Verify deadline handling"),
        &token_client.address,
        &50_000_000,
        &(base_deadline + 3_900),
        &2,
    );

    let submission_id = client.submit_work(
        &second_id,
        &contributor,
        &String::from_str(&env, "ipfs://dashboard"),
        &String::from_str(&env, "First pass implementation"),
    );

    assert_eq!(client.get_all_tasks().len(), 3);

    let open_tasks = client.get_tasks_by_status(&TaskStatus::Open);
    assert_eq!(open_tasks.len(), 2);
    assert_eq!(open_tasks.get(0).unwrap().id, first_id);
    assert_eq!(open_tasks.get(1).unwrap().id, third_id);

    let in_progress = client.get_tasks_by_status(&TaskStatus::InProgress);
    assert_eq!(in_progress.len(), 1);
    assert_eq!(in_progress.get(0).unwrap().id, second_id);

    let reward_matches = client.get_tasks_by_reward(&50_000_000);
    assert_eq!(reward_matches.len(), 2);
    assert_eq!(reward_matches.get(0).unwrap().id, second_id);
    assert_eq!(reward_matches.get(1).unwrap().id, third_id);

    let min_reward = client.get_tasks_by_min_reward(&50_000_000);
    assert_eq!(min_reward.len(), 2);

    let deadline_matches = client.get_tasks_before_deadline(&(base_deadline + 4_000));
    assert_eq!(deadline_matches.len(), 2);
    assert_eq!(deadline_matches.get(0).unwrap().id, first_id);
    assert_eq!(deadline_matches.get(1).unwrap().id, third_id);

    let title_search = client.search_tasks(&String::from_str(&env, "dashboard"));
    assert_eq!(title_search.len(), 1);
    assert_eq!(title_search.get(0).unwrap().id, second_id);

    let description_search = client.search_tasks(&String::from_str(&env, "deadline handling"));
    assert_eq!(description_search.len(), 1);
    assert_eq!(description_search.get(0).unwrap().id, third_id);

    let _ = submission_id;
}

#[test]
fn test_task_categories_and_tags() {
    let (env, poster, _, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);

    let task1 = client.create_task(
        &poster,
        &String::from_str(&env, "Build landing page"),
        &String::from_str(&env, "Create a polished marketing site"),
        &token_client.address,
        &10_000_000,
        &(env.ledger().timestamp() + 86_400),
        &1,
    );

    let task2 = client.create_task(
        &poster,
        &String::from_str(&env, "Write docs"),
        &String::from_str(&env, "Document the API and workflow"),
        &token_client.address,
        &10_000_000,
        &(env.ledger().timestamp() + 86_400),
        &1,
    );

    let task3 = client.create_task(
        &poster,
        &String::from_str(&env, "Fix UI spacing"),
        &String::from_str(&env, "Adjust layout and typography"),
        &token_client.address,
        &10_000_000,
        &(env.ledger().timestamp() + 86_400),
        &1,
    );

    client.update_task_category(&task1, &poster, &String::from_str(&env, "Design"));
    client.update_task_category(&task2, &poster, &String::from_str(&env, "Writing"));
    client.update_task_category(&task3, &poster, &String::from_str(&env, "Design"));

    client.add_task_tag(&task1, &poster, &String::from_str(&env, "frontend"));
    client.add_task_tag(&task1, &poster, &String::from_str(&env, "ui"));
    client.add_task_tag(&task2, &poster, &String::from_str(&env, "docs"));
    client.add_task_tag(&task3, &poster, &String::from_str(&env, "frontend"));
    client.add_task_tag(&task3, &poster, &String::from_str(&env, "bugfix"));

    let design_tasks = client.get_tasks_by_category(&String::from_str(&env, "Design"));
    assert_eq!(design_tasks.len(), 2);
    assert_eq!(design_tasks.get(0).unwrap().id, task1);
    assert_eq!(design_tasks.get(1).unwrap().id, task3);

    let writing_tasks = client.get_tasks_by_category(&String::from_str(&env, "Writing"));
    assert_eq!(writing_tasks.len(), 1);
    assert_eq!(writing_tasks.get(0).unwrap().id, task2);

    let frontend_tasks = client.get_tasks_by_tag(&String::from_str(&env, "frontend"));
    assert_eq!(frontend_tasks.len(), 2);
    assert_eq!(frontend_tasks.get(0).unwrap().id, task1);
    assert_eq!(frontend_tasks.get(1).unwrap().id, task3);

    let docs_tasks = client.get_tasks_by_tag(&String::from_str(&env, "docs"));
    assert_eq!(docs_tasks.len(), 1);
    assert_eq!(docs_tasks.get(0).unwrap().id, task2);

    let task = client.get_task(&task1);
    assert_eq!(task.category, String::from_str(&env, "Design"));
    assert!(task.tags.contains(String::from_str(&env, "frontend")));
    assert!(task.tags.contains(String::from_str(&env, "ui")));
}

#[test]
fn test_e2e_multiple_contributors_flow() {
    let (env, poster, contributor_a, _, token_client, contract_id) = setup_test();
    let client = TaskBountyContractClient::new(&env, &contract_id);
    let contributor_b = Address::generate(&env);

    let reward = 15_000_000;
    let poster_balance_before = token_client.balance(&poster);
    let contributor_b_balance_before = token_client.balance(&contributor_b);

    // 1. Poster creates a task with reward and max_submissions = 2
    let task_id = client.create_task(
        &poster,
        &String::from_str(&env, "Build CLI tool"),
        &String::from_str(&env, "Create a command line interface"),
        &token_client.address(),
        &reward,
        &(env.ledger().timestamp() + 86_400),
        &2,
    );

    // 2. Contributor A submits work
    let sub_a_id = client.submit_work(
        &task_id,
        &contributor_a,
        &String::from_str(&env, "ipfs://cli-contrib-a"),
        &String::from_str(&env, "First draft cli"),
    );

    // 3. Contributor B submits work
    let sub_b_id = client.submit_work(
        &task_id,
        &contributor_b,
        &String::from_str(&env, "ipfs://cli-contrib-b"),
        &String::from_str(&env, "Polished and tested cli"),
    );

    // 4. Poster rejects Contributor A's work
    client.reject_submission(
        &task_id,
        &sub_a_id,
        &poster,
        &String::from_str(&env, "Code quality does not meet requirements"),
    );

    let sub_a = client.get_submission(&sub_a_id);
    assert_eq!(sub_a.status, SubmissionStatus::Rejected);

    // 5. Contributor A disputes the rejection
    client.raise_dispute(
        &task_id,
        &sub_a_id,
        &contributor_a,
        &String::from_str(&env, "Code meets the requirements completely"),
    );

    let task_disputed = client.get_task(&task_id);
    assert_eq!(task_disputed.status, TaskStatus::Disputed);

    // 6. Poster approves Contributor B's work (this should work despite active dispute on another submission)
    client.approve_submission(&task_id, &sub_b_id, &poster);

    // Verify balances
    let poster_balance_after = token_client.balance(&poster);
    let contributor_b_balance_after = token_client.balance(&contributor_b);
    assert_eq!(poster_balance_after, poster_balance_before - reward);
    assert_eq!(contributor_b_balance_after, contributor_b_balance_before + reward);

    // Verify task is completed
    let task_completed = client.get_task(&task_id);
    assert_eq!(task_completed.status, TaskStatus::Completed);

    // Verify submission B is approved
    let sub_b = client.get_submission(&sub_b_id);
    assert_eq!(sub_b.status, SubmissionStatus::Approved);
}


