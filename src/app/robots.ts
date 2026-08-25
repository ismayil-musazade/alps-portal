import type { MetadataRoute } from "next";

/** The portal is private — no search engine should ever index it. */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
