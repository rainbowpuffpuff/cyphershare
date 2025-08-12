use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::{env, near_bindgen, AccountId, PanicOnDefault, Promise, NearToken};
use near_sdk::serde::{Serialize};

// Event structs for logging
#[derive(Serialize)]
#[serde(crate = "near_sdk::serde")]
pub struct LockFundsEvent<'a> {
    pub user: &'a AccountId,
    pub amount: &'a u128,
}

#[derive(Serialize)]
#[serde(crate = "near_sdk::serde")]
pub struct ReportConditionEvent {
    pub condition_met: bool,
}

#[derive(Serialize)]
#[serde(crate = "near_sdk::serde")]
pub struct WithdrawEvent<'a> {
    pub recipient: &'a AccountId,
    pub amount: &'a u128,
}


#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct ConditionalLockupContract {
    pub user_account_id: Option<AccountId>,
    pub beneficiary_id: AccountId,
    pub verifier_account_id: AccountId,
    pub locked_amount: u128,
    pub condition_was_met: Option<bool>,
}

#[near_bindgen]
impl ConditionalLockupContract {
    #[init]
    pub fn new(beneficiary_id: AccountId, verifier_account_id: AccountId) -> Self {
        Self {
            user_account_id: None,
            beneficiary_id,
            verifier_account_id,
            locked_amount: 0,
            condition_was_met: None,
        }
    }

    #[payable]
    pub fn lock_funds(&mut self) {
        assert!(self.user_account_id.is_none(), "Funds are already locked");
        let user = env::predecessor_account_id();
        let amount = env::attached_deposit().as_yoctonear();
        self.user_account_id = Some(user.clone());
        self.locked_amount = amount;
        
        let event = LockFundsEvent {
            user: &user,
            amount: &amount,
        };
        env::log_str(&format!("EVENT_JSON:{}", serde_json::to_string(&event).unwrap()));
    }

    pub fn report_condition(&mut self, condition_met: bool) {
        assert_eq!(
            env::predecessor_account_id(),
            self.verifier_account_id,
            "Only the verifier can report the condition"
        );
        assert!(
            self.condition_was_met.is_none(),
            "The condition has already been reported"
        );
        self.condition_was_met = Some(condition_met);

        let event = ReportConditionEvent {
            condition_met,
        };
        env::log_str(&format!("EVENT_JSON:{}", serde_json::to_string(&event).unwrap()));
    }

    pub fn withdraw(&mut self) {
        assert!(
            self.condition_was_met.is_some(),
            "The condition has not been reported yet"
        );
        let condition_met = self.condition_was_met.unwrap();
        if condition_met {
            let user = self.user_account_id.as_ref().unwrap().clone();
            assert_eq!(
                env::predecessor_account_id(),
                user,
                "Only the user can withdraw the funds"
            );
            Promise::new(user.clone()).transfer(NearToken::from_yoctonear(self.locked_amount));
            
            let event = WithdrawEvent {
                recipient: &user,
                amount: &self.locked_amount,
            };
            env::log_str(&format!("EVENT_JSON:{}", serde_json::to_string(&event).unwrap()));
        } else {
            let beneficiary = self.beneficiary_id.clone();
            assert_eq!(
                env::predecessor_account_id(),
                beneficiary,
                "Only the beneficiary can withdraw the funds"
            );
            Promise::new(beneficiary.clone()).transfer(NearToken::from_yoctonear(self.locked_amount));

            let event = WithdrawEvent {
                recipient: &beneficiary,
                amount: &self.locked_amount,
            };
            env::log_str(&format!("EVENT_JSON:{}", serde_json::to_string(&event).unwrap()));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, get_logs, VMContextBuilder};
    use near_sdk::{testing_env, NearToken};

    fn get_context(predecessor_account_id: AccountId, attached_deposit: NearToken) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder
            .predecessor_account_id(predecessor_account_id)
            .attached_deposit(attached_deposit);
        builder
    }

    #[test]
    fn test_new() {
        let context = get_context(accounts(0), NearToken::from_near(0));
        testing_env!(context.build());
        let contract = ConditionalLockupContract::new(accounts(1), accounts(2));
        assert_eq!(contract.beneficiary_id, accounts(1));
        assert_eq!(contract.verifier_account_id, accounts(2));
    }

    #[test]
    fn test_lock_funds() {
        let context = get_context(accounts(0), NearToken::from_near(10));
        testing_env!(context.build());
        let mut contract = ConditionalLockupContract::new(accounts(1), accounts(2));
        contract.lock_funds();
        assert_eq!(contract.user_account_id, Some(accounts(0)));
        assert_eq!(contract.locked_amount, NearToken::from_near(10).as_yoctonear());

        let expected_log = format!("EVENT_JSON:{}", serde_json::to_string(&LockFundsEvent {
            user: &accounts(0),
            amount: &NearToken::from_near(10).as_yoctonear(),
        }).unwrap());
        assert_eq!(get_logs()[0], expected_log);
    }

