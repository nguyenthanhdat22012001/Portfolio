import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <main>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
    </main>
  );
}
