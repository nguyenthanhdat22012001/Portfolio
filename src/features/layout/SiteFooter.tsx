import { getTranslations } from "next-intl/server";
import { site } from "@/shared/lib/site";
import { Container } from "@/shared/ui/Container";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const tContact = await getTranslations("contact");

  const links = [
    { href: `mailto:${site.email}`, label: tContact("email"), external: false },
    { href: site.linkedin, label: tContact("linkedin"), external: true },
    { href: site.github, label: tContact("github"), external: true }
  ];

  return (
    <footer className="border-border border-t">
      <Container className="text-fg-muted flex flex-col gap-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>{t("copyright", { year: new Date().getFullYear() })}</p>
        <ul aria-label={t("social")} className="flex gap-6">
          {links.map(({ href, label, external }) => (
            <li key={href}>
              <a
                href={href}
                className="hover:text-accent"
                {...(external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </footer>
  );
}
