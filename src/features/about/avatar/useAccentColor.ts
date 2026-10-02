import { useEffect, useState } from "react";
import { Color } from "three";

// --accent as a THREE.Color, mutated in place on theme change so nothing
// remounts; readers compare `version` to know when to re-apply. About's own
// copy of the Hero's useGraphColors idea (features/about can't import hero).
export class AccentColor {
  readonly color = new Color();
  version = 0;

  refresh(root: HTMLElement = document.documentElement) {
    const value =
      root.style.getPropertyValue("--accent").trim() ||
      getComputedStyle(root).getPropertyValue("--accent").trim();
    if (value) this.color.set(value);
    this.version += 1;
  }
}

export function useAccentColor(): AccentColor {
  const [accent] = useState(() => {
    const created = new AccentColor();
    created.refresh();
    return created;
  });
  useEffect(() => {
    const observer = new MutationObserver(() => accent.refresh());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });
    return () => observer.disconnect();
  }, [accent]);
  return accent;
}
