---
title: "Pocket Relay"
tags: ["Rust", "Axum", "Mass Effect 3", "Game Server", "Docker"]
links:
  [
    { type: "GITHUB", link: "https://github.com/PocketRelay/Server" },
    { type: "WEBSITE", link: "https://pocket-relay.pages.dev/" },
  ]
priority: 1
---

I have started completely rewriting my Pocket Relay game server in Rust which early on showed off great performance improvements along with many benifits over the original Kotlin version. So far I've seen a massive memory usage decrease going from 160mb idle on the Kotlin server to only 3.5mb with two players on the Rust server. This Rust rewrite also removes the requirement of needing a JVM which greatly improves its easy of use and user experience. This version also makes use of my BlazeSSL project which makes it more stable and not depend on operating system SSL implementations for its legacy connections.
