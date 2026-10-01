import { useEffect, useState } from "react";
import { Color } from "three";

function readToken(root: HTMLElement, name: string): string {
  return (
    root.style.getPropertyValue(name).trim() ||
    getComputedStyle(root).getPropertyValue(name).trim()
  );
}

// Theme colors as THREE.Colors, mutated in place on theme change so nothing
// remounts; consumers compare `version` to know when to re-apply.
export class GraphPalette {
  readonly app = new Color();
  readonly feature = new Color();
  readonly shared = new Color();
  version = 0;

  constructor(private readonly root: HTMLElement) {
    this.refresh();
  }

  refresh() {
    const set = (color: Color, name: string) => {
      const value = readToken(this.root, name);
      if (value) color.set(value);
    };
    set(this.app, "--accent");
    set(this.feature, "--silver");
    set(this.shared, "--earth");
    this.version += 1;
  }
}

export function useGraphColors(): GraphPalette {
  const [palette] = useState(() => new GraphPalette(document.documentElement));
  useEffect(() => {
    const observer = new MutationObserver(() => palette.refresh());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });
    return () => observer.disconnect();
  }, [palette]);
  return palette;
}
