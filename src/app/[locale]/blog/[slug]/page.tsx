export function generateStaticParams() {
  return [];
}

// No static params exist yet, so any requested slug 404s at the routing
// layer before this component renders. Phase 2 wires this up to Velite's
// `blog` collection with real posts.
export const dynamicParams = false;

export default function BlogPostPage() {
  return null;
}
