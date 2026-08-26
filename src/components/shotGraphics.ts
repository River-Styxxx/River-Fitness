/**
 * Illustrations for the capture slots. Rendered as inline SVG data URIs so
 * there's no image asset and no react-native-svg dependency — the photo path
 * is web-only for now anyway.
 *
 * Not a real 3D model: perspective, layered shading and cast shadow drawn by
 * hand to read as dimensional at thumbnail size. A GLTF viewer would mean a
 * renderer dependency and a runtime cost on every capture screen.
 */
const INK = '#8b96a5';
const LINE = '#4a5568';
const PLATE = '#242c38';
const PLATE_HI = '#2f3947';
const FOOD = '#55c98b';
const FOOD_DARK = '#1e8f5a';
const STEEL = '#c9d1dc';
const STEEL_DARK = '#8b96a5';

function uri(svg: string): string {
  // an SVG with only a viewBox has no intrinsic size, and RN Web's Image needs
  // one to lay the element out — give the root explicit dimensions
  const sized = svg.replace('<svg ', '<svg width="120" height="96" ');
  const flat = sized.replace(/\s+/g, ' ').trim();
  // base64, not ";utf8,": the latter is a non-standard data-URL parameter and
  // React Native Web's Image will not paint it even though a raw <img> does
  const b64 =
    typeof btoa === 'function'
      ? btoa(flat)
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).Buffer.from(flat, 'utf8').toString('base64');
  return `data:image/svg+xml;base64,${b64}`;
}

/** Camera directly overhead, plate seen as a true circle. */
export const topDownGraphic = uri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 96">
  <defs>
    <radialGradient id="pt" cx="42%" cy="34%" r="72%">
      <stop offset="0" stop-color="${PLATE_HI}"/><stop offset="1" stop-color="${PLATE}"/>
    </radialGradient>
    <linearGradient id="ft" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${FOOD}"/><stop offset="1" stop-color="${FOOD_DARK}"/>
    </linearGradient>
  </defs>

  <!-- camera, straight above -->
  <rect x="52" y="6" width="16" height="11" rx="3" fill="${STEEL_DARK}"/>
  <rect x="57" y="3" width="6" height="4" rx="1.5" fill="${STEEL_DARK}"/>
  <circle cx="60" cy="11.5" r="3.4" fill="${PLATE}"/>
  <circle cx="60" cy="11.5" r="1.5" fill="${STEEL}"/>
  <!-- sight line straight down -->
  <path d="M60 19 L60 40" stroke="${LINE}" stroke-width="1.6" stroke-dasharray="3 3"/>
  <path d="M56.5 36 L60 41 L63.5 36" fill="none" stroke="${LINE}" stroke-width="1.6"/>

  <!-- plate, true circle from overhead -->
  <ellipse cx="60" cy="70" rx="31" ry="20.5" fill="none"/>
  <circle cx="60" cy="70" r="21" fill="url(#pt)" stroke="${LINE}" stroke-width="1.2"/>
  <circle cx="60" cy="70" r="16" fill="none" stroke="${LINE}" stroke-width="0.8" opacity="0.7"/>
  <!-- food from above -->
  <circle cx="55" cy="66" r="6.5" fill="url(#ft)"/>
  <circle cx="65" cy="72" r="5" fill="${FOOD_DARK}"/>
  <circle cx="57" cy="76" r="3.6" fill="${FOOD}" opacity="0.85"/>

  <!-- fork left, knife right, seen from above -->
  <g stroke="${STEEL}" stroke-width="1.6" stroke-linecap="round">
    <path d="M30 62 L30 80"/><path d="M27 62 L27 68"/><path d="M33 62 L33 68"/>
  </g>
  <path d="M90 61 L90 80" stroke="${STEEL_DARK}" stroke-width="2.4" stroke-linecap="round"/>
