---
title: "Waver"
tags: ["Rust"]
links: [{ type: "GITHUB", link: "https://github.com/jacobtread/waver" }]
priority: 20
---

Waver is a tool I created for managing my [Wave XLR](https://www.elgato.com/ww/en/p/wave-xlr) under linux. I encountered the frustrating realization that Elgato doesn't officially support Linux, without their software the device defaults to maximum feedback volume upon boot, blasting microphone audio directly into the headphones. To fix this, I built this tool to run as background service and CLI tool that automatically restores my volume and mix settings the moment the USB device is available.