    #[test]
    #[should_panic(expected = "Funds are already locked")]
    fn test_lock_funds_twice() {
        let context = get_context(accounts(0), NearToken::from_near(10));
        testing_env!(context.build());
        let mut contract = ConditionalLockupContract::new(accounts(1), accounts(2));
        contract.lock_funds();
        contract.lock_funds();
    }

    #[test]
    fn test_report_condition() {
        let context = get_context(accounts(2), NearToken::from_near(0));
        testing_env!(context.build());
        let mut contract = ConditionalLockupContract::new(accounts(1), accounts(2));
        contract.report_condition(true);
        assert_eq!(contract.condition_was_met, Some(true));

        let expected_log = format!("EVENT_JSON:{}", serde_json::to_string(&ReportConditionEvent {
            condition_met: true,
        }).unwrap());
        assert_eq!(get_logs()[0], expected_log);
    }

    #[test]
    #[should_panic(expected = "Only the verifier can report the condition")]
    fn test_report_condition_not_verifier() {
        let context = get_context(accounts(0), NearToken::from_near(0));
        testing_env!(context.build());
        let mut contract = ConditionalLockupContract::new(accounts(1), accounts(2));
        contract.report_condition(true);
    }

    #[test]
    #[should_panic(expected = "The condition has already been reported")]
    fn test_report_condition_twice() {
        let context = get_context(accounts(2), NearToken::from_near(0));
        testing_env!(context.build());
        let mut contract = ConditionalLockupContract::new(accounts(1), accounts(2));
        contract.report_condition(true);
        contract.report_condition(false);
    }

    #[test]
    fn test_withdraw_condition_met() {
        let context = get_context(accounts(0), NearToken::from_near(10));
        testing_env!(context.build());
        let mut contract = ConditionalLockupContract::new(accounts(1), accounts(2));
        contract.lock_funds();

        testing_env!(get_context(accounts(2), NearToken::from_near(0)).build());
        contract.report_condition(true);

        testing_env!(get_context(accounts(0), NearToken::from_near(0))
            .account_balance(NearToken::from_near(10))
            .build());
        contract.withdraw();

        let expected_log = format!("EVENT_JSON:{}", serde_json::to_string(&WithdrawEvent {
            recipient: &accounts(0),
            amount: &NearToken::from_near(10).as_yoctonear(),
        }).unwrap());
        assert_eq!(get_logs()[0], expected_log);
    }

    #[test]
    fn test_withdraw_condition_not_met() {
        let context = get_context(accounts(0), NearToken::from_near(10));
        testing_env!(context.build());
        let mut contract = ConditionalLockupContract::new(accounts(1), accounts(2));
        contract.lock_funds();

        testing_env!(get_context(accounts(2), NearToken::from_near(0)).build());
        contract.report_condition(false);

        testing_env!(get_context(accounts(1), NearToken::from_near(0))
            .account_balance(NearToken::from_near(10))
            .build());
        contract.withdraw();

        let expected_log = format!("EVENT_JSON:{}", serde_json::to_string(&WithdrawEvent {
            recipient: &accounts(1),
            amount: &NearToken::from_near(10).as_yoctonear(),
        }).unwrap());
        assert_eq!(get_logs()[0], expected_log);
    }

    #[test]
    #[should_panic(expected = "The condition has not been reported yet")]
    fn test_withdraw_before_report() {
        let context = get_context(accounts(0), NearToken::from_near(10));
        testing_env!(context.build());
        let mut contract = ConditionalLockupContract::new(accounts(1), accounts(2));
        contract.lock_funds();
        contract.withdraw();
    }

    #[test]
    #[should_panic(expected = "Only the user can withdraw the funds")]
    fn test_withdraw_condition_met_not_user() {
        let context = get_context(accounts(0), NearToken::from_near(10));
        testing_env!(context.build());
        let mut contract = ConditionalLockupContract::new(accounts(1), accounts(2));
        contract.lock_funds();

        testing_env!(get_context(accounts(2), NearToken::from_near(0)).build());
        contract.report_condition(true);

        testing_env!(get_context(accounts(1), NearToken::from_near(0))
            .account_balance(NearToken::from_near(10))
            .build());
        contract.withdraw();
    }

    #[test]
    #[should_panic(expected = "Only the beneficiary can withdraw the funds")]
    fn test_withdraw_condition_not_met_not_beneficiary() {
        let context = get_context(accounts(0), NearToken::from_near(10));
        testing_env!(context.build());
        let mut contract = ConditionalLockupContract::new(accounts(1), accounts(2));
        contract.lock_funds();

        testing_env!(get_context(accounts(2), NearToken::from_near(0)).build());
        contract.report_condition(false);

        testing_env!(get_context(accounts(0), NearToken::from_near(0))
            .account_balance(NearToken::from_near(10))
            .build());
        contract.withdraw();
    }
}
