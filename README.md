# 🏙️ Libre Systems: Autonomous Urban Spatial Assets

> **Notice:** This repository contains the public-facing **React/WebGL frontend architecture** for Libre Systems. The Edge-AI computer vision models, Gaussian Splatting pipelines, and backend Python infrastructure are maintained in a private repository to protect proprietary intellectual property.

## 🚀 The Vision
Libre Systems converts legacy parking infrastructure into 100% accurate, real-time 3D Digital Twins. By combining Edge-AI telemetry with decoupled WebGL rendering, we eliminate urban traffic congestion caused by parking searches and enable frictionless, gateless autonomous parkingcycle.

---

## 🎥 System Walkthrough
*(Drag and drop your golden video file exactly here on the GitHub website!)*

---

## 🏗️ Technical Architecture (Frontend Showcase)
This repository highlights the frontend engineering required to render live spatial telemetry at 60 FPS without memory bloat.

### Core Stack
*   **Framework:** React 18 / Vite / TypeScript
*   **3D Rendering:** WebGL / Gaussian Splatting
*   **State Management:** Decoupled React Refs (Optimized for high-frequency telemetry)
*   **Styling:** Tailwind CSS / shadcn/ui

### Engineering Highlights visible in `/src`:
1.  **Zero-Latency State Sync:** Implemented a custom WebSocket ingestion loop that updates live telemetry via data-isolated React Refs rather than state re-renders, preventing memory crashes during heavy 3D loads.
2.  **Dynamic Capacity Allocation:** Frontend logic to mathematically manage "floating" advance reservations against physical Edge-AI ALPR data.

---

## 🧠 AI & Computer Vision Proof-of-Concept
Because the core Libre Systems Edge-AI node network is closed-source, I have included a dedicated proxy project in the `ai-vision-proof-of-concept/` folder. 

This proxy project demonstrates my end-to-end machine learning pipeline:
1.  **Custom Dataset Generation:** Manual image capture, labeling, and bounding-box annotation of a physical toy car.
2.  **Model Training:** Implementing and training a computer vision model (using Python/PyTorch) from scratch to identify object spatial coordinates.
3.  **Inference:** Live rendering of the model detecting the toy car in real-time.

---
*Developed by Denys | Crissiere, Switzerland*