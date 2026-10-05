import type { LinkKey } from "@/shared/content/links";
import type { Locale } from "@/shared/i18n/routing";

// Umami events (Phase 6 §6.3.2). Names and props are data, not copy.
export type OutboundTarget =
  | "linkedin"
  | "github"
  | "repo"
  | "appStore"
  | "live"
  | "demo"
  | "source";

export interface AnalyticsEvents {
  cta_view_work: undefined;
  cv_download: { location: "hero" | "contact" };
  email_copy: undefined;
  case_study_open: { slug: string };
  outbound_click: { target: OutboundTarget };
  avatar_wave_click: undefined;
  locale_switch: { to: Locale };
}

export type AnalyticsEvent = keyof AnalyticsEvents;

export type EventArgs<N extends AnalyticsEvent> =
  AnalyticsEvents[N] extends undefined ? [] : [props: AnalyticsEvents[N]];

export type TrackAttrs = { "data-track": AnalyticsEvent } & Record<
  `data-track-${string}`,
  string
>;

// Marks an element for the click listener in tracking-script.ts, the way
// motion() marks it for an effect. Prop keys must be lowercase: HTML
// attribute names are case-insensitive.
export function trackAttrs<N extends AnalyticsEvent>(
  name: N,
  ...args: EventArgs<N>
): TrackAttrs {
  const attrs: Record<string, string> = { "data-track": name };
  const props = (args[0] ?? {}) as Record<string, string>;
  for (const [key, value] of Object.entries(props)) {
    attrs[`data-track-${key}`] = value;
  }
  return attrs as TrackAttrs;
}

// A case study's `github` link is its source, not the GitHub profile.
export const linkTarget: Record<LinkKey, OutboundTarget> = {
  appStore: "appStore",
  live: "live",
  github: "source",
  demo: "demo"
};
