// Escaping "<" keeps any content (e.g. a title containing "</script>")
// from closing the script tag; JSON parsers read < back as "<".
export function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
