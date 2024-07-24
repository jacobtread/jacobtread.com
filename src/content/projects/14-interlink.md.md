---
title: "Interlink"
tags: ["Rust", "Async", "Tokio", "Library"]
links: [{ type: "GITHUB", link: "https://github.com/jacobtread/interlink" }]
priority: 14
---

While developing my **Pocket Relay** project I was struggling to maintain a specific structure to all my asynchronous logic as the server was making use of many different types of access and required lots of state to be accessible. Originally I planned on moving the server to the **Actix** actors structure however after multiple attempts this didn't seem like the right solution as it restricted the server heavily. My solution to this was to make my own async framework **Interlink**
