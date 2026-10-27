# My NBA Feed brand guide

## Decision

On October 27, 2026, Peter selected **Option C — The Feed** as the logo direction for
**My NBA Feed**. Its three horizontal feed bars and curved basketball seams connect
the news feed and basketball parts of the product. The condensed wordmark reads
**My NBA Feed**.

The primary logo is the original selected image, preserved byte for byte under a
stable filename. The earlier first concept and Options A and B are exploration
references, not the chosen identity.

![Primary My NBA Feed logo](../public/branding/my-nba-feed-logo-stacked-dark.png)

## Asset inventory

All files live in [public/branding/](../public/branding/).

| Asset | Dimensions | Intended use |
| --- | --- | --- |
| [Primary stacked dark logo](../public/branding/my-nba-feed-logo-stacked-dark.png) | 1774 × 887 | Default logo for dark presentations and project documentation. Exact copy of selected Option C. |
| [Horizontal dark logo](../public/branding/my-nba-feed-logo-horizontal-dark.png) | 2040 × 771 | Wide placements such as headers and banners. Generated variation with a single-line wordmark. |
| [Stacked light logo](../public/branding/my-nba-feed-logo-stacked-light.png) | 1774 × 887 | Light-background documents and presentations. Amber mark with dark lettering. |
| [Standalone dark mark](../public/branding/my-nba-feed-mark-dark.png) | 1254 × 1254 | Compact square placements and future app-icon preparation. No wordmark. |
| [Browser favicon](../src/app/favicon.ico) | 64 × 64 | PNG-encoded ICO derived from the standalone mark; served at `/favicon.ico`. |

The original selection remains available as
[`my-nba-feed-logo-option-c-the-feed.png`](../public/branding/my-nba-feed-logo-option-c-the-feed.png).

## Usage

- Use the exact wordmark **My NBA Feed**. The current application's short name is
  **NBA Feed**.
- Preserve the three feed bars, curved basketball seams and condensed lettering.
  Use a saved variation rather than rebuilding or stretching the mark.
- Keep the image's aspect ratio and breathing room. Choose the dark or light
  asset for the surrounding surface.
- Intended palette: amber `#FBBF24`, off-white `#FAFAFA`, near-black `#0A0A0A`.
  The generated PNGs are raster artwork; these values describe the design intent.
- The condensed lettering belongs to the logo. Interface typography stays Inter,
  and team-specific colors keep their existing behavior.
- When the wordmark would become too small, prefer the standalone mark and check
  its legibility at the actual display size. Use accessible text **My NBA Feed**
  for a logo that identifies the product.

## Current scope and limitations

The selected logo appears in the README and shared app header. The header uses
`my-nba-feed-logo-stacked-dark.png` through Next.js Image in a 112px × 44px frame;
the original image is preserved and its canvas margins are hidden by CSS. Its
accessible name is **My NBA Feed**, and the logo links to the home page.

`src/app/favicon.ico` is a 64px PNG-encoded ICO made from the standalone mark.
Next.js adds the favicon link through its file-based metadata convention. The
previous favicon has been replaced. Page titles and PWA/home-screen icons have
not been changed.

The source logos are opaque PNGs with baked-in backgrounds and canvas margins.
Transparent and SVG/vector exports have not been prepared. The three generated
derivatives retain the selected visual direction, but are not exact vector
transformations of the master.

To reproduce the favicon from the existing standalone mark with FFmpeg:

```sh
ffmpeg -y -i public/branding/my-nba-feed-mark-dark.png -vf scale=64:64:flags=lanczos -frames:v 1 -pix_fmt rgba -c:v png -f ico src/app/favicon.ico
```

## Generation provenance

The built-in image generation tool created the original Option C and edited that
image to produce each variation. No CLI/API fallback was used. The primary stacked
dark asset is a direct copy of the selected Option C; it was not regenerated.

The original Option C prompt is saved in
[the exploration record](../.impeccable/branding/my-nba-feed-logo-options.md#option-c--the-feed).
The full prompts for the three saved variations follow. Each used
`public/branding/my-nba-feed-logo-option-c-the-feed.png` as its edit target and
requested an opaque background.

### Horizontal dark

Asset: `public/branding/my-nba-feed-logo-horizontal-dark.png`.

```text
Use case: precise-object-edit / logo-brand. The attached image is the user-approved Option C identity for "My NBA Feed". This is a production asset variation of that exact logo, not a new design. Preserve the distinctive three horizontal rounded feed bars and their curved basketball-seam cutouts, the condensed bold typography, and exact brand spelling. Flat clean graphic artwork, sharp edges, solid colors, no texture, gradients, effects, shadows, extra symbols, taglines, or presentation elements. Produce one logo only, with sensible clean margins. Preserve the amber #FBBF24 identity. Change only the arrangement: move the exact words "My NBA Feed" onto a SINGLE horizontal line to the right of the existing amber symbol. Keep the same distinctive condensed bold type shapes. Scale the mark to match the lettering height. Preserve icon geometry without modification. Center the lockup in a wide landscape canvas. Off-white lettering #FAFAFA on an opaque uniform near-black #0A0A0A background. Do not stack the text. No transparency.
```

### Standalone mark

Asset: `public/branding/my-nba-feed-mark-dark.png`.

```text
Use case: precise-object-edit / logo-brand. The attached image is the user-approved Option C identity for "My NBA Feed". This is a production asset variation of that exact logo, not a new design. Preserve the distinctive three horizontal rounded feed bars and their curved basketball-seam cutouts, the condensed bold typography, and exact brand spelling. Flat clean graphic artwork, sharp edges, solid colors, no texture, gradients, effects, shadows, extra symbols, taglines, or presentation elements. Produce one logo only, with sensible clean margins. Preserve the amber #FBBF24 identity. Change only composition: REMOVE ALL lettering entirely, keep ONLY the exact approved amber feed/basketball symbol from the left side of the image. Preserve its three horizontal bars, rounded outer corners, proportions, two horizontal negative-space gaps and curved seam cutouts precisely. Center the standalone symbol on a square opaque near-black #0A0A0A canvas; symbol occupies about 72% of the canvas width and height. Absolutely no text, border, enclosure, tile outline, new shape, or other decoration. No transparency.
```

### Stacked light

Asset: `public/branding/my-nba-feed-logo-stacked-light.png`.

```text
Use case: precise-object-edit / logo-brand. The attached image is the user-approved Option C identity for "My NBA Feed". This is a production asset variation of that exact logo, not a new design. Preserve the distinctive three horizontal rounded feed bars and their curved basketball-seam cutouts, the condensed bold typography, and exact brand spelling. Flat clean graphic artwork, sharp edges, solid colors, no texture, gradients, effects, shadows, extra symbols, taglines, or presentation elements. Produce one logo only, with sensible clean margins. Preserve the amber #FBBF24 identity. Change ONLY the background and wordmark color. Keep the approved original stacked arrangement and symbol geometry exactly: amber symbol at left, "My NBA" on first line at right, "Feed" on second line. Replace the dark background with a uniform opaque off-white #FAFAFA, and replace the white lettering with near-black #0A0A0A. Keep the symbol amber #FBBF24 and turn its black seam cutouts into background-colored negative space. Preserve layout, line breaks, shapes and spacing. No transparency.
```
