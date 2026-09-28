import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { getRequestConfig } from "next-intl/server";
import { isValidLocale } from "./routing";

// An explicit `locale` (e.g. `getTranslations({ locale })`) wins, for code
// that can't read root params (route handlers, server actions) — the
// opengraph-image routes pass theirs this way.
export default getRequestConfig(async ({ locale: explicitLocale }) => {
  const requested = explicitLocale ?? (await rootLocale());
  if (!isValidLocale(requested)) notFound();

  return {
    locale: requested,
    timeZone: "Asia/Ho_Chi_Minh",
    messages: (await import(`./messages/${requested}.json`)).default
  };
});
