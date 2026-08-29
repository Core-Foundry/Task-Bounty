use soroban_sdk::Env;
use crate::types::Task;

/// Check if a task has passed its deadline.
///
/// A task is considered expired if the current ledger timestamp is strictly
/// greater than the task's deadline. Tasks expiring exactly at the current
/// timestamp are treated as expired (deadline is inclusive).
///
/// # Arguments
/// * `env` - The Soroban environment for accessing ledger time
/// * `task` - The task to check for expiration
///
/// # Returns
/// `true` if the task has expired (current_time > deadline), `false` otherwise
///
/// # Examples
/// ```ignore
/// let task = storage::get_task(&env, task_id);
/// if is_task_expired(&env, &task) {
///     // Handle expired task
/// }
/// ```
pub fn is_task_expired(env: &Env, task: &Task) -> bool {
    let current_time = env.ledger().timestamp();
    current_time > task.deadline
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Task, TaskStatus};
    use soroban_sdk::{Address, Env, String, Vec, testutils::{Address as _, Ledger}};

    fn create_test_task(env: &Env, deadline: u64) -> Task {
        Task {
            id: 1,
            poster: Address::generate(env),
            title: String::from_str(env, "Test Task"),
            description: String::from_str(env, "Test Description"),
            category: String::from_str(env, "General"),
            tags: Vec::new(env),
            token: Address::generate(env),
            reward: 1_000_000,
            deadline,
            max_submissions: 3,
            submission_count: 0,
            status: TaskStatus::Open,
            created_at: 1_000,
        }
    }

    #[test]
    fn test_task_expired_past_deadline() {
        let env = Env::default();
        env.ledger().with_mut(|li| {
            li.timestamp = 10_000;
        });

        let task = create_test_task(&env, 5_000); // Deadline in the past
        assert!(is_task_expired(&env, &task));
    }

    #[test]
    fn test_task_not_expired_future_deadline() {
        let env = Env::default();
        env.ledger().with_mut(|li| {
            li.timestamp = 10_000;
        });

        let task = create_test_task(&env, 20_000); // Deadline in the future
        assert!(!is_task_expired(&env, &task));
    }

    #[test]
    fn test_task_expired_at_exact_deadline() {
        let env = Env::default();
        env.ledger().with_mut(|li| {
            li.timestamp = 10_000;
        });

        // Deadline exactly at current time - treated as expired
        // This follows the existing convention in submission.rs where
        // `current_time > deadline` triggers TaskExpired error
        let task = create_test_task(&env, 10_000);
        assert!(!is_task_expired(&env, &task));
    }

    #[test]
    fn test_task_expired_one_second_past() {
        let env = Env::default();
        env.ledger().with_mut(|li| {
            li.timestamp = 10_001;
        });

        let task = create_test_task(&env, 10_000);
        assert!(is_task_expired(&env, &task));
    }

    #[test]
    fn test_task_not_expired_one_second_before() {
        let env = Env::default();
        env.ledger().with_mut(|li| {
            li.timestamp = 9_999;
        });

        let task = create_test_task(&env, 10_000);
        assert!(!is_task_expired(&env, &task));
    }

    #[test]
    fn test_task_expired_far_past() {
        let env = Env::default();
        env.ledger().with_mut(|li| {
            li.timestamp = 1_000_000;
        });

        let task = create_test_task(&env, 100);
        assert!(is_task_expired(&env, &task));
    }

    #[test]
    fn test_task_not_expired_far_future() {
        let env = Env::default();
        env.ledger().with_mut(|li| {
            li.timestamp = 1_000;
        });

        let task = create_test_task(&env, 1_000_000);
        assert!(!is_task_expired(&env, &task));
    }
}
