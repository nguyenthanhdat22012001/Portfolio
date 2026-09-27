import { notFound } from "next/navigation";

// Unknown paths under a locale render the localized not-found page inside
// the site layout, instead of Next's unbranded root 404.
export default function CatchAllPage() {
  notFound();
}
