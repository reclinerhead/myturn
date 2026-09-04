import { create } from "qrcode";

/* Quiet zone the QR spec asks for around the symbol, in modules. Baked
   into the viewBox so the panel around it can't shrink it away. */
const QUIET_ZONE = 4;

/* A QR code as inline SVG, rendered on the server from the encoder's
   module matrix — no PNG, no canvas, no client JS. Modules take
   `currentColor`, so the parent picks the ink. Keep it on a fixed light
   panel: inverted (light-on-dark) codes scan unreliably. */
export function QrCode({ value, label }: { value: string; label: string }) {
  const { modules } = create(value, { errorCorrectionLevel: "M" });
  const size = modules.size;
  let d = "";
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (modules.get(row, col)) d += `M${col} ${row}h1v1h-1z`;
    }
  }
  const box = size + QUIET_ZONE * 2;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${box} ${box}`}
      shapeRendering="crispEdges"
      className="block h-auto w-full"
    >
      <path d={d} fill="currentColor" />
    </svg>
  );
}
