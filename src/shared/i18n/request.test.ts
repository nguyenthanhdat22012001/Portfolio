import { beforeEach, describe, expect, it, vi } from "vitest";

const rootLocale = vi.fn<() => Promise<string>>();

vi.mock("next/root-params", () => ({ locale: () => rootLocale() }));
vi.mock("next-intl/server", () => ({
  getRequestConfig: <T>(create: T) => create
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  }
}));

const { default: createRequestConfig } = await import("./request");

describe("i18n request config", () => {
  beforeEach(() => {
    rootLocale.mockReset();
  });

  it("reads the locale from the [locale] root param", async () => {
    rootLocale.mockResolvedValue("vi");

    const config = await createRequestConfig({
      requestLocale: Promise.resolve(undefined)
    });

    expect(config.locale).toBe("vi");
    expect(config.messages).toEqual(
      (await import("./messages/vi.json")).default
    );
  });

  it("prefers an explicit locale over the root param", async () => {
    rootLocale.mockResolvedValue("vi");

    const config = await createRequestConfig({
      locale: "en",
      requestLocale: Promise.resolve(undefined)
    });

    expect(config.locale).toBe("en");
    expect(rootLocale).not.toHaveBeenCalled();
  });

  it("404s on an unknown locale", async () => {
    rootLocale.mockResolvedValue("fr");

    await expect(
      createRequestConfig({ requestLocale: Promise.resolve(undefined) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
