import type { APIRoute, APIContext } from "astro";
import { type CollectionEntry, getCollection } from "astro:content";

// Type of a license in the licenses collection
type License = CollectionEntry<"licenses">;

/**
 * Handler for a license request to a license type which
 * replaces the date placeholder when responding with the
 * license
 *
 * @param context The API request context
 * @returns The license text
 */
export const GET: APIRoute = async (context: APIContext): Promise<Response> => {
    const date: string = new Date().getFullYear().toString();
    const body: string = context.props.body.replace("%d", date);

    return new Response(body);
};

/**
 * Static paths definition for all the licenses in the
 * collection of licenses to SSR
 *
 * @returns The collection of licenses
 */
export const getStaticPaths = async () => {
    const licenses: License[] = await getCollection("licenses");
    return licenses.map((license: License) => ({
        params: { id: license.id },
        props: license,
    }));
};
