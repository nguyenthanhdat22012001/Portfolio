import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JsonLd } from "./JsonLd";

function renderScript(data: object | object[]) {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(<JsonLd data={data} />);
  return host.querySelectorAll('script[type="application/ld+json"]');
}

describe("JsonLd", () => {
  it("renders one JSON-LD script that parses back to the data", () => {
    const data = [{ "@type": "WebSite", name: "Dat" }];
    const scripts = renderScript(data);
    expect(scripts).toHaveLength(1);
    expect(JSON.parse(scripts[0]!.textContent ?? "")).toEqual(data);
  });

  it("cannot be closed early by content containing </script>", () => {
    const data = { name: "</script><script>alert(1)</script>" };
    const html = renderToStaticMarkup(<JsonLd data={data} />);
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(JSON.parse(renderScript(data)[0]!.textContent ?? "")).toEqual(data);
  });
});
