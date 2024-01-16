import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
    site: "https://jacobtread.com",
    integrations: [mdx(), sitemap()],
    markdown: {
        shikiConfig: {
            theme: "dark-plus",
        },
    },
    vite: {
        build: {
            assetsInlineLimit: 10240,
        },
    },
});
