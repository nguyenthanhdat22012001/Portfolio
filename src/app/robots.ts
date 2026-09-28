import type { MetadataRoute } from "next";
import { buildRobots } from "@/shared/seo/robots";

export default function robots(): MetadataRoute.Robots {
  return buildRobots();
}
