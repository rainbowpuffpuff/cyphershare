use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::{env, near_bindgen, AccountId, PanicOnDefault, Promise, NearToken};
use near_sdk::store::IterableMap;
use near_sdk::json_types::U128;

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct StakingContract {
    owner_id: AccountId,
    staked_balances: IterableMap<AccountId, u128>,
    total_staked_balance: u128,
    reward_rate: u8, // Percentage, e.g., 10 for 10%
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
        }
    }

    #[payable]
    pub fn stake(&mut self) {
        let staker = env::predecessor_account_id();
        let amount = env::attached_deposit().as_yoctonear();
        let current_balance = *self.staked_balances.get(&staker).unwrap_or(&0);
        let new_balance = current_balance + amount;
        self.staked_balances.insert(staker, new_balance);
        self.total_staked_balance += amount;
    }

    pub fn unstake(&mut self, amount: U128) {
        let staker = env::predecessor_account_id();
        let amount: u128 = amount.into();
        let current_balance = *self.staked_balances.get(&staker).unwrap_or(&0);
        assert!(current_balance >= amount, "Not enough staked balance to unstake");

        let reward = amount * self.reward_rate as u128 / 100;
        let total_to_transfer = amount + reward;

        assert!(env::account_balance().as_yoctonear() >= self.total_staked_balance + reward, "Not enough funds in contract to pay reward");

        let new_balance = current_balance - amount;
        self.staked_balances.insert(staker.clone(), new_balance);
        self.total_staked_balance -= amount;
        Promise::new(staker).transfer(NearToken::from_yoctonear(total_to_transfer));
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
