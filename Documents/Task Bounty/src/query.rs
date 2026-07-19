use alloc::vec::Vec as StdVec;

use crate::{storage, types::{Task, TaskStatus}};
use soroban_sdk::{Env, String, Vec};

fn all_tasks(env: &Env) -> Vec<Task> {
    let count = storage::get_task_counter(env);
    let mut tasks: Vec<Task> = Vec::new(env);

    if count == 0 {
        return tasks;
    }

    for task_id in 1..=count {
        if storage::task_exists(env, task_id) {
            tasks.push_back(storage::get_task(env, task_id));
        }
    }

    tasks
}

fn string_to_bytes(value: &String) -> StdVec<u8> {
    let len = value.len() as usize;
    let mut bytes = StdVec::with_capacity(len);
    bytes.resize(len, 0);
    value.copy_into_slice(&mut bytes[..]);
    bytes
}

fn contains_bytes(haystack: &[u8], needle: &[u8]) -> bool {
    if needle.is_empty() {
        return true;
    }

    if needle.len() > haystack.len() {
        return false;
    }

    haystack.windows(needle.len()).any(|window| window == needle)
}

fn task_matches_query(task: &Task, query: &String) -> bool {
    let query_bytes = string_to_bytes(query);
    let title_bytes = string_to_bytes(&task.title);
    let description_bytes = string_to_bytes(&task.description);

    contains_bytes(&title_bytes, &query_bytes) || contains_bytes(&description_bytes, &query_bytes)
}

pub fn get_all_tasks(env: &Env) -> Vec<Task> {
    all_tasks(env)
}

pub fn get_tasks_by_status(env: &Env, status: TaskStatus) -> Vec<Task> {
    let mut results: Vec<Task> = Vec::new(env);

    for task in all_tasks(env).iter() {
        if task.status == status {
            results.push_back(task.clone());
        }
    }

    results
}

pub fn get_tasks_by_reward(env: &Env, reward: i128) -> Vec<Task> {
    let mut results: Vec<Task> = Vec::new(env);

    for task in all_tasks(env).iter() {
        if task.reward == reward {
            results.push_back(task.clone());
        }
    }

    results
}

pub fn get_tasks_by_category(env: &Env, category: String) -> Vec<Task> {
    let mut results: Vec<Task> = Vec::new(env);

    for task in all_tasks(env).iter() {
        if task.category == category {
            results.push_back(task.clone());
        }
    }

    results
}

pub fn get_tasks_by_min_reward(env: &Env, min_reward: i128) -> Vec<Task> {
    let mut results: Vec<Task> = Vec::new(env);

    for task in all_tasks(env).iter() {
        if task.reward >= min_reward {
            results.push_back(task.clone());
        }
    }

    results
}

pub fn get_tasks_by_tag(env: &Env, tag: String) -> Vec<Task> {
    let mut results: Vec<Task> = Vec::new(env);

    for task in all_tasks(env).iter() {
        if task.tags.contains(tag.clone()) {
            results.push_back(task.clone());
        }
    }

    results
}

pub fn get_tasks_before_deadline(env: &Env, deadline: u64) -> Vec<Task> {
    let mut results: Vec<Task> = Vec::new(env);

    for task in all_tasks(env).iter() {
        if task.deadline <= deadline {
            results.push_back(task.clone());
        }
    }

    results
}

pub fn search_tasks(env: &Env, query: String) -> Vec<Task> {
    let mut results: Vec<Task> = Vec::new(env);

    for task in all_tasks(env).iter() {
        if task_matches_query(&task, &query) {
            results.push_back(task.clone());
        }
    }

    results
}
