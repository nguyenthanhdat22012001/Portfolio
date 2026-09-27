export function generateStaticParams() {
  return [];
}

// No static params exist yet, so any requested slug 404s at the routing
// layer before this component renders. Phase 2 wires this up to Velite's
// `work` collection with real case studies.
export const dynamicParams = false;

export default function WorkCaseStudyPage() {
  return null;
}
