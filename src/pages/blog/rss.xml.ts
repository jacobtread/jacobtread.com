import rss from "@astrojs/rss";
import { getCollection, type CollectionEntry } from "astro:content";
import { SITE_TITLE, SITE_DESCRIPTION } from "../../consts";
import type { APIContext, APIRoute, EndpointOutput } from "astro";

// Type of a blog entry
type BlogEntry = CollectionEntry<"blog">;

// RSS Feed entry including the blog entry data and a link to the entry
type RssEntry = { link: string } & BlogEntry["data"];

/**
 * Endpoint for an RSS feed based on the contents of the blog
 *
 * @param context The API request context
 * @returns The RSS feed response
 */
export const get: APIRoute = async (
    context: APIContext
): Promise<EndpointOutput> => {
    // Collect all the blog posts
    const posts: BlogEntry[] = await getCollection("blog");

    // Get the site baseurl
    const site: string = context.site?.toString() ?? "https://jacobtread.com";

    // Create the entries from the blog posts
    const items: RssEntry[] = posts.map(
        (post: BlogEntry): RssEntry => ({
            ...post.data,
            link: `/blog/${post.slug}/`,
        })
    );

    return rss({
        title: SITE_TITLE,
        description: SITE_DESCRIPTION,
        site,
        items,
    });
};
