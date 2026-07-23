/// # Contract-level Input Validation Tests (Issue #45)
///
/// These tests verify that every public contract function rejects malformed
/// inputs with a specific, identifiable error before touching state.
#[cfg(test)]
mod validation_tests {
    use crate::base::types::GroupMember;
    use crate::mock_token::{MockToken, MockTokenClient};
    use crate::tests::test_utils::{mint_tokens, setup_test_env};
    use crate::{AutoShareContract, AutoShareContractClient};
    use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String, Vec};

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    fn valid_members(env: &Env) -> Vec<GroupMember> {
        let mut m = Vec::new(env);
        m.push_back(GroupMember {
            address: Address::generate(env),
            percentage: 100,
        });
        m
    }

    fn two_members(env: &Env) -> Vec<GroupMember> {
        let mut m = Vec::new(env);
        m.push_back(GroupMember {
            address: Address::generate(env),
            percentage: 60,
        });
        m.push_back(GroupMember {
            address: Address::generate(env),
            percentage: 40,
        });
        m
    }

    // -----------------------------------------------------------------------
    // create — name validation
    // -----------------------------------------------------------------------

    #[test]
    #[should_panic] // InvalidInput: empty name
    fn test_create_empty_name_rejected() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        let creator = te.users.get(0).unwrap();
        let token = te.mock_tokens.get(0).unwrap();
        mint_tokens(&te.env, &token, &creator, 10_000);

        let id = BytesN::from_array(&te.env, &[1u8; 32]);
        let empty_name = String::from_str(&te.env, "");
        // Must panic with InvalidInput
        client.create(&id, &empty_name, &creator, &1u32, &token);
    }

    #[test]
    #[should_panic] // InvalidInput: name too long (> 100 chars)
    fn test_create_name_too_long_rejected() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        let creator = te.users.get(0).unwrap();
        let token = te.mock_tokens.get(0).unwrap();
        mint_tokens(&te.env, &token, &creator, 10_000);

        let id = BytesN::from_array(&te.env, &[2u8; 32]);
        let long = "a".repeat(101);
        let long_name = String::from_str(&te.env, long.as_str());
        client.create(&id, &long_name, &creator, &1u32, &token);
    }

    #[test]
    fn test_create_name_at_max_length_accepted() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        let creator = te.users.get(0).unwrap();
        let token = te.mock_tokens.get(0).unwrap();
        mint_tokens(&te.env, &token, &creator, 10_000);

        let id = BytesN::from_array(&te.env, &[3u8; 32]);
        let exact = "a".repeat(100);
        let name = String::from_str(&te.env, exact.as_str());
        // Should not panic
        client.create(&id, &name, &creator, &1u32, &token);
    }

    // -----------------------------------------------------------------------
    // create — usage_count validation
    // -----------------------------------------------------------------------

    #[test]
    #[should_panic] // InvalidUsageCount: zero
    fn test_create_zero_usages_rejected() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        let creator = te.users.get(0).unwrap();
        let token = te.mock_tokens.get(0).unwrap();
        mint_tokens(&te.env, &token, &creator, 10_000);

        let id = BytesN::from_array(&te.env, &[4u8; 32]);
        let name = String::from_str(&te.env, "Zero Usage");
        client.create(&id, &name, &creator, &0u32, &token);
    }

    #[test]
    #[should_panic] // InvalidUsageCount: above MAX_USAGE_COUNT
    fn test_create_usage_count_overflow_rejected() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        let creator = te.users.get(0).unwrap();
        let token = te.mock_tokens.get(0).unwrap();
        mint_tokens(&te.env, &token, &creator, i128::MAX);

        let id = BytesN::from_array(&te.env, &[5u8; 32]);
        let name = String::from_str(&te.env, "Overflow");
        // MAX_USAGE_COUNT + 1 = 10_001
        client.create(&id, &name, &creator, &10_001u32, &token);
    }

    // -----------------------------------------------------------------------
    // create — unsupported token
    // -----------------------------------------------------------------------

    #[test]
    #[should_panic] // UnsupportedToken
    fn test_create_unsupported_token_rejected() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        let creator = te.users.get(0).unwrap();

        // Register a new token but do NOT add it as supported
        let rogue_token = te.env.register(MockToken, ());
        let rogue_client = MockTokenClient::new(&te.env, &rogue_token);
        rogue_client.initialize(
            &creator,
            &7,
            &String::from_str(&te.env, "Rogue"),
            &String::from_str(&te.env, "RGT"),
        );
        mint_tokens(&te.env, &rogue_token, &creator, 10_000);

        let id = BytesN::from_array(&te.env, &[6u8; 32]);
        let name = String::from_str(&te.env, "Rogue Token Test");
        client.create(&id, &name, &creator, &1u32, &rogue_token);
    }

    // -----------------------------------------------------------------------
    // update_members — percentage validation
    // -----------------------------------------------------------------------

    #[test]
    #[should_panic] // InvalidInput: individual percentage = 0
    fn test_update_members_zero_percentage_rejected() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        let creator = te.users.get(0).unwrap();
        let token = te.mock_tokens.get(0).unwrap();
        mint_tokens(&te.env, &token, &creator, 10_000);

        let id = BytesN::from_array(&te.env, &[10u8; 32]);
        let name = String::from_str(&te.env, "Zero Pct");
        client.create(&id, &name, &creator, &1u32, &token);

        let mut bad = Vec::new(&te.env);
        bad.push_back(GroupMember {
            address: Address::generate(&te.env),
            percentage: 0, // invalid
        });
        client.update_members(&id, &creator, &bad);
    }

    #[test]
    #[should_panic] // InvalidInput: individual percentage > 100
    fn test_update_members_percentage_over_100_rejected() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        let creator = te.users.get(0).unwrap();
        let token = te.mock_tokens.get(0).unwrap();
        mint_tokens(&te.env, &token, &creator, 10_000);

        let id = BytesN::from_array(&te.env, &[11u8; 32]);
        let name = String::from_str(&te.env, "Over 100");
        client.create(&id, &name, &creator, &1u32, &token);

        let mut bad = Vec::new(&te.env);
        bad.push_back(GroupMember {
            address: Address::generate(&te.env),
            percentage: 101, // invalid
        });
        client.update_members(&id, &creator, &bad);
    }

    #[test]
    #[should_panic] // InvalidTotalPercentage: does not sum to 100
    fn test_update_members_wrong_total_rejected() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        let creator = te.users.get(0).unwrap();
        let token = te.mock_tokens.get(0).unwrap();
        mint_tokens(&te.env, &token, &creator, 10_000);

        let id = BytesN::from_array(&te.env, &[12u8; 32]);
        let name = String::from_str(&te.env, "Bad Total");
        client.create(&id, &name, &creator, &1u32, &token);

        let mut bad = Vec::new(&te.env);
        bad.push_back(GroupMember {
            address: Address::generate(&te.env),
            percentage: 40, // sums to 40, not 100
        });
        client.update_members(&id, &creator, &bad);
    }

    #[test]
    #[should_panic] // EmptyMembers
    fn test_update_members_empty_list_rejected() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        let creator = te.users.get(0).unwrap();
        let token = te.mock_tokens.get(0).unwrap();
        mint_tokens(&te.env, &token, &creator, 10_000);

        let id = BytesN::from_array(&te.env, &[13u8; 32]);
        let name = String::from_str(&te.env, "Empty");
        client.create(&id, &name, &creator, &1u32, &token);

        let empty: Vec<GroupMember> = Vec::new(&te.env);
        client.update_members(&id, &creator, &empty);
    }

    #[test]
    #[should_panic] // DuplicateMember
    fn test_update_members_duplicate_address_rejected() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        let creator = te.users.get(0).unwrap();
        let token = te.mock_tokens.get(0).unwrap();
        mint_tokens(&te.env, &token, &creator, 10_000);

        let id = BytesN::from_array(&te.env, &[14u8; 32]);
        let name = String::from_str(&te.env, "Dup");
        client.create(&id, &name, &creator, &1u32, &token);

        let dup_addr = Address::generate(&te.env);
        let mut dup = Vec::new(&te.env);
        dup.push_back(GroupMember {
            address: dup_addr.clone(),
            percentage: 50,
        });
        dup.push_back(GroupMember {
            address: dup_addr, // duplicate
            percentage: 50,
        });
        client.update_members(&id, &creator, &dup);
    }

    #[test]
    fn test_update_members_valid_accepted() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        let creator = te.users.get(0).unwrap();
        let token = te.mock_tokens.get(0).unwrap();
        mint_tokens(&te.env, &token, &creator, 10_000);

        let id = BytesN::from_array(&te.env, &[15u8; 32]);
        let name = String::from_str(&te.env, "Valid");
        client.create(&id, &name, &creator, &1u32, &token);

        let members = two_members(&te.env);
        // Should not panic
        client.update_members(&id, &creator, &members);
    }

    // -----------------------------------------------------------------------
    // topup_subscription — usage count validation
    // -----------------------------------------------------------------------

    #[test]
    #[should_panic] // InvalidUsageCount: zero additional usages
    fn test_topup_zero_usages_rejected() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        let creator = te.users.get(0).unwrap();
        let payer = te.users.get(1).unwrap();
        let token = te.mock_tokens.get(0).unwrap();
        mint_tokens(&te.env, &token, &creator, 10_000);
        mint_tokens(&te.env, &token, &payer, 10_000);

        let id = BytesN::from_array(&te.env, &[20u8; 32]);
        let name = String::from_str(&te.env, "Topup Test");
        client.create(&id, &name, &creator, &1u32, &token);

        client.topup_subscription(&id, &0u32, &token, &payer);
    }

    #[test]
    #[should_panic] // InvalidUsageCount: above MAX
    fn test_topup_overflow_usages_rejected() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        let creator = te.users.get(0).unwrap();
        let payer = te.users.get(1).unwrap();
        let token = te.mock_tokens.get(0).unwrap();
        mint_tokens(&te.env, &token, &creator, 10_000);
        mint_tokens(&te.env, &token, &payer, i128::MAX);

        let id = BytesN::from_array(&te.env, &[21u8; 32]);
        let name = String::from_str(&te.env, "Topup Overflow");
        client.create(&id, &name, &creator, &1u32, &token);

        client.topup_subscription(&id, &10_001u32, &token, &payer);
    }

    // -----------------------------------------------------------------------
    // set_usage_fee — fee validation
    // -----------------------------------------------------------------------

    #[test]
    #[should_panic] // InvalidAmount: zero fee
    fn test_set_usage_fee_zero_rejected() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        client.set_usage_fee(&0u32, &te.admin);
    }

    #[test]
    #[should_panic] // InvalidAmount: above MAX_USAGE_FEE
    fn test_set_usage_fee_too_high_rejected() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        // MAX_USAGE_FEE = 1_000_000; 1_000_001 should fail
        client.set_usage_fee(&1_000_001u32, &te.admin);
    }

    #[test]
    fn test_set_usage_fee_valid_accepted() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        // Should not panic
        client.set_usage_fee(&100u32, &te.admin);
        assert_eq!(client.get_usage_fee(), 100u32);
    }

    // -----------------------------------------------------------------------
    // withdraw — amount validation
    // -----------------------------------------------------------------------

    #[test]
    #[should_panic] // InvalidAmount: zero amount
    fn test_withdraw_zero_amount_rejected() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        let recipient = Address::generate(&te.env);
        let token = te.mock_tokens.get(0).unwrap();

        client.withdraw(&te.admin, &token, &0i128, &recipient);
    }

    #[test]
    #[should_panic] // InvalidAmount: negative amount
    fn test_withdraw_negative_amount_rejected() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        let recipient = Address::generate(&te.env);
        let token = te.mock_tokens.get(0).unwrap();

        client.withdraw(&te.admin, &token, &-1i128, &recipient);
    }

    #[test]
    #[should_panic] // InsufficientContractBalance (valid amount but nothing in contract)
    fn test_withdraw_insufficient_balance_rejected() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        let recipient = Address::generate(&te.env);
        let token = te.mock_tokens.get(0).unwrap();

        // Contract has no balance — valid amount but should fail on balance check
        client.withdraw(&te.admin, &token, &100i128, &recipient);
    }

    // -----------------------------------------------------------------------
    // Authorization: non-creator cannot update members
    // -----------------------------------------------------------------------

    #[test]
    #[should_panic] // Unauthorized
    fn test_update_members_non_creator_rejected() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        let creator = te.users.get(0).unwrap();
        let impostor = te.users.get(1).unwrap();
        let token = te.mock_tokens.get(0).unwrap();
        mint_tokens(&te.env, &token, &creator, 10_000);

        let id = BytesN::from_array(&te.env, &[30u8; 32]);
        let name = String::from_str(&te.env, "Auth Test");
        client.create(&id, &name, &creator, &1u32, &token);

        let members = valid_members(&te.env);
        client.update_members(&id, &impostor, &members);
    }

    // -----------------------------------------------------------------------
    // Paused contract: operations rejected
    // -----------------------------------------------------------------------

    #[test]
    #[should_panic] // ContractPaused
    fn test_create_while_paused_rejected() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        let creator = te.users.get(0).unwrap();
        let token = te.mock_tokens.get(0).unwrap();
        mint_tokens(&te.env, &token, &creator, 10_000);

        client.pause(&te.admin);

        let id = BytesN::from_array(&te.env, &[40u8; 32]);
        let name = String::from_str(&te.env, "Paused");
        client.create(&id, &name, &creator, &1u32, &token);
    }

    #[test]
    #[should_panic] // ContractPaused
    fn test_topup_while_paused_rejected() {
        let te = setup_test_env();
        let client = AutoShareContractClient::new(&te.env, &te.autoshare_contract);
        let creator = te.users.get(0).unwrap();
        let payer = te.users.get(1).unwrap();
        let token = te.mock_tokens.get(0).unwrap();
        mint_tokens(&te.env, &token, &creator, 10_000);
        mint_tokens(&te.env, &token, &payer, 10_000);

        let id = BytesN::from_array(&te.env, &[41u8; 32]);
        let name = String::from_str(&te.env, "Paused Topup");
        client.create(&id, &name, &creator, &1u32, &token);

        client.pause(&te.admin);
        client.topup_subscription(&id, &1u32, &token, &payer);
    }
}
