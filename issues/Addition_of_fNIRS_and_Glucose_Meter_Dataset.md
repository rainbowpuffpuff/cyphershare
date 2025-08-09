## 1. Background

This issue tracks the work related to adding a new dataset of fNIRS (Functional Near-Infrared Spectroscopy) data collected concurrently with a glucose meter. The dataset should be comprehensive and include the following metadata for each data point:

*   **Context:** The activity or state of the patient during data collection (e.g., resting, walking, eating).
*   **Timing:** Precise timestamps for synchronization between the fNIRS and glucose meter data.
*   **Date:** The date of data collection.

## 2. Next Steps

The following tasks need to be undertaken based on this new dataset:

### 2.1. Wearable Device Design

*   **Objective:** Design a hand-worn fNIRS wearable that minimizes movement artifacts to ensure high-quality data collection.
*   **Requirements:**
    *   The device must remain stable on the hand during various activities.
    *   Consider using a medical-grade adhesive, similar to those used for invasive sensors, to secure the device and control for light leakage.

### 2.2. Testing and Validation

*   **Objective:** Validate the new wearable design and understand its performance in real-world scenarios.
*   **Tasks:**
    *   Conduct tests to measure the effect of ambient light on the fNIRS sensor while the wearable is worn.
    *   Identify and document specific activities that currently cause the wearable to move.
    *   Define the contexts in which a patient would be expected to wear the fNIRS device alongside an Abbott medical device for simultaneous data collection.

### 2.3. Data Analysis Methodology

*   **Objective:** Ensure the data analysis methodology is robust, reliable, and adheres to industry standards.
*   **Requirements:**
    *   **Data Leakage:** Implement measures to prevent data leakage between training and testing datasets to ensure the reported performance is accurate.
    *   **Performance Reporting:** Establish a clear and standardized protocol for reporting the performance of models trained on this data.
    *   **ISO Standard Conformance:** Review and document the extent to which the data collection and analysis methodology conforms with relevant ISO standards for medical devices and health informatics.