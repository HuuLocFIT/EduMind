# EduMind Platform - Architecture Documentation

Welcome to the EduMind architecture documentation. This section contains C4 Model diagrams that describe the system at different levels of abstraction.

## C4 Model Overview

The [C4 Model](https://c4model.com/) provides a hierarchical way to visualize software architecture:

| Level | Diagram | Description |
|-------|---------|-------------|
| **1** | [System Context](./c4-context.md) | High-level view showing actors and external systems. |
| **2** | [Container Diagram](./c4-container.md) | Shows applications, services, and data stores. |
| **3** | [Component Diagram](./c4-components.md) | Zooms into services to show internal components. |

---

## Quick Navigation

### Level 1: System Context
- **Who uses the system?** Students, Teachers, Administrators.
- **What external systems does it integrate with?** Email, OAuth2, Cloudinary, Payment Gateways.

[View System Context Diagram](./c4-context.md)

---

### Level 2: Container Diagram
- **Frontend**: React User App, Angular Admin App.
- **Backend**: API Gateway, Auth Service, LMS Core Service (Modular Monolith).
- **Data Stores**: PostgreSQL (Auth DB, LMS DB), Redis.

[View Container Diagram](./c4-container.md)

---

### Level 3: Component Diagrams
- **Auth Service Components**: Controllers, JWT Provider, OAuth2 Handler, Email Service.
- **LMS Core Modules**: Course, Enrollment, Review, Payment (with Strategy Pattern for gateways).

[View Component Diagrams](./c4-components.md)

---

## Key Architectural Decisions

1.  **Modular Monolith for LMS Core Service**
    *   **Why?** Minimizes deployment costs while enabling future microservice extraction.
    *   **How?** Uses separate PostgreSQL schemas (active: `course`, `payment`, `ai`; reserved for future: `assessment`, `gamification`, `notification`).

2.  **API Gateway as Single Entry Point**
    *   Centralizes routing, CORS, and rate limiting (Redis-backed).

3.  **JWT-based Stateless Authentication**
    *   Access tokens validated by all services without central session storage.

4.  **Spring Cloud for Service Discovery**
    *   Netflix Eureka enables dynamic service registration and load balancing.
