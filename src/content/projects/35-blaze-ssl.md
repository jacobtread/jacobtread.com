---
title: "Blaze SSL"
tags: ["Rust", "SSLv3", "Mass Effect 3"]
links: [{ type: "GITHUB", link: "https://github.com/jacobtread/blaze-ssl" }]
priority: 35
---

Implementation of the SSLv3 protocol in Rust to support the game clients for Mass Effect 3 which are only able to use SSLv3 due to its hardcoded implementation so in order to make it possible for the Rust rewrite of PocketRelay and to introduce the new client app I decided to implement the SSLv3 protocol myself as there aren't any other libraries that support it without modifying key parts of the system such as doing registry edits
