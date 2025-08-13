# Implementation Plan: Swarm Paywall

This document outlines the necessary architectural changes and implementation steps to pivot the existing application into a Swarm-based paywall system.

### 1. The Core Problem: "Network Error"

The application currently crashes on startup with a "Network Error" because it unconditionally tries to connect to a local Bee node at `http://localhost:1633`. As the Swarm Quickstart guide shows, installing, funding, and syncing a local node is a complex process. It is not a reasonable prerequisite for a user who simply wants to view or download a file.

The current architecture is not robust enough to handle the Bee node being offline, leading to crashes and render loops.

### 2. The Path Forward: Decoupling and Role-Based Architecture

To solve this, we will stop requiring a local node for all users. We will adopt a role-based architecture:

*   **Consumers (Default):** Users who are primarily downloading/viewing content. They will not need a local Bee node. The application will default to using a public Swarm gateway for all read-only operations.
*   **Publishers:** Users who are uploading and managing paywalled content. They **will** need to run their own Bee node and have it funded with xDAI and xBZZ. The application's UI will provide a settings area for them to configure their node's API endpoint and manage postage stamps.

### 3. Next Commit: Immediate Fixes to Stabilize the Application

The goal of the next commit is to make the application stable and usable in a read-only mode without a local Bee node.

1.  **Update Settings (`SettingsContext.tsx`):**
    *   Modify the `swarmNodeUrl` default setting to point to a public gateway, e.g., `https://api.gateway.ethswarm.org`.
    *   Add a new setting, `isPublisher`, which will be a boolean flag (defaulting to `false`).

2.  **Refactor Swarm Hook (`hooks/useSwarm.ts`):**
    *   The hook should use the `swarmNodeUrl` from the settings. By default, it will now connect to the public gateway.
    *   Upload functions (`uploadFile`) should be disabled and throw an error if `isPublisher` is `false`. This prevents consumers from attempting to write to a read-only gateway.

3.  **Update UI Components:**
    *   **`FileUpload.tsx`:** This component should be hidden or disabled if the user is not in "Publisher" mode.
    *   **`SettingsSheet.tsx`:** Add a toggle to switch between "Consumer" and "Publisher" modes. When in "Publisher" mode, the settings to configure the local Bee node URL and manage postage stamps should become visible.

### 4. Future Commits: Implementing the Paywall Functionality

Once the application is stable, we will implement the paywall features as described in `SWARM_PAYWALL.md`.

1.  **Postage Stamp Management UI:**
    *   Create a new component within the `SettingsSheet` for publishers.
    *   This component will use `bee-js` to:
        *   List existing postage stamp batches (`getAllPostageBatch`).
        *   Allow creation of new batches (`buyStorage`), guiding the user on "depth" and "amount" as per the quickstart.
        *   Display the balance of each batch.
        *   Allow the user to select a default postage stamp for uploads.

2.  **Implement `createPaywall` Logic:**
    *   Update the `sendFiles` function in `FileTransferContext.tsx`.
    *   It will now perform the steps from `SWARM_PAYWALL.md`:
        *   Encrypt the file (we will need to implement a simple client-side encryption method first).
        *   Upload the encrypted file to Swarm using the selected postage stamp.
        *   Create a Swarm Feed for the content.
        *   (Future) Deploy the NFT contract and associate it with the feed.

3.  **Blockchain and Listener Service Integration:**
    *   Implement the `purchaseAccess` and `readContent` functions.
    *   Develop the separate Node.js listener service to monitor for NFT purchases and update the Swarm feed's Access Control Trio (ACT).
