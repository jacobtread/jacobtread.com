![Social Image](public/social.jpg)

# Personal Website

[Deployed Site](https://jacobtread.com)

This is the GitHub repository for my personal website. This website is written using [Astro](https://astro.build/), SCSS, and TypeScript.

## Projects

This website has a list of projects which is loaded from markdown files in the `src/content/projects` directory. Each project markdown file looks like the following:

```md
---
title: "Pocket Relay"
tags: ["Rust", "Axum", "SQLite", "Mass Effect 3", "Game Server", "Docker"]
links:
    [
        {
            type: "GITHUB",
            link: "https://github.com/PocketRelay",
            name: "Project GitHub",
        },
        {
            type: "GITHUB",
            link: "https://github.com/PocketRelay/Server",
            name: "Server GitHub",
        },
        { type: "WEBSITE", link: "https://pocket-relay.pages.dev/" },
    ]
priority: 1
image: "/projects/logos/pocket-relay.svg"
---

**Pocket Relay** is a custom game server emulator for **Mass Effect 3**. The server allows players to host their own servers for the game, enabling things like playing over **LAN** (Local Area Network).

This server includes a dashboard, which allows users to manage the server and even experiment with different in-game items and characters in an environment isolated from the official game servers.

The server is very performant, able to handle many simultaneous connections while using very few resources.
```

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                | Action                                           |
| :--------------------- | :----------------------------------------------- |
| `npm install`          | Installs dependencies                            |
| `npm run dev`          | Starts local dev server at `localhost:3000`      |
| `npm run build`        | Build your production site to `./dist/`          |
| `npm run preview`      | Preview your build locally, before deploying     |
| `npm run astro ...`    | Run CLI commands like `astro add`, `astro check` |
| `npm run astro --help` | Get help using the Astro CLI                     |