</svg>`);

/** Camera raised ~45 degrees, plate seen as an ellipse with height and shadow. */
export const angleGraphic = uri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 96">
  <defs>
    <linearGradient id="pa" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${PLATE_HI}"/><stop offset="1" stop-color="${PLATE}"/>
    </linearGradient>
    <linearGradient id="fa" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="${FOOD}"/><stop offset="1" stop-color="${FOOD_DARK}"/>
    </linearGradient>
  </defs>

  <!-- camera up and to the left, tilted -->
  <g transform="rotate(38 26 20)">
    <rect x="18" y="14" width="16" height="11" rx="3" fill="${STEEL_DARK}"/>
    <rect x="23" y="11" width="6" height="4" rx="1.5" fill="${STEEL_DARK}"/>
    <circle cx="26" cy="19.5" r="3.4" fill="${PLATE}"/>
    <circle cx="26" cy="19.5" r="1.5" fill="${STEEL}"/>
  </g>
  <!-- sight line down at 45 -->
  <path d="M37 30 L57 55" stroke="${LINE}" stroke-width="1.6" stroke-dasharray="3 3"/>
  <path d="M51 50 L58 56 L52 58" fill="none" stroke="${LINE}" stroke-width="1.6"/>
  <!-- angle arc against the horizontal -->
  <path d="M46 62 A 22 22 0 0 0 40 47" fill="none" stroke="${LINE}" stroke-width="1" opacity="0.8"/>

  <!-- cast shadow -->
  <ellipse cx="63" cy="80" rx="33" ry="7" fill="#000" opacity="0.28"/>
  <!-- plate rim in perspective, with thickness -->
  <path d="M30 72 A 33 11 0 0 0 96 72 L96 76 A 33 11 0 0 1 30 76 Z" fill="${FOOD_DARK}" opacity="0.25"/>
  <ellipse cx="63" cy="72" rx="33" ry="11" fill="url(#pa)" stroke="${LINE}" stroke-width="1.2"/>
  <ellipse cx="63" cy="71" rx="24" ry="7.5" fill="none" stroke="${LINE}" stroke-width="0.8" opacity="0.7"/>
  <!-- food with height -->
  <path d="M50 70 a 9 6 0 0 1 18 0 a 9 5 0 0 1 -18 0 Z" fill="url(#fa)"/>
  <ellipse cx="59" cy="65.5" rx="9" ry="5.5" fill="${FOOD}"/>
  <ellipse cx="74" cy="71" rx="7" ry="4.5" fill="${FOOD_DARK}"/>

  <!-- fork laid across the plate for scale, in perspective -->
  <g stroke="${STEEL}" stroke-width="1.8" stroke-linecap="round">
    <path d="M84 82 L100 66"/>
    <path d="M99 63 L103 67"/><path d="M96 62 L100 66"/>
  </g>
</svg>`);

/** A nutrition facts panel, held at a slight angle. */
export const labelGraphic = uri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 96">
  <defs>
    <linearGradient id="pl" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e8ecf2"/><stop offset="1" stop-color="#b9c2ce"/>
    </linearGradient>
  </defs>
  <ellipse cx="62" cy="84" rx="30" ry="6" fill="#000" opacity="0.28"/>
  <!-- panel, tilted, with an edge to give it thickness -->
  <g transform="rotate(-7 60 48)">
    <rect x="41" y="16" width="42" height="60" rx="3" fill="${LINE}" opacity="0.6"/>
    <rect x="38" y="14" width="42" height="60" rx="3" fill="url(#pl)"/>
    <rect x="42" y="19" width="34" height="4.5" rx="1" fill="#11151d"/>
    <g stroke="#11151d" stroke-width="1.6" opacity="0.85">
      <path d="M42 28.5 H76"/><path d="M42 33 H68"/>
    </g>
    <g stroke="#4a5568" stroke-width="1.1">
      <path d="M42 39 H76"/><path d="M42 44 H70"/><path d="M42 49 H74"/>
      <path d="M42 54 H66"/><path d="M42 59 H72"/><path d="M42 64 H63"/>
    </g>
    <path d="M42 68.5 H76" stroke="#11151d" stroke-width="2"/>
  </g>
  <!-- camera, small, off to the side -->
  <g opacity="0.9">
    <rect x="12" y="30" width="14" height="10" rx="3" fill="${STEEL_DARK}"/>
    <rect x="16.5" y="27.5" width="5" height="3.5" rx="1.4" fill="${STEEL_DARK}"/>
    <circle cx="19" cy="35" r="3" fill="${PLATE}"/><circle cx="19" cy="35" r="1.3" fill="${STEEL}"/>
  </g>
  <path d="M28 35 L38 38" stroke="${LINE}" stroke-width="1.4" stroke-dasharray="3 3"/>
</svg>`);
