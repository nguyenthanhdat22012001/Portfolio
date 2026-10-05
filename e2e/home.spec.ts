import { expect, test } from "@playwright/test";

test("home page renders in English by default", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Nguyen Thanh Dat"
  );
});

test("home page renders in Vietnamese", async ({ page }) => {
  await page.goto("/vi");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Nguyễn Thành Đạt"
  );
});

test("root path redirects to the default locale", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
});

test("an unknown work slug 404s", async ({ page }) => {
  const response = await page.goto("/en/work/does-not-exist");
  expect(response?.status()).toBe(404);
});

for (const locale of ["en", "vi"]) {
  test(`/${locale} puts the meta description in <head>`, async ({
    request
  }) => {
    const html = await (await request.get(`/${locale}`)).text();
    const description = html.indexOf('<meta name="description"');

    expect(description).toBeGreaterThan(-1);
    expect(description).toBeLessThan(html.indexOf("</head>"));
  });

  test(`/${locale} is served as a prerendered static page`, async ({
    request
  }) => {
    const response = await request.get(`/${locale}`);
    expect(response.headers()["cache-control"]).not.toContain("no-store");
  });
}

test("favicon.ico is served", async ({ request }) => {
  const response = await request.get("/favicon.ico");
  expect(response.status()).toBe(200);
});

for (const locale of ["en", "vi"]) {
  test(`/${locale} has exactly one h1`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test(`/${locale} renders the About, Skills, and Contact sections`, async ({
    page
  }) => {
    await page.goto(`/${locale}`);
    for (const id of ["about", "work", "skills", "contact"]) {
      await expect(page.locator(`section#${id} h2`)).toBeVisible();
    }
  });
}

test("the hero CV button downloads /cv.pdf", async ({ page }) => {
  await page.goto("/en");
  const cv = page.locator("#top").getByRole("link", { name: "Download CV" });
  await expect(cv).toHaveAttribute("href", "/cv.pdf");
  await expect(cv).toHaveAttribute("download", "");
});

test("the contact section links to email", async ({ page }) => {
  await page.goto("/en");
  await expect(
    page.locator("#contact").getByRole("link", {
      name: "nguyenthanhdat22012001@gmail.com"
    })
  ).toHaveAttribute("href", "mailto:nguyenthanhdat22012001@gmail.com");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the email is still reachable as a mailto link", async ({ page }) => {
    await page.goto("/en");
    await expect(
      page.locator("#contact").getByRole("link", {
        name: "nguyenthanhdat22012001@gmail.com"
      })
    ).toHaveAttribute("href", "mailto:nguyenthanhdat22012001@gmail.com");
  });

  test("the home page content is fully rendered", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Nguyen Thanh Dat"
    );
    for (const id of ["about", "work", "skills", "contact"]) {
      await expect(page.locator(`section#${id} h2`)).toBeVisible();
    }
  });
});

test("the hero View work button jumps to the work section", async ({
  page
}) => {
  await page.goto("/en");
  await expect(
    page.locator("#top").getByRole("link", { name: "View work" })
  ).toHaveAttribute("href", "#work");
});

test.describe("mobile hero", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("shows the avatar slot above the headline", async ({ page }) => {
    await page.goto("/en");
    const slot = page.locator("#hero-canvas-slot");
    await expect(slot).toBeVisible();
    await expect(slot).toHaveAttribute("aria-hidden", "true");
    const slotBox = await slot.boundingBox();
    const titleBox = await page.locator("h1").boundingBox();
    expect(slotBox?.y ?? Infinity).toBeLessThan(titleBox?.y ?? -Infinity);
  });
});

const aboutTitles = {
  en: "From fresher to mid-level engineer",
  vi: "Từ fresher đến kỹ sư mid-level"
} as const;

for (const locale of ["en", "vi"] as const) {
  test(`/${locale} About shows the title, three stats, and a timeline`, async ({
    page
  }) => {
    await page.goto(`/${locale}`);
    const about = page.locator("section#about");
    await expect(about.locator("h2")).toHaveText(aboutTitles[locale]);
    await expect(about.locator("dl dd")).toHaveCount(3);
    await expect(about.locator("ol li")).toHaveCount(3);
    await expect(about.locator("ol li").first()).toContainText("2022");
  });
}

