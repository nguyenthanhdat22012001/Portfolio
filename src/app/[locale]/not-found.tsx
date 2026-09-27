import { useTranslations } from "next-intl";
import { Container } from "@/shared/ui/Container";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <Container className="py-section">
      <h1 className="text-3xl font-bold sm:text-4xl">{t("title")}</h1>
      <p className="text-fg-muted mt-4">{t("description")}</p>
    </Container>
  );
}
