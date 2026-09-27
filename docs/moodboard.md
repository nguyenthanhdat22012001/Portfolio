**Design tokens** (CSS variables on `:root` and `[data-theme="dark"]`, mapped to Tailwind):

| Token | Meaning |
| --- | --- |
| `--bg`, `--bg-elevated` | Page background, card background |
| `--fg`, `--fg-muted` | Primary text, secondary text (contrast ≥ 4.5:1) |
| `--accent`, `--accent-fg` | Accent color (single color), text on accent background |
| `--border` | Border |
| `--radius`, `--space-section` | Corner radius, section spacing |

Values ​​finalized based on the moodboard (minimalist yet technical tone; palette of white, gray, slate, silver, dark gold, and earth brown). The "Dat Portfolio" Design System serves as the source of truth—in case of discrepancies, the Design System takes precedence.

| Token | Dark (default) | Light |
| --- | --- | --- |
| `--bg` | `#1A1A1C` | `#F5F4F0` |
| `--bg-elevated` | `#242427` | `#FFFFFF` |
| `--fg` | `#E6E6E3` | `#1F1F21` |
| `--fg-muted` | `#9A9A9A` | `#5E5E5E` |
| `--accent` | `#C9A227` (dark gold) | `#8A6A10` |
| `--accent-fg` | `#1A1A1C` | `#FFFFFF` |
| `--earth` (secondary, 3D nodes) | `#8B5E3C` | `#6E4A2F` |
| `--border` | `#34343A` | `#DDDAD2` |

**Font:** Headings, labels, and numerical data use **Google Sans Code** (monospace, 300–800); body content uses **Open Sans**. Both are implemented via `next/font/google` with `latin` + `vietnamese` subsets. Keep monospace headings concise; apply `letter-spacing: -0.02em` at larger sizes.

**Color rules:** Dark gold is the sole accent color (for buttons, links, and highlights); earth brown is reserved for secondary layers and 3D elements only—do not use it for text.