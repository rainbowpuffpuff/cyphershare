# A Verifiable AI Platform

## 1. Mission & Vision

### Mission Statement
To build a decentralized platform for an AI Ownership Economy. The system will enable individuals and organizations to contribute diverse data types, receive a verifiable share of the IP in the AI models created, and benefit from the resulting scientific, civic, and commercial applications.

### Vision
The platform will be a multi-modal data cooperative, launching with three distinct data streams to prove its versatility: Biometric Data (fNIRS), Civic Action Data (ZK-Email), and Behavioral Data (Image Metadata & ZK Mopro).

### Core Objectives
- **Develop a Multi-Modal B2B Data & AI Platform:** Create tools that solve data scarcity across multiple high-value domains.
- **Pioneer Verifiable & Private AI:** Engineer a trustless, on-chain chain of evidence from raw data to model output, with a clear path towards privacy-preserving computation using FHE.
- **Establish a Fair Economic Model:** Implement a verifiable system for algorithmically scoring data contributions and distributing IP/revenue.

## 2. Project Scope: Multi-Modal Data Streams
The platform is being developed with three initial data streams to demonstrate its capabilities:

- **Data Stream 1 (Biometric - fNIRS):** Researching fNIRS data collection methodologies and building models. The code for this stream is the primary content of the repository in its current state.
- **Data Stream 2 (Civic Action - ZK-Email):** Developing a system for verifiably rewarding pro-healthcare advocacy using on-device AI and ZK proofs.
- **Data Stream 3 (Behavioral - Image Metadata):** Designing a feature to incentivize positive sleep habits using on-device AI and ZK Mopro.

## 3. Technical Architecture
The architecture is designed for verifiability, privacy, and fair value attribution.

### Core Technology Stack:
- **Frontend/Mobile:** Next.js
- **Decentralized Storage:** Swarm
- **Blockchain & Verifiable Compute:** NEAR Protocol and Shade Agents
- **ZK Proving Systems:** ZK-Email, EZKL, ZK Mopro
- **Privacy-Preserving Tech (Future):** Fully Homomorphic Encryption (FHE)

### Verifiable AI & Contribution Scoring Engine:
The core of the platform is a system that provides a chain of evidence for both model accuracy and fair economic distribution. This is achieved using Shade Agents on NEAR, which run containerized Python scripts (for model training and scoring) in a Trusted Execution Environment (TEE). Contribution value is calculated using a Shapley value algorithm, ensuring a trustless and fair record of data value.

## 4. Project Status & Repository Purpose
This repository is being repurposed to serve as the development hub for the Verifiable AI Platform described above. Initially, it housed a secure file-sharing application (see "Original Project Context" below). The focus has now shifted entirely to the new platform's goals.

Currently, the repository contains the foundational code for **Data Stream 1 (Biometric - fNIRS)**. The primary work is located in the `data_and_python` directory, which includes scripts for data analysis and machine learning.

For instructions on how to run the fNIRS data analysis pipeline, please refer to the detailed guide in the `data_and_python/README.md` file.

## 5. License
This project is licensed under the MIT License.

<details>
<summary>Original Project Context: Secure File Sharing Application</summary>

# FileShare - Secure File Sharing Application

A secure file sharing application built with Next.js, React, and TailwindCSS that integrates with Swarm and Waku protocols.

## Features

- Secure file sharing with end-to-end encryption
- Integration with Swarm and Waku protocols
- Real-time status monitoring of Swarm and Waku nodes
- Customizable API endpoints
- Modern, responsive UI with dark mode
- Optional client-side encryption powered by TACo with customizable on-chain access conditions
- Seamless Ethereum wallet connectivity (MetaMask) for signing encryption/decryption operations

## Swarm Integration

The application integrates with Swarm Bee nodes through a dedicated client implementation. The integration includes:

- Real-time status monitoring of Swarm nodes
- Customizable API endpoint and Postage Batch ID configuration
- Visual indicators for node status (active/inactive)
- Error handling and reporting

### Swarm Client Architecture

The Swarm integration is implemented using a modular architecture:

1. **SwarmClient Class and useSwarm Hook** (`hooks/useSwarm.ts`):

   - Contains the complete Swarm implementation in a single file
   - Handles all API requests to Swarm nodes using `@ethersphere/bee-js`
   - Manages node status checking and caching
   - Provides methods for interacting with Swarm APIs (upload, download)
   - Implements React hook for using the Swarm client in components
   - Manages state for node status, loading, and errors
   - Provides methods for updating the API endpoint and Postage Batch ID

2. **UI Integration**:
   - Visual indicators for node status
   - Form for configuring the API endpoint and Postage Batch ID
   - Error reporting and status messages

## TACo Encryption & Access Control

The application uses **[TACo](https://github.com/nucypher/taco-web)** for client-side encryption and on-chain access control. The integration is encapsulated in `hooks/useTaco.ts` and is tightly coupled with the file-upload flow.

Key points:
- Files/plaintexts are encrypted in the browser _before_ they are uploaded to Swarm or transmitted via Waku – i.e. only ciphertexts ever leave the client.
- Decryption happens on-demand when the data consumer/recipient pings a cohort of TACo nodes. Decryption material is only provisioned when the data consumer (in this example, authenticated via the signature of a connected wallet) satisfies the pre-specified TACo **Conditions**.
- Helper utilities are provided for two starter TACo conditions types: 
  - **Positive balance** of POL (Polygon Amoy).
  - **Time-limited** access (N seconds from upload).
- You can define any arbitrary on-chain condition by instantiating a TACo `Condition` in your code – see TACo [docs](https://docs.taco.build/conditions) for more condition logic and types. 
- Wallet connectivity (handled transparently by `WalletProvider` and the **Connect Wallet** button) is only required to sign TACo encryption/decryption requests and authenticate the data producer and consumer respectively. 
- You can define various authentication methods and [combine](https://docs.taco.build/authentication/conditioncontext-and-context-variables) them with conditions, including Sign In With Ethereum and even off-chain identities. 

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Configuration

### Swarm Node

By default, the application connects to a Swarm Bee node at `http://localhost:1633`. You will also need to provide a valid Postage Batch ID. You can change these in the settings panel.

### Waku Node

By default, the application connects to a Waku node at `http://127.0.0.1:8645`. You can change this in the settings panel.

### Ethereum Network

The application targets the **Polygon Amoy** testnet (`80002`). If your MetaMask wallet is on a different network, the app will automatically request to add/switch to the correct network.

## License

MIT

</details>
