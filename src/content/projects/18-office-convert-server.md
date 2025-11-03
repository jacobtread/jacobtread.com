---
title: "Office Convert Server"
tags: ["Rust", "Async", "Tokio", "Axum", "Office", "PDF"]
links: [{ type: "GITHUB", link: "https://github.com/jacobtread/office-convert-server" }]
priority: 18
---

This is a HTTP server that allows converting files from the various office file formats (doc, docx, xlsx, ..etc) into PDF files for much easier viewing and preview generation. Uses
the conversion capabilities of LibreOffice and their provided native C++ SDK to perform the conversions. This interaction with LibreOffice is powered by my libreofficesdk Rust library.