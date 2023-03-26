import { defineCollection, z } from 'astro:content';

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

const projects = defineCollection({
	schema: z.object({
		title: z.string(),
		tags: z.array(z.string()),
		links: z.array(z.object({
			type: z.enum(["GITHUB", "WEBSITE"]),
			link: z.string(),
			name: z.string().optional(),
		})),
		priority: z.number().optional(),
	})
})

export const collections = { blog, projects };
