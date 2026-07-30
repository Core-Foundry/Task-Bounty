/// # Input Validation (Issue #45)
///
/// Every public contract function must call the relevant validator(s) before
/// touching any storage or issuing token transfers.
///
/// ## Rules
/// - Validation always runs **before** any state mutation.
/// - Each validator returns a typed `Error` so clients can branch on the code.
/// - String lengths are capped to prevent unbounded storage growth.
/// - Numeric ranges are checked against documented constraints.
use crate::base::errors::Error;
use soroban_sdk::{Env, String, Vec};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// Maximum allowed length for a group name (characters).
pub const MAX_NAME_LEN: u32 = 100;

/// Maximum number of members allowed in a group.
pub const MAX_MEMBERS: u32 = 50;

/// Maximum number of additional usages that can be purchased at once.
pub const MAX_USAGE_COUNT: u32 = 10_000;

/// Maximum usage fee that an admin can set (tokens per usage).
pub const MAX_USAGE_FEE: u32 = 1_000_000;

// ---------------------------------------------------------------------------
// String validators
// ---------------------------------------------------------------------------

/// Validates that a group `name` is non-empty and within the length cap.
///
/// # Errors
/// - `Error::InvalidInput` — empty string or exceeds `MAX_NAME_LEN`
pub fn validate_name(name: &String) -> Result<(), Error> {
    let len = name.len();
    if len == 0 {
        return Err(Error::InvalidInput);
    }
    if len > MAX_NAME_LEN {
        return Err(Error::InvalidInput);
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Numeric validators
// ---------------------------------------------------------------------------

/// Validates that `usage_count` is in the range `[1, MAX_USAGE_COUNT]`.
///
/// # Errors
/// - `Error::InvalidUsageCount` — zero or above the maximum
pub fn validate_usage_count(usage_count: u32) -> Result<(), Error> {
    if usage_count == 0 || usage_count > MAX_USAGE_COUNT {
        return Err(Error::InvalidUsageCount);
    }
    Ok(())
}

/// Validates that a `fee` value is non-zero and within `MAX_USAGE_FEE`.
///
/// # Errors
/// - `Error::InvalidAmount` — zero or above the maximum
pub fn validate_fee(fee: u32) -> Result<(), Error> {
    if fee == 0 || fee > MAX_USAGE_FEE {
        return Err(Error::InvalidAmount);
    }
    Ok(())
}

/// Validates that a withdrawal `amount` is strictly positive.
///
/// # Errors
/// - `Error::InvalidAmount` — zero or negative
pub fn validate_withdraw_amount(amount: i128) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    Ok(())
}

/// Validates that a member `percentage` contribution is in `[1, 100]`.
///
/// # Errors
/// - `Error::InvalidInput` — zero or greater than 100
pub fn validate_member_percentage(percentage: u32) -> Result<(), Error> {
    if percentage == 0 || percentage > 100 {
        return Err(Error::InvalidInput);
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Member list validators
// ---------------------------------------------------------------------------

/// Validates a full member list:
/// - Non-empty
/// - Does not exceed `MAX_MEMBERS`
/// - Each member has a valid percentage (`[1, 100]`)
/// - No duplicate addresses
/// - Total percentages sum to exactly 100
///
/// # Errors
/// - `Error::EmptyMembers`           — list is empty
/// - `Error::InvalidInput`           — list exceeds `MAX_MEMBERS`
/// - `Error::InvalidInput`           — individual percentage is 0 or > 100
/// - `Error::DuplicateMember`        — same address appears more than once
/// - `Error::InvalidTotalPercentage` — percentages do not sum to 100
pub fn validate_members<T>(env: &Env, members: &soroban_sdk::Vec<T>) -> Result<(), Error>
where
    T: soroban_sdk::TryFromVal<soroban_sdk::Env, soroban_sdk::Val>
        + soroban_sdk::IntoVal<soroban_sdk::Env, soroban_sdk::Val>
        + Clone,
    crate::base::types::GroupMember: From<T>,
{
    if members.is_empty() {
        return Err(Error::EmptyMembers);
    }
    if members.len() > MAX_MEMBERS {
        return Err(Error::InvalidInput);
    }

    let mut total_percentage: u32 = 0;
    let mut seen: soroban_sdk::Vec<soroban_sdk::Address> = soroban_sdk::Vec::new(env);

    for raw in members.iter() {
        let member = crate::base::types::GroupMember::from(raw);

        validate_member_percentage(member.percentage)?;
        total_percentage = total_percentage.saturating_add(member.percentage);

        for existing in seen.iter() {
            if existing == member.address {
                return Err(Error::DuplicateMember);
            }
        }
        seen.push_back(member.address.clone());
    }

    if total_percentage != 100 {
        return Err(Error::InvalidTotalPercentage);
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{Env, String};

    #[test]
    fn test_validate_name_ok() {
        let env = Env::default();
        let name = String::from_str(&env, "Valid Group Name");
        assert!(validate_name(&name).is_ok());
    }

    #[test]
    fn test_validate_name_empty() {
        let env = Env::default();
        let name = String::from_str(&env, "");
        assert_eq!(validate_name(&name), Err(Error::InvalidInput));
    }

    #[test]
    fn test_validate_name_too_long() {
        let env = Env::default();
        // 101 characters — one over the limit
        let long = "a".repeat(101);
        let name = String::from_str(&env, long.as_str());
        assert_eq!(validate_name(&name), Err(Error::InvalidInput));
    }

    #[test]
    fn test_validate_name_at_max_length() {
        let env = Env::default();
        let exact = "a".repeat(100);
        let name = String::from_str(&env, exact.as_str());
        assert!(validate_name(&name).is_ok());
    }

    #[test]
    fn test_validate_usage_count_ok() {
        assert!(validate_usage_count(1).is_ok());
        assert!(validate_usage_count(500).is_ok());
        assert!(validate_usage_count(MAX_USAGE_COUNT).is_ok());
    }

    #[test]
    fn test_validate_usage_count_zero() {
        assert_eq!(validate_usage_count(0), Err(Error::InvalidUsageCount));
    }

    #[test]
    fn test_validate_usage_count_overflow() {
        assert_eq!(
            validate_usage_count(MAX_USAGE_COUNT + 1),
            Err(Error::InvalidUsageCount)
        );
    }

    #[test]
    fn test_validate_fee_ok() {
        assert!(validate_fee(1).is_ok());
        assert!(validate_fee(100).is_ok());
        assert!(validate_fee(MAX_USAGE_FEE).is_ok());
    }

    #[test]
    fn test_validate_fee_zero() {
        assert_eq!(validate_fee(0), Err(Error::InvalidAmount));
    }

    #[test]
    fn test_validate_fee_too_high() {
        assert_eq!(validate_fee(MAX_USAGE_FEE + 1), Err(Error::InvalidAmount));
    }

    #[test]
    fn test_validate_withdraw_amount_ok() {
        assert!(validate_withdraw_amount(1).is_ok());
        assert!(validate_withdraw_amount(i128::MAX).is_ok());
    }

    #[test]
    fn test_validate_withdraw_amount_zero() {
        assert_eq!(validate_withdraw_amount(0), Err(Error::InvalidAmount));
    }

    #[test]
    fn test_validate_withdraw_amount_negative() {
        assert_eq!(validate_withdraw_amount(-1), Err(Error::InvalidAmount));
    }

    #[test]
    fn test_validate_member_percentage_ok() {
        assert!(validate_member_percentage(1).is_ok());
        assert!(validate_member_percentage(50).is_ok());
        assert!(validate_member_percentage(100).is_ok());
    }

    #[test]
    fn test_validate_member_percentage_zero() {
        assert_eq!(validate_member_percentage(0), Err(Error::InvalidInput));
    }

    #[test]
    fn test_validate_member_percentage_over_100() {
        assert_eq!(validate_member_percentage(101), Err(Error::InvalidInput));
    }
}
