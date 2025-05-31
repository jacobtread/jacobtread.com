---
title: "Docbox"
tags: ["Rust", "Axum", "Postgres", "S3", "AWS", "Terraform", "Typesense", "OpenSearch", "Docker"]
links:
    [
        {
            type: "GITHUB",
            link: "https://github.com/docbox-nz/docbox",
            name: "GitHub",
        },
        { type: "WEBSITE", link: "https://docbox-nz.pages.dev/" },
    ]
priority: 2
image: "/projects/logos/docbox.svg"
span: true
---

**Docbox** is a modern, multi-tenant file management, processing, and search platform designed to seamlessly integrate into your application. It provides powerful capabilities for securely storing, processing, and retrieving documents.

**Docbox** is designed to run **behind your main service**, where your application acts as a **proxy**, forwarding requests to Docbox **after performing authentication and access control**. This keeps the core service secure and private.
