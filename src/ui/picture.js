/**
 * Builds a <picture> from a derivative base name. AVIF first, WebP fallback, then a
 * plain <img>. The pipeline in scripts/build-assets.mjs generates every source listed
 * here; referencing only the AVIF would break older Safari and Firefox.
 */
export function buildPicture({
  base, widths, alt, sizes = '100vw', jpgWidths = [], loading = 'lazy', width, height,
}) {
  const picture = document.createElement('picture');
  const srcset = (ext, list) => list.map((w) => `./images/${base}-${w}.${ext} ${w}w`).join(', ');

  for (const [type, ext, list] of [['image/avif', 'avif', widths], ['image/webp', 'webp', widths]]) {
    const source = document.createElement('source');
    source.type = type;
    source.srcset = srcset(ext, list);
    source.sizes = sizes;
    picture.append(source);
  }

  const img = document.createElement('img');
  const fallbackExt = jpgWidths.length ? 'jpg' : 'webp';
  const fallbackList = jpgWidths.length ? jpgWidths : widths;
  img.src = `./images/${base}-${fallbackList[fallbackList.length - 1]}.${fallbackExt}`;
  img.srcset = srcset(fallbackExt, fallbackList);
  img.sizes = sizes;
  img.alt = alt;
  img.loading = loading;
  img.decoding = 'async';
  // Optional, and only useful together: a width/height PAIR gives the browser the
  // picture's intrinsic ratio, so it reserves the right box before the bytes land
  // without anyone declaring an aspect-ratio in CSS per image. The callers that omit
  // them get exactly what they got before -- sections.css declares their ratio itself,
  // per section, because those two photographs are different shapes.
  if (Number.isFinite(width) && Number.isFinite(height)) {
    img.width = width;
    img.height = height;
  }
  picture.append(img);
  return picture;
}
