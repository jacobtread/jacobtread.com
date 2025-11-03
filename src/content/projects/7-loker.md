---
title: "Loker"
tags: ["Rust", "SQLite", "SQLCipher", "AWS Secret Manager", "Axum", "Docker"]
links: [{ type: "GITHUB", link: "https://github.com/jacobtread/loker" }]
priority: 7
---

**Loker** is a self-hosted AWS secrets manager compatible server. With the main purpose of being used for Integration and End-to-end testing use cases without requiring alternative secret backends.

Data is stored in an encrypted SQLite database using SQLCipher. Server supports using HTTPS and enforces AWS SigV4 signing on requests.
