/// # Smart Contract Benchmark Tests (Issue #46)
///
/// These tests measure the CPU instruction and memory consumption of core
/// contract functions using Soroban's built-in resource metering.
///
/// ## How to run
/// ```
/// cargo test benchmark --locked -- --nocapture
/// ```
///
/// The `--nocapture` flag ensures the resource tables are printed to stdout.
///
/// ## How to interpret results
/// Soroban charges per-instruction and per-byte on the network. The numbers
/// printed here are from the test environment (mock ledger) and represent
/// relative costs, not exact mainnet fees. Use them to:
///   1. Compare operations against each other
///   2. Detect regressions when refactoring
///   3. Identify unexpectedly expensive operations worth optimising
#[cfg(test)]
mod benchmark_tests {
    use crate::mock_token::{MockToken, MockTokenClient};
    use crate::tests::test_utils::{create_test_members, mint_tokens, setup_test_env};
    use crate::{AutoShareContract, AutoShareContractClient};
    use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String, Vec};

    // -------------------------------------------------------------------------
    // Helper: print a formatted resource report
    // -------------------------------------------------------------------------

    fn print_resource_report(label: &str, env: &Env) {
        let resources = env.budget().print();
        println!("\n========================================");
        println!("  BENCHMARK: {}", label);
        println!("========================================");
        println!("{}", resources);
        println!("----------------------------------------\n");
    }

    fn reset_budget(env: &Env) {
        env.budget().reset_unlimited();
    }

    // -------------------------------------------------------------------------
    // Helper: build a fresh env with contract + token deployed
    // -------------------------------------------------------------------------

    struct BenchEnv {
        env: Env,
        contract: Address,
        token: Address,
        admin: Address,
    }

    fn setup_bench_env() -> BenchEnv {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let contract_id = env.register(AutoShareContract, ());
        let client = AutoShareContractClient::new(&env, &contract_id);
        client.initialize_admin(&admin);

        // Deploy mock token
        let token_id = env.register(MockToken, ());
        let token_client = MockTokenClient::new(&env, &token_id);
        token_client.initialize(
            &admin,
            &7,
            &String::from_str(&env, "Bench Token"),
            &String::from_str(&env, "BNT"),
        );

        // Register it as supported
        client.add_supported_token(&token_id, &admin);

        BenchEnv {
            env,
            contract: contract_id,
            token: token_id,
            admin,
        }
    }

    // -------------------------------------------------------------------------
    // Benchmark: initialize_admin
    // -------------------------------------------------------------------------

    #[test]
    fn benchmark_initialize_admin() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let contract_id = env.register(AutoShareContract, ());
        let client = AutoShareContractClient::new(&env, &contract_id);

        reset_budget(&env);
        client.initialize_admin(&admin);
        print_resource_report("initialize_admin", &env);
    }

    // -------------------------------------------------------------------------
    // Benchmark: create (single group, 1 usage)
    // -------------------------------------------------------------------------

    #[test]
    fn benchmark_create_group_single_usage() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        let creator = Address::generate(&b.env);
        let id = BytesN::from_array(&b.env, &[1u8; 32]);
        let name = String::from_str(&b.env, "Benchmark Group");

        // Fund creator: fee=10, usages=1 → cost=10
        mint_tokens(&b.env, &b.token, &creator, 10_000);

        reset_budget(&b.env);
        client.create(&id, &name, &creator, &1u32, &b.token);
        print_resource_report("create (1 usage, no members)", &b.env);
    }

    // -------------------------------------------------------------------------
    // Benchmark: create (10 usages)
    // -------------------------------------------------------------------------

    #[test]
    fn benchmark_create_group_ten_usages() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        let creator = Address::generate(&b.env);
        let id = BytesN::from_array(&b.env, &[2u8; 32]);
        let name = String::from_str(&b.env, "Benchmark Group 10");

        mint_tokens(&b.env, &b.token, &creator, 10_000);

        reset_budget(&b.env);
        client.create(&id, &name, &creator, &10u32, &b.token);
        print_resource_report("create (10 usages, no members)", &b.env);
    }

    // -------------------------------------------------------------------------
    // Benchmark: update_members — 2 members
    // -------------------------------------------------------------------------

    #[test]
    fn benchmark_update_members_2() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        let creator = Address::generate(&b.env);
        let id = BytesN::from_array(&b.env, &[3u8; 32]);
        let name = String::from_str(&b.env, "Members 2");

        mint_tokens(&b.env, &b.token, &creator, 10_000);
        client.create(&id, &name, &creator, &1u32, &b.token);

        let members = create_test_members(&b.env, 2);

        reset_budget(&b.env);
        client.update_members(&id, &creator, &members);
        print_resource_report("update_members (2 members)", &b.env);
    }

    // -------------------------------------------------------------------------
    // Benchmark: update_members — 5 members
    // -------------------------------------------------------------------------

    #[test]
    fn benchmark_update_members_5() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        let creator = Address::generate(&b.env);
        let id = BytesN::from_array(&b.env, &[4u8; 32]);
        let name = String::from_str(&b.env, "Members 5");

        mint_tokens(&b.env, &b.token, &creator, 10_000);
        client.create(&id, &name, &creator, &1u32, &b.token);

        let members = create_test_members(&b.env, 5);

        reset_budget(&b.env);
        client.update_members(&id, &creator, &members);
        print_resource_report("update_members (5 members)", &b.env);
    }

    // -------------------------------------------------------------------------
    // Benchmark: update_members — 10 members
    // -------------------------------------------------------------------------

    #[test]
    fn benchmark_update_members_10() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        let creator = Address::generate(&b.env);
        let id = BytesN::from_array(&b.env, &[5u8; 32]);
        let name = String::from_str(&b.env, "Members 10");

        mint_tokens(&b.env, &b.token, &creator, 10_000);
        client.create(&id, &name, &creator, &1u32, &b.token);

        let members = create_test_members(&b.env, 10);

        reset_budget(&b.env);
        client.update_members(&id, &creator, &members);
        print_resource_report("update_members (10 members)", &b.env);
    }

    // -------------------------------------------------------------------------
    // Benchmark: get (single group read)
    // -------------------------------------------------------------------------

    #[test]
    fn benchmark_get_group() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        let creator = Address::generate(&b.env);
        let id = BytesN::from_array(&b.env, &[6u8; 32]);
        let name = String::from_str(&b.env, "Get Bench");

        mint_tokens(&b.env, &b.token, &creator, 10_000);
        client.create(&id, &name, &creator, &1u32, &b.token);
        let members = create_test_members(&b.env, 3);
        client.update_members(&id, &creator, &members);

        reset_budget(&b.env);
        let _ = client.get(&id);
        print_resource_report("get (group with 3 members)", &b.env);
    }

    // -------------------------------------------------------------------------
    // Benchmark: get_all_groups — 1, 10, 50 groups
    // -------------------------------------------------------------------------

    #[test]
    fn benchmark_get_all_groups_1() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        create_n_groups(&b, &client, 1);

        reset_budget(&b.env);
        let _ = client.get_all_groups();
        print_resource_report("get_all_groups (1 group)", &b.env);
    }

    #[test]
    fn benchmark_get_all_groups_10() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        create_n_groups(&b, &client, 10);

        reset_budget(&b.env);
        let _ = client.get_all_groups();
        print_resource_report("get_all_groups (10 groups)", &b.env);
    }

    #[test]
    fn benchmark_get_all_groups_50() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        create_n_groups(&b, &client, 50);

        reset_budget(&b.env);
        let _ = client.get_all_groups();
        print_resource_report("get_all_groups (50 groups)", &b.env);
    }

    // -------------------------------------------------------------------------
    // Benchmark: get_groups_by_creator — filtering from 20 groups
    // -------------------------------------------------------------------------

    #[test]
    fn benchmark_get_groups_by_creator() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        let target_creator = Address::generate(&b.env);

        // Create 10 groups by target creator + 10 by others
        for i in 0u32..10 {
            let mut id_bytes = [0u8; 32];
            id_bytes[0..4].copy_from_slice(&i.to_be_bytes());
            let id = BytesN::from_array(&b.env, &id_bytes);
            let name = String::from_str(&b.env, "Target");
            mint_tokens(&b.env, &b.token, &target_creator, 10_000);
            client.create(&id, &name, &target_creator, &1u32, &b.token);
        }
        for i in 10u32..20 {
            let other = Address::generate(&b.env);
            let mut id_bytes = [0u8; 32];
            id_bytes[0..4].copy_from_slice(&i.to_be_bytes());
            let id = BytesN::from_array(&b.env, &id_bytes);
            let name = String::from_str(&b.env, "Other");
            mint_tokens(&b.env, &b.token, &other, 10_000);
            client.create(&id, &name, &other, &1u32, &b.token);
        }

        reset_budget(&b.env);
        let _ = client.get_groups_by_creator(&target_creator);
        print_resource_report("get_groups_by_creator (10/20 groups match)", &b.env);
    }

    // -------------------------------------------------------------------------
    // Benchmark: is_group_member — member present vs absent
    // -------------------------------------------------------------------------

    #[test]
    fn benchmark_is_group_member_present() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        let creator = Address::generate(&b.env);
        let id = BytesN::from_array(&b.env, &[20u8; 32]);

        mint_tokens(&b.env, &b.token, &creator, 10_000);
        client.create(&id, &String::from_str(&b.env, "Mem"), &creator, &1u32, &b.token);
        let members = create_test_members(&b.env, 5);
        client.update_members(&id, &creator, &members);
        let target = members.get(2).unwrap().address;

        reset_budget(&b.env);
        let _ = client.is_group_member(&id, &target);
        print_resource_report("is_group_member (present, 5 members)", &b.env);
    }

    #[test]
    fn benchmark_is_group_member_absent() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        let creator = Address::generate(&b.env);
        let id = BytesN::from_array(&b.env, &[21u8; 32]);

        mint_tokens(&b.env, &b.token, &creator, 10_000);
        client.create(&id, &String::from_str(&b.env, "Mem2"), &creator, &1u32, &b.token);
        let members = create_test_members(&b.env, 5);
        client.update_members(&id, &creator, &members);
        let stranger = Address::generate(&b.env);

        reset_budget(&b.env);
        let _ = client.is_group_member(&id, &stranger);
        print_resource_report("is_group_member (absent, 5 members)", &b.env);
    }

    // -------------------------------------------------------------------------
    // Benchmark: topup_subscription
    // -------------------------------------------------------------------------

    #[test]
    fn benchmark_topup_subscription() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        let creator = Address::generate(&b.env);
        let payer = Address::generate(&b.env);
        let id = BytesN::from_array(&b.env, &[30u8; 32]);

        mint_tokens(&b.env, &b.token, &creator, 10_000);
        mint_tokens(&b.env, &b.token, &payer, 10_000);
        client.create(&id, &String::from_str(&b.env, "Topup"), &creator, &1u32, &b.token);

        reset_budget(&b.env);
        client.topup_subscription(&id, &5u32, &b.token, &payer);
        print_resource_report("topup_subscription (5 usages)", &b.env);
    }

    // -------------------------------------------------------------------------
    // Benchmark: deactivate_group + activate_group
    // -------------------------------------------------------------------------

    #[test]
    fn benchmark_deactivate_group() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        let creator = Address::generate(&b.env);
        let id = BytesN::from_array(&b.env, &[40u8; 32]);

        mint_tokens(&b.env, &b.token, &creator, 10_000);
        client.create(&id, &String::from_str(&b.env, "Deactivate"), &creator, &1u32, &b.token);

        reset_budget(&b.env);
        client.deactivate_group(&id, &creator);
        print_resource_report("deactivate_group", &b.env);
    }

    #[test]
    fn benchmark_activate_group() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        let creator = Address::generate(&b.env);
        let id = BytesN::from_array(&b.env, &[41u8; 32]);

        mint_tokens(&b.env, &b.token, &creator, 10_000);
        client.create(&id, &String::from_str(&b.env, "Activate"), &creator, &1u32, &b.token);
        client.deactivate_group(&id, &creator);

        reset_budget(&b.env);
        client.activate_group(&id, &creator);
        print_resource_report("activate_group (after deactivate)", &b.env);
    }

    // -------------------------------------------------------------------------
    // Benchmark: withdraw
    // -------------------------------------------------------------------------

    #[test]
    fn benchmark_withdraw() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        let creator = Address::generate(&b.env);
        let recipient = Address::generate(&b.env);
        let id = BytesN::from_array(&b.env, &[50u8; 32]);

        // Fund contract by creating a group (transfers tokens to contract)
        mint_tokens(&b.env, &b.token, &creator, 10_000);
        client.create(&id, &String::from_str(&b.env, "Withdraw"), &creator, &1u32, &b.token);

        reset_budget(&b.env);
        client.withdraw(&b.admin, &b.token, &10i128, &recipient);
        print_resource_report("withdraw (10 tokens)", &b.env);
    }

    // -------------------------------------------------------------------------
    // Benchmark: add_supported_token + remove_supported_token
    // -------------------------------------------------------------------------

    #[test]
    fn benchmark_add_supported_token() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        let new_token = env_register_token(&b.env, &b.admin);

        reset_budget(&b.env);
        client.add_supported_token(&new_token, &b.admin);
        print_resource_report("add_supported_token", &b.env);
    }

    #[test]
    fn benchmark_remove_supported_token() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        let new_token = env_register_token(&b.env, &b.admin);
        client.add_supported_token(&new_token, &b.admin);

        reset_budget(&b.env);
        client.remove_supported_token(&new_token, &b.admin);
        print_resource_report("remove_supported_token", &b.env);
    }

    // -------------------------------------------------------------------------
    // Benchmark: pause + unpause
    // -------------------------------------------------------------------------

    #[test]
    fn benchmark_pause() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);

        reset_budget(&b.env);
        client.pause(&b.admin);
        print_resource_report("pause", &b.env);
    }

    #[test]
    fn benchmark_unpause() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        client.pause(&b.admin);

        reset_budget(&b.env);
        client.unpause(&b.admin);
        print_resource_report("unpause (after pause)", &b.env);
    }

    // -------------------------------------------------------------------------
    // Benchmark: transfer_admin
    // -------------------------------------------------------------------------

    #[test]
    fn benchmark_transfer_admin() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        let new_admin = Address::generate(&b.env);

        reset_budget(&b.env);
        client.transfer_admin(&b.admin, &new_admin);
        print_resource_report("transfer_admin", &b.env);
    }

    // -------------------------------------------------------------------------
    // Benchmark: reduce_usage
    // -------------------------------------------------------------------------

    #[test]
    fn benchmark_reduce_usage() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        let creator = Address::generate(&b.env);
        let id = BytesN::from_array(&b.env, &[60u8; 32]);

        mint_tokens(&b.env, &b.token, &creator, 10_000);
        client.create(&id, &String::from_str(&b.env, "Reduce"), &creator, &5u32, &b.token);

        reset_budget(&b.env);
        client.reduce_usage(&id);
        print_resource_report("reduce_usage", &b.env);
    }

    // -------------------------------------------------------------------------
    // Benchmark: get_user_payment_history — 1, 10 entries
    // -------------------------------------------------------------------------

    #[test]
    fn benchmark_get_user_payment_history_1() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        let user = Address::generate(&b.env);

        // Create 1 group to generate 1 payment history entry
        let id = BytesN::from_array(&b.env, &[70u8; 32]);
        mint_tokens(&b.env, &b.token, &user, 10_000);
        client.create(&id, &String::from_str(&b.env, "Pay1"), &user, &1u32, &b.token);

        reset_budget(&b.env);
        let _ = client.get_user_payment_history(&user);
        print_resource_report("get_user_payment_history (1 entry)", &b.env);
    }

    #[test]
    fn benchmark_get_user_payment_history_10() {
        let b = setup_bench_env();
        let client = AutoShareContractClient::new(&b.env, &b.contract);
        let user = Address::generate(&b.env);

        // Create 10 groups to generate 10 payment history entries
        mint_tokens(&b.env, &b.token, &user, 1_000_000);
        for i in 70u32..80u32 {
            let mut id_bytes = [0u8; 32];
            id_bytes[0..4].copy_from_slice(&i.to_be_bytes());
            let id = BytesN::from_array(&b.env, &id_bytes);
            client.create(&id, &String::from_str(&b.env, "PayN"), &user, &1u32, &b.token);
        }

        reset_budget(&b.env);
        let _ = client.get_user_payment_history(&user);
        print_resource_report("get_user_payment_history (10 entries)", &b.env);
    }

    // -------------------------------------------------------------------------
    // Utility: create N groups for list benchmarks
    // -------------------------------------------------------------------------

    fn create_n_groups(b: &BenchEnv, client: &AutoShareContractClient, n: u32) {
        for i in 0..n {
            let creator = Address::generate(&b.env);
            let mut id_bytes = [0u8; 32];
            id_bytes[0..4].copy_from_slice(&i.to_be_bytes());
            let id = BytesN::from_array(&b.env, &id_bytes);
            let name = String::from_str(&b.env, "Bench");
            mint_tokens(&b.env, &b.token, &creator, 10_000);
            client.create(&id, &name, &creator, &1u32, &b.token);
        }
    }

    fn env_register_token(env: &Env, admin: &Address) -> Address {
        let token_id = env.register(MockToken, ());
        let client = MockTokenClient::new(env, &token_id);
        client.initialize(
            admin,
            &7,
            &String::from_str(env, "Extra Token"),
            &String::from_str(env, "EXT"),
        );
        token_id
    }
}
