import type { Theme } from "./tokens";

export const THEME_STORAGE_KEY = "theme";

export function resolveTheme(
  stored: string | null,
  prefersDark: boolean | null
): Theme {
  if (stored === "dark" || stored === "light") return stored;
  if (prefersDark === false) return "light";
  return "dark";
}

// Inlined in <head> so data-theme is set before first paint. It embeds
// resolveTheme's source, so that function must stay self-contained.
export const themeScript = `(function(){try{var resolve=${resolveTheme.toString()};var stored=null;try{stored=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}var mq=window.matchMedia;var prefersDark=mq?(mq("(prefers-color-scheme: dark)").matches?true:mq("(prefers-color-scheme: light)").matches?false:null):null;document.documentElement.dataset.theme=resolve(stored,prefersDark)}catch(e){}})()`;
