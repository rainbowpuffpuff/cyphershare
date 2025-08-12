# Project Tasks & Development Roadmap

This document outlines the core objectives, detailed development tasks, and live progress for the Cyphershare project, referencing the codebase and active branches.

---

### **Overall Progress**

The project is in **Phase 1**, with foundational work split across several key feature branches. The core economic and storage layers are being built in parallel.

---

## **Active Development Branches (Last 10 Days)**

This section provides a detailed look at the branches with the most recent activity, summarizing their purpose and latest changes.

#### **`feature/staking-contract`**
*   **Last Commit:** August 12, 2025
*   **Purpose:** To develop the v1 staking contract on the NEAR protocol.
*   **Latest Changes:** The last commit added a comprehensive unit test suite, a `README.md` with build/test instructions, and configured the `Cargo.toml` to enable testing. This finalized the v1 of the contract.

#### **`dev`**
*   **Last Commit:** August 11, 2025
*   **Purpose:** To serve as the main integration branch for all new features before they are moved to `master`.
*   **Latest Changes:** The last commit was a refactor that removed the `agent-next-boilerplate` submodule and added `GEMINI.md` and `TASKS.md` to the `.gitignore` file.

#### **`issue-6`**
*   **Last Commit:** August 11, 2025
*   **Purpose:** This branch was likely created to address Issue #6.
*   **Latest Changes:** The last commit added the `agent-next-boilerplate` as a submodule. This branch is likely superseded by `feature/staking-contract` and can be considered for deletion.

#### **`python-analysis-and-dataset`**
*   **Last Commit:** August 10, 2025
*   **Purpose:** To handle all data science, analysis, and modeling tasks, particularly for the Biometric (fNIRS) data stream.
*   **Latest Changes:** The last commit was an update to the main `README.md`, providing more context on the project's goal to use Swarm for storage and Shade Agents for verifiable AI.

#### **`feat/replace-codex-with-swarm`**
*   **Last Commit:** August 8, 2025
*   **Purpose:** A major feature branch to replace the "Codex" storage layer with a decentralized solution using "Swarm".
*   **Latest Changes:** The last commit was a large refactor that removed all Codex-related files and replaced them with a new Swarm implementation, including a `useSwarm.ts` hook, a `SwarmContext.tsx`, and new UI components for configuration and debugging.

---

## **Phase 1: Foundational Infrastructure**

### **Core Objective 1 — Establish a Fair Economic Model**

#### **Task: Staking Contract (v1)**
*   **Status:** `[COMPLETED]`
*   **Relevant Branch:** `feature/staking-contract` (PR #8 open, targeting `dev`)
*   **Progress & Key Files:**
    *   A fully functional staking contract has been developed, allowing users to stake NEAR and receive a fixed 10% reward.
    *   The contract is well-tested and documented.
    *   **Key File:** `staking_contract/src/lib.rs` - Contains the complete Rust source code for the contract and its unit tests.
*   **Next Steps:**
    *   Review and merge PR #8 into `dev`.
    *   Address the follow-up issues (#9, #10) to integrate AI-based conditions and deploy the contract.

#### **Task: Economic Modeling & Simulation (Shapley Value)**
*   **Status:** `[IN PROGRESS]`
*   **Relevant Branch:** `python-analysis-and-dataset`
*   **Progress & Key Files:**
    *   The branch contains Python scripts for data analysis and cleaning, which are precursors to implementing the Shapley value algorithm.
    *   **Key Files:**
        *   `data_and_python/memes_glucose.py`: Likely an early script for data analysis.
        *   `data_and_python/clean_cgm.py`: A script for cleaning continuous glucose monitor data.
*   **Next Steps:**
    *   Implement the Shapley value algorithm in a new Python script within this branch.
    *   Develop the Contribution Smart Contract on NEAR to store the output.

---

### **Core Objective 2 — Pioneer Verifiable & Private AI**

#### **Task: Architect Data Paywall & Access Control**
*   **Status:** `[IN PROGRESS]`
*   **Relevant Branches:**
    *   `feat/replace-codex-with-swarm`
    *   `added-taco-based-NFT-encryption-on-amoy`
*   **Progress & Key Files:**
    *   **Swarm Integration:** The `feat/replace-codex-with-swarm` branch has made significant progress in replacing the old "Codex" storage layer.
        *   `hooks/useSwarm.ts`: A React hook to interact with the Swarm network.
        *   `context/SwarmContext.tsx`: Provides Swarm functionality throughout the app.
        *   `components/settings/SwarmConfigPanel.tsx`: A UI component for configuring the Swarm connection.
    *   **NFT Access Control:** The `added-taco-based-NFT-encryption-on-amoy` branch contains the initial work for using NFTs as access tokens.
        *   `hooks/useTaco.ts`: A hook for interacting with the TACO standard.
        *   `context/TacoContext.tsx`: Provides TACO-related state.
*   **Next Steps:**
    *   Merge the Swarm and TACO branches into `dev` to create a unified data paywall.
    *   Develop the listener service that updates Swarm access permissions when a user purchases a NEAR NFT.

#### **Task: Develop Verifiable Training & Scoring Agent (Shade Agent)**
*   **Status:** `[NOT STARTED]`
*   **Relevant Branch:** None yet.
*   **Progress & Key Files:** No work has started on this objective.
*   **Next Steps:**
    *   Create a new branch (e.g., `feature/shade-agent`).
    *   Set up the basic Shade Agent environment and containerize the Shapley scoring script once it's ready.

---

## **Phase 2: Data Stream Integration**

This phase will begin once the core infrastructure from Phase 1 is stable in the `dev` branch.

*   **Data Stream 1 — Biometric (fNIRS):** `[IN PROGRESS]`
    *   **Branch:** `python-analysis-and-dataset`
    *   **Progress:** Data has been collected (`.csv` files) and cleaning scripts have been written.
    *   **Next Steps:** Develop the AI models based on this data.

*   **Data Stream 2 — Civic Action (ZK-Email):** `[NOT STARTED]`
*   **Data Stream 3 — Behavioral (Image Metadata):** `[NOT STARTED]`
    *   **Note:** Issue #10, "Research: Open Source Scaffolds for On-Device AI in Android," is the first step for this data stream.

---
### **Housekeeping Tasks**

*   **Fix `.gitignore`:** `[NOT STARTED]`
    *   **Branch:** `dev` or a new `fix/gitignore` branch.
    *   **Progress:** Issue #11 has been created. The `.gitignore` file is not correctly ignoring build artifacts and other unnecessary files.
    *   **Next Steps:** Add entries for `.next/`, `node_modules/`, and other build outputs to the `.gitignore` file and commit the change to `dev`.