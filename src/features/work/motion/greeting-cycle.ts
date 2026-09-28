export interface Greeting {
  text: string;
  lang: string;
}

// template is the raw "counter" message, e.g. "{current} / {total}".
export function greetingAt(
  greetings: readonly Greeting[],
  index: number,
  template: string
): Greeting & { counter: string } {
  const total = greetings.length;
  const wrapped = ((index % total) + total) % total;
  const greeting = greetings[wrapped] ?? { text: "", lang: "" };
  return {
    ...greeting,
    counter: template
      .replace("{current}", String(wrapped + 1))
      .replace("{total}", String(total))
  };
}
