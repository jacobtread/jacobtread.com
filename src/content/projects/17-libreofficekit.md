---
title: "LibreOfficeKit"
tags: ["Rust", "Converter", "Office", "PDF"]
links: [{ type: "GITHUB", link: "https://github.com/jacobtread/libreofficekit" }]
priority: 17
---

This is a Rust library providing access to the LibreOffice native C++ SDK, allowing you
to perform a variety of tasks such as converting office documents to various formats, signing documents, along with pulling information from LibreOffice. As apposed to alternative implementations this library provides a safe to access implementation with
correct locks and safety gates in place.