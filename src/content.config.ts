import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";

const blog = defineCollection({
    loader: glob({ base: "./src/content/blog", pattern: "**/*.md" }),
    // Type-check frontmatter using a schema
    schema: z.object({
        title: z.string(),
        description: z.string(),
        // Transform string to Date object
        pubDate: z
            .string()
            .or(z.date())
            .transform((val) => new Date(val)),
        updatedDate: z
            .string()
            .optional()
            .transform((str) => (str ? new Date(str) : undefined)),
        heroImage: z.string().optional(),
        socialImage: z.string().optional(),
    }),
});

/// Maximum possible priority value
const MAX_PRIORITY_VALUE: number = Number.MAX_SAFE_INTEGER;

const projects = defineCollection({
    loader: glob({ base: "./src/content/projects", pattern: "**/*.md" }),
    schema: z.object({
        title: z.string(),
        tags: z.array(z.string()),
        links: z
            .array(
                z.object({
                    type: z.enum(["GITHUB", "WEBSITE"]),
                    link: z.string(),
                    name: z.string().optional(),
                })
            )
            .optional(),
        priority: z.number().optional().default(MAX_PRIORITY_VALUE),
        image: z.string().optional(),
        span: z.boolean().optional(),
    }),
});

const licenses = defineCollection({});

export const collections = { blog, projects, licenses };
