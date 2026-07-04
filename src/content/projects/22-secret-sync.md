---
title: "Secret-sync"
tags: ["Rust"]
links: [{ type: "GITHUB", link: "https://github.com/jacobtread/crabbyqlite" }]
priority: 21
---

**secret-sync** is a CLI tool for quickly and easily synchronizing local secrets file (`.env` and other configuration files) with remote secrets
manager such [AWS Secret Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html) (or self-hosted alternatives like [Loker](https://github.com/jacobtread/loker))

**secret-sync** supports both pulling secrets out of secret managers and pushing
secrets into secret managers.
