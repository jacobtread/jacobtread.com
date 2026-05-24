import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { shield } from "@jacobtread/astro-shield";

// https://astro.build/config
export default defineConfig({
    site: "https://jacobtread.com",
    integrations: [sitemap(), shield({})],
    markdown: {
        shikiConfig: {
            theme: "dark-plus",
        },
    },
    vite: {
        build: {
            assetsInlineLimit: 10240,
        },
        resolve: {
            alias: [
                { find: "@", replacement: "./src" },
                { find: "@components", replacement: "./src/components" },
                { find: "@layouts", replacement: "./src/layouts" },
                { find: "@assets", replacement: "./src/assets" },
                { find: "@sections", replacement: "./src/sections" },
                { find: "@data", replacement: "./src/data" },
            ],
        },
    },
});
