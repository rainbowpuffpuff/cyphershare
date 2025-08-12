use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::{env, near_bindgen, AccountId, PanicOnDefault, Promise, NearToken};
use near_sdk::store::IterableMap;
use near_sdk::json_types::U128;
use primitive_types::U256;

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct StakingContract {
    owner_id: AccountId,
    staked_balances: IterableMap<AccountId, u128>,
    total_staked_balance: u128,
    reward_rate: u8, // Percentage, e.g., 10 for 10%
    is_unstaking_locked: bool,
}

#[near_bindgen]
impl StakingContract {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        Self {
            owner_id,
            staked_balances: IterableMap::new(b"s"),
            total_staked_balance: 0,
            reward_rate: 10, // 10% reward
            is_unstaking_locked: false,
        }
    }

    pub fn set_reward_rate(&mut self, new_rate: u8) {
        assert_eq!(env::predecessor_account_id(), self.owner_id, "Only owner can set reward rate");
        self.reward_rate = new_rate;
    }

    #[payable]
    pub fn stake(&mut self) {
        let staker = env::predecessor_account_id();
        let amount = env::attached_deposit().as_yoctonear();
        let current_balance = *self.staked_balances.get(&staker).unwrap_or(&0);
        let new_balance = current_balance + amount;
        self.staked_balances.insert(staker.clone(), new_balance);
        self.total_staked_balance += amount;
        env::log_str(&format!("EVENT_JSON:{{ \"standard\": \"nep297\", \"version\": \"1.0.0\", \"event\": \"stake\", \"data\": [{{ \"staker\": \"{}\", \"amount\": \"{}\" }}] }}", staker, amount));
    }

    pub fn unstake(&mut self, amount: U128) {
        assert!(!self.is_unstaking_locked, "Unstaking is currently locked");
        self.is_unstaking_locked = true;

        let staker = env::predecessor_account_id();
        let amount: u128 = amount.into();
        let current_balance = *self.staked_balances.get(&staker).unwrap_or(&0);
        assert!(current_balance >= amount, "Not enough staked balance to unstake");

        let reward = (U256::from(amount) * U256::from(self.reward_rate)) / U256::from(100);
        let reward: u128 = reward.as_u128();
        let total_to_transfer = amount + reward;

        assert!(env::account_balance().as_yoctonear() >= self.total_staked_balance + reward, "Not enough funds in contract to pay reward");

        let new_balance = current_balance - amount;
        self.staked_balances.insert(staker.clone(), new_balance);
        self.total_staked_balance -= amount;
        Promise::new(staker.clone()).transfer(NearToken::from_yoctonear(total_to_transfer));
        env::log_str(&format!("EVENT_JSON:{{ \"standard\": \"nep297\", \"version\": \"1.0.0\", \"event\": \"unstake\", \"data\": [{{ \"staker\": \"{}\", \"amount\": \"{}\" }}] }}", staker, amount));
        self.is_unstaking_locked = false;
    }

    #[payable]
    pub fn deposit_funds(&mut self) {
        assert_eq!(env::predecessor_account_id(), self.owner_id, "Only owner can deposit funds");
    }

    pub fn withdraw_funds(&mut self, amount: U128) {
        assert_eq!(env::predecessor_account_id(), self.owner_id, "Only owner can withdraw funds");
        let amount: u128 = amount.into();
        let available_balance = env::account_balance().as_yoctonear() - self.total_staked_balance;
        assert!(available_balance >= amount, "Not enough available funds to withdraw");
        Promise::new(self.owner_id.clone()).transfer(NearToken::from_yoctonear(amount));
    }

    pub fn get_staked_balance(&self, account_id: AccountId) -> U128 {
        U128(*self.staked_balances.get(&account_id).unwrap_or(&0))
    }

    pub fn get_total_staked_balance(&self) -> U128 {
        U128(self.total_staked_balance)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
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
        let contract = StakingContract::new(accounts(0));
        assert_eq!(contract.owner_id, accounts(0));
        assert_eq!(contract.reward_rate, 10);
    }

    #[test]
    fn test_stake() {
        let context = get_context(accounts(1), NearToken::from_near(10));
        testing_env!(context.build());
        let mut contract = StakingContract::new(accounts(0));
        contract.stake();
        assert_eq!(contract.get_staked_balance(accounts(1)).0, NearToken::from_near(10).as_yoctonear());
        assert_eq!(contract.total_staked_balance, NearToken::from_near(10).as_yoctonear());
    }

    #[test]
    fn test_unstake() {
        let context = get_context(accounts(1), NearToken::from_near(10));
        testing_env!(context.build());
        let mut contract = StakingContract::new(accounts(0));
        
        // Deposit funds for rewards
        testing_env!(get_context(accounts(0), NearToken::from_near(10)).build());
        contract.deposit_funds();

        // Stake
        testing_env!(get_context(accounts(1), NearToken::from_near(10)).build());
        contract.stake();

        // Unstake
        testing_env!(get_context(accounts(1), NearToken::from_near(0))
            .account_balance(NearToken::from_near(21)) // contract needs funds to pay reward
            .build());
        contract.unstake(U128(NearToken::from_near(10).as_yoctonear()));
        assert_eq!(contract.get_staked_balance(accounts(1)).0, 0);
        assert_eq!(contract.total_staked_balance, 0);
    }

    #[test]
    #[should_panic(expected = "Not enough staked balance to unstake")]
    fn test_unstake_not_enough_balance() {
        let context = get_context(accounts(1), NearToken::from_near(10));
        testing_env!(context.build());
        let mut contract = StakingContract::new(accounts(0));
        contract.unstake(U128(NearToken::from_near(10).as_yoctonear()));
    }

    #[test]
    #[should_panic(expected = "Only owner can deposit funds")]
    fn test_deposit_funds_not_owner() {
        let context = get_context(accounts(1), NearToken::from_near(10));
        testing_env!(context.build());
        let mut contract = StakingContract::new(accounts(0));
        contract.deposit_funds();
    }

    #[test]
    #[should_panic(expected = "Only owner can withdraw funds")]
    fn test_withdraw_funds_not_owner() {
        let context = get_context(accounts(1), NearToken::from_near(10));
        testing_env!(context.build());
        let mut contract = StakingContract::new(accounts(0));
        contract.withdraw_funds(U128(1));
    }

    #[test]
    fn test_set_reward_rate() {
        let context = get_context(accounts(0), NearToken::from_near(0));
        testing_env!(context.build());
        let mut contract = StakingContract::new(accounts(0));
        contract.set_reward_rate(20);
        assert_eq!(contract.reward_rate, 20);
    }

    #[test]
    #[should_panic(expected = "Only owner can set reward rate")]
    fn test_set_reward_rate_not_owner() {
        let context = get_context(accounts(1), NearToken::from_near(0));
        testing_env!(context.build());
        let mut contract = StakingContract::new(accounts(0));
        contract.set_reward_rate(20);
    }

    #[test]
    fn test_unstake_with_reward_precision() {
        let context = get_context(accounts(0), NearToken::from_near(10));
        testing_env!(context.build());
        let mut contract = StakingContract::new(accounts(0));
        contract.deposit_funds();

        testing_env!(get_context(accounts(1), NearToken::from_near(10)).build());
        contract.stake();

        testing_env!(get_context(accounts(0), NearToken::from_near(0))
            .account_balance(NearToken::from_near(21))
            .build());
        contract.set_reward_rate(15); // 15% reward

        let unstake_amount = NearToken::from_near(10).as_yoctonear();
        testing_env!(get_context(accounts(1), NearToken::from_near(0))
            .account_balance(NearToken::from_near(21))
            .build());
        contract.unstake(U128(unstake_amount));
        
        let final_staked_balance = contract.get_staked_balance(accounts(1));
        assert_eq!(final_staked_balance.0, 0);
    }

    #[test]
    #[should_panic(expected = "Unstaking is currently locked")]
    fn test_unstake_locked() {
        let context = get_context(accounts(1), NearToken::from_near(10));
        testing_env!(context.build());
        let mut contract = StakingContract::new(accounts(0));
        
        testing_env!(get_context(accounts(0), NearToken::from_near(10)).build());
        contract.deposit_funds();

        testing_env!(get_context(accounts(1), NearToken::from_near(10)).build());
        contract.stake();

        // Manually lock the contract to simulate a re-entrant call
        contract.is_unstaking_locked = true;

        testing_env!(get_context(accounts(1), NearToken::from_near(0))
            .account_balance(NearToken::from_near(21))
            .build());
        contract.unstake(U128(NearToken::from_near(10).as_yoctonear()));
    }
}
