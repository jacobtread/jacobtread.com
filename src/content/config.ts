import { defineCollection, z } from "astro:content";

const blog = defineCollection({
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