test("Skills shows the nine CV v2 groups, GraphQL under State & Data", async ({
  page
}) => {
  await page.goto("/en");
  const skills = page.locator("section#skills");
  await expect(skills.locator("h2")).toHaveText("Toolbox");
  await expect(skills.locator("h3")).toHaveCount(9);
  await expect(skills.locator("h3").first()).toHaveText("Languages & Core");
  await expect(skills.locator("h3").last()).toHaveText("Also working with");
  await expect(
    skills.locator("h3", { hasText: "State & Data" }).locator("..")
  ).toContainText("GraphQL");
  await expect(
    skills.locator("li", { hasText: "Next.js (App Router, SSR)" })
  ).toContainText("— this site");
});

test("Vietnamese Skills lists GraphQL under State & dữ liệu", async ({
  page
}) => {
  await page.goto("/vi");
  await expect(
    page
      .locator("section#skills h3", { hasText: "State & dữ liệu" })
      .locator("..")
  ).toContainText("GraphQL");
});

test("Skills group names are translated, tag names are not", async ({
  page
}) => {
  await page.goto("/vi");
  const skills = page.locator("section#skills");
  await expect(skills.locator("h3").first()).toHaveText("Ngôn ngữ & nền tảng");
  await expect(skills).toContainText("TypeScript");
  await expect(skills).toContainText("— chính site này");
});

test.describe("mobile skills", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("keeps the group labels", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("section#skills h3").first()).toBeVisible();
  });
});

test("Contact uses the big two-line heading", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("section#contact h2")).toHaveText(
    "Let's build something fast."
  );
});

test("the contact section links to LinkedIn, GitHub, and the CV", async ({
  page
}) => {
  await page.goto("/en");
  const contact = page.locator("#contact");
  await expect(contact.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
    "href",
    /linkedin\.com/
  );
  await expect(contact.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    /github\.com\/nguyenthanhdat22012001$/
  );
  const cv = contact.getByRole("link", { name: "Download CV" });
  await expect(cv).toHaveAttribute("href", "/cv.pdf");
  await expect(cv).toHaveAttribute("download", "");
});

test("the copy button puts the email on the clipboard", async ({
  page,
  context,
  browserName
}) => {
  test.skip(
    browserName !== "chromium",
    "clipboard permission is Chromium-only in Playwright"
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/en");
  await page
    .locator("#contact")
    .getByRole("button", { name: "Copy email" })
    .click();
  await expect(page.locator("#contact [aria-live]")).toHaveText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "nguyenthanhdat22012001@gmail.com"
  );
});

test("focus rings inside the accent email pill stay visible", async ({
  page
}) => {
  await page.goto("/en");
  const contact = page.locator("#contact");
  for (const control of [
    contact.getByRole("link", { name: "nguyenthanhdat22012001@gmail.com" }),
    contact.getByRole("button", { name: "Copy email" })
  ]) {
    await control.focus();
    const { outline, pill } = await control.evaluate((element) => ({
      outline: getComputedStyle(element).outlineColor,
      pill: getComputedStyle(element.parentElement as HTMLElement)
        .backgroundColor
    }));
    expect(outline).not.toBe(pill);
  }
});

const heroCopy = {
  en: {
    tagline:
      "I build fast, well-structured React apps — and measure the difference.",
    subline:
      "Front-End Engineer · ~4 years building production eCommerce apps for Shopify merchants."
  },
  vi: {
    tagline:
      "Mình xây ứng dụng React nhanh, có cấu trúc — và đo được sự khác biệt.",
    subline:
      "Front-End Engineer · ~4 năm xây ứng dụng eCommerce production cho merchant Shopify."
  }
} as const;

for (const locale of ["en", "vi"] as const) {
  test(`/${locale} hero shows the CV v2 tagline and subline`, async ({
    page
  }) => {
    await page.goto(`/${locale}`);
    const hero = page.locator("#top");
    await expect(hero.getByText(heroCopy[locale].tagline)).toBeVisible();
    await expect(hero.getByText(heroCopy[locale].subline)).toBeVisible();
  });
}

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("About shows its final stats, including 1.5", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("section#about dl dd")).toHaveText([
      "4",
      "3",
      "1.5"
    ]);
    await expect(page.locator("section#about ol li").last()).toContainText(
      "Co-founded SafeBulk"
    );
  });
});
