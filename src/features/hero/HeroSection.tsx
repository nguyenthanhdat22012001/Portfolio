import { getTranslations } from "next-intl/server";

export async function HeroSection() {
  const t = await getTranslations("hero");

  return (
    <main>
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p>{t("tagline")}</p>
    </main>
  );
}
