import { useTranslations } from "next-intl";
import { HeroGraphStatic } from "@/features/hero/graph/HeroGraphStatic";
import { Link } from "@/shared/i18n/navigation";
import { Container } from "@/shared/ui/Container";

// Static SVG only: no canvas, no client JS. One `app` node drifts out of its
// layer (globals.css); it stays still under reduced motion.
export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <Container className="py-section flex flex-col items-start gap-8">
      <div
        aria-hidden="true"
        className="not-found-graph relative aspect-[4/3] w-full max-w-md"
      >
        <HeroGraphStatic state="layered" driftNodeId="admin" />
      </div>
      <h1 className="text-3xl font-bold sm:text-4xl">{t("title")}</h1>
      <Link href="/" className="text-accent font-mono hover:underline">
        {t("backHome")}
      </Link>
    </Container>
  );
}
