/**
 * Builds a <picture> from a derivative base name. AVIF first, WebP fallback, then a
 * plain <img>. The pipeline in scripts/build-assets.mjs generates every source listed
 * here; referencing only the AVIF would break older Safari and Firefox.
 */
export function buildPicture({ base, widths, alt, sizes = '100vw', jpgWidths = [], loading = 'lazy' }) {
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
  picture.append(img);
  return picture;
}
