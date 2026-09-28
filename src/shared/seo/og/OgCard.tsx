import { colorTokens } from "@/shared/theme/tokens";

const colors = colorTokens.dark;

interface OgCardProps {
  eyebrow: string;
  title: string;
  name: string;
  host: string;
}

// Rendered by Satori, which supports only inline styles and flexbox: every
// element with more than one child needs an explicit `display: flex`.
export function OgCard({ eyebrow, title, name, host }: OgCardProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "72px 80px",
        backgroundColor: colors.bg,
        color: colors.fg,
        fontFamily: "Open Sans"
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div
          style={{
            width: 96,
            height: 8,
            backgroundColor: colors.accent
          }}
        />
        <div
          style={{
            fontSize: 30,
            color: colors.accent,
            letterSpacing: 2,
            textTransform: "uppercase"
          }}
        >
          {eyebrow}
        </div>
        <div style={{ fontSize: 64, lineHeight: 1.15, maxWidth: 1040 }}>
          {title}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 28,
          color: colors["fg-muted"]
        }}
      >
        <div>{name}</div>
        <div>{host}</div>
      </div>
    </div>
  );
}
