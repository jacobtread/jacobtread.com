---
title: "Blaze SSL Async"
tags: ["Rust", "SSLv3", "Mass Effect 3", "Async", "Tokio"]
links:
    [{ type: "GITHUB", link: "https://github.com/jacobtread/blaze-ssl-async" }]
priority: 4
---

This is the asynchronous implementation of the SSLv3 protocol in Rust to support the game clients for Mass Effect 3 which are only able to use SSLv3 due to its hardcoded implementation so in order to make it possible for the Rust rewrite of PocketRelay and to introduce the new client app I decided to implement the SSLv3 protocol myself as there aren't any other libraries that support it without either compiling from scratch or modifying key parts of the system such as doing registry edits
