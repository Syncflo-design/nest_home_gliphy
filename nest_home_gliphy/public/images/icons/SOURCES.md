# Tile icon sources

The SVGs in this folder are **placeholders**. Replace them from one of these,
keeping the filenames (`pos.svg`, `ledger.svg`, …) so every tile that names an
icon picks up the new artwork with no code change and nothing re-entered on the
records.

| Source | Notes |
|---|---|
| https://phosphoricons.com | Phosphor — multiple weights, good ERP coverage |
| https://lucide.dev/icons | Lucide — the family the current placeholders imitate |
| https://heroicons.com | Heroicons — outline + solid |
| https://untitledui.com/icons | Untitled UI |
| https://3dicons.co | 3D illustrated — for large/feature tiles only |
| https://animate-ui.com | Animated components and icons |

## Rules

- **One family per surface.** Don't mix Phosphor and Lucide in the same grid.
- Keep stroke weight and corner radius consistent within a set.
- Outline or filled, not both at the same hierarchy level.
- Never emoji as a structural icon — it can't take a colour from the stylesheet
  and renders differently on every platform.
- Square artwork, transparent background. Rendered at 20px (22px on a large
  tile), so SVG is preferred; a PNG needs a 2x asset.
- Dark mode inverts the files in this folder (`filter: invert(1)` in
  `nest_home_gliphy.css`). If you drop in coloured artwork, set it on the tile's
  `icon_image` field instead so it is left alone.
