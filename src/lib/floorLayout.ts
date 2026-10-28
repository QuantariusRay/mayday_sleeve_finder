/**
 * Top-down floor plan for triangular-prism sleeve racks ("carousels" that don't spin).
 * Each unit is an equilateral triangle; each edge is one shelf face (frame).
 */

export type FloorUnit = {
  id: string;
  /** Triangle center in canvas coords */
  x: number;
  y: number;
  /** Center → vertex distance */
  radius: number;
  /** Degrees; 0 = bottom edge horizontal */
  rotation: number;
  /**
   * Shelf numbers on faces, CCW starting from the bottom edge at rotation 0:
   * [bottom, top-left, top-right]
   */
  faces: [number, number, number];
};

export type FloorLayout = {
  version: 1;
  width: number;
  height: number;
  units: FloorUnit[];
};

const LAYOUT_ATTR = 'data-mayday-layout';

/** Two triangular gondolas — west S4/S5/S6, east S1/S2/S3 — matching seed shelf IDs. */
export const DEFAULT_FLOOR_LAYOUT: FloorLayout = {
  version: 1,
  width: 280,
  height: 160,
  units: [
    {
      id: 'west',
      x: 78,
      y: 78,
      radius: 56,
      rotation: 0,
      faces: [5, 4, 6],
    },
    {
      id: 'east',
      x: 202,
      y: 78,
      radius: 56,
      rotation: 0,
      faces: [3, 2, 1],
    },
  ],
};

type Point = { x: number; y: number };

function deg2rad(d: number) {
  return (d * Math.PI) / 180;
}

/** Equilateral triangle vertices, CCW, index 0 = bottom-right-ish before rotation… */
export function unitVertices(unit: FloorUnit): [Point, Point, Point] {
  // Angles for equilateral: -90° (top), 150° (bottom-left), 30° (bottom-right)
  // so the flat edge faces down when rotation=0.
  const base = [-90, 150, 30].map((a) => a + unit.rotation);
  const pts = base.map((angle) => {
    const r = deg2rad(angle);
    return {
      x: unit.x + unit.radius * Math.cos(r),
      y: unit.y + unit.radius * Math.sin(r),
    };
  }) as [Point, Point, Point];
  return pts;
}

/** Edge midpoints in face order [bottom, top-left, top-right]. */
export function faceMidpoints(unit: FloorUnit): [Point, Point, Point] {
  const [top, bl, br] = unitVertices(unit);
  // Faces: bottom = bl→br, top-left = top→bl, top-right = br→top
  const mid = (a: Point, b: Point): Point => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });
  return [mid(bl, br), mid(top, bl), mid(br, top)];
}

function faceEdges(unit: FloorUnit): Array<[Point, Point]> {
  const [top, bl, br] = unitVertices(unit);
  return [
    [bl, br], // bottom
    [top, bl], // top-left
    [br, top], // top-right
  ];
}

/** Thick parallelogram along an edge (the "frame" / face). */
function faceFramePoints(a: Point, b: Point, inward: Point, thickness: number): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular; pick direction toward inward (center)
  let nx = -dy / len;
  let ny = dx / len;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const toIn = { x: inward.x - mx, y: inward.y - my };
  if (nx * toIn.x + ny * toIn.y < 0) {
    nx = -nx;
    ny = -ny;
  }
  const ox = nx * thickness;
  const oy = ny * thickness;
  const p1 = a;
  const p2 = b;
  const p3 = { x: b.x + ox, y: b.y + oy };
  const p4 = { x: a.x + ox, y: a.y + oy };
  return [p1, p2, p3, p4].map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function serializeFloorLayout(layout: FloorLayout): string {
  return JSON.stringify(layout);
}

export function parseFloorLayout(raw: unknown): FloorLayout | null {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data || data.version !== 1 || !Array.isArray(data.units)) return null;
    if (typeof data.width !== 'number' || typeof data.height !== 'number') return null;
    return data as FloorLayout;
  } catch {
    return null;
  }
}

/** Pull structured layout from generated SVG attribute, if present. */
export function floorLayoutFromSvg(svg: string | null | undefined): FloorLayout | null {
  if (!svg) return null;
  const match = svg.match(/data-mayday-layout="([^"]*)"/);
  if (!match) return null;
  const decoded = match[1]
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
  return parseFloorLayout(decoded);
}

export function resolveFloorLayout(svg: string | null | undefined): FloorLayout {
  return floorLayoutFromSvg(svg) ?? DEFAULT_FLOOR_LAYOUT;
}

/** Render a highlight-friendly SVG (faces carry data-shelf). */
export function floorLayoutToSvg(
  layout: FloorLayout,
  opts?: { highlightShelves?: number[] },
): string {
  const hi = new Set(opts?.highlightShelves ?? []);
  const parts: string[] = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" class="mini" viewBox="0 0 ${layout.width} ${layout.height}" ${LAYOUT_ATTR}="${escapeAttr(serializeFloorLayout(layout))}">`,
  );
  parts.push(
    `<style><![CDATA[
      .core { fill: #e2e8f0; stroke: #94a3b8; stroke-width: 1.5; }
      .face { fill: #f8fafc; stroke: #334155; stroke-width: 1.75; }
      .face.hi { fill: #fde68a; stroke: #f59e0b; stroke-width: 2.5; }
      .lab { font: 700 13px system-ui,sans-serif; fill: #0f172a; text-anchor: middle; dominant-baseline: middle; pointer-events: none; }
      .hub { fill: #64748b; }
      .hub-lab { font: 600 9px system-ui,sans-serif; fill: #fff; text-anchor: middle; dominant-baseline: middle; }
    ]]></style>`,
  );

  for (const unit of layout.units) {
    const verts = unitVertices(unit);
    const poly = verts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    parts.push(`<polygon class="core" points="${poly}" />`);

    const edges = faceEdges(unit);
    const mids = faceMidpoints(unit);
    edges.forEach(([a, b], i) => {
      const shelf = unit.faces[i];
      const cls = hi.has(shelf) ? 'face hi' : 'face';
      const frame = faceFramePoints(a, b, { x: unit.x, y: unit.y }, 14);
      parts.push(
        `<polygon class="${cls}" data-shelf="${shelf}" points="${frame}" />`,
      );
      const mid = mids[i];
      // Nudge label slightly inward toward center
      const lx = mid.x + (unit.x - mid.x) * 0.15;
      const ly = mid.y + (unit.y - mid.y) * 0.15;
      parts.push(
        `<text class="lab" data-shelf="${shelf}" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}">S${shelf}</text>`,
      );
    });

    parts.push(
      `<circle class="hub" cx="${unit.x.toFixed(1)}" cy="${unit.y.toFixed(1)}" r="10" />`,
    );
    parts.push(
      `<text class="hub-lab" x="${unit.x.toFixed(1)}" y="${unit.y.toFixed(1)}">${unit.id === 'west' ? 'A' : unit.id === 'east' ? 'B' : unit.id.slice(0, 1).toUpperCase()}</text>`,
    );
  }

  parts.push('</svg>');
  return parts.join('');
}

export function updateUnit(
  layout: FloorLayout,
  unitId: string,
  patch: Partial<FloorUnit>,
): FloorLayout {
  return {
    ...layout,
    units: layout.units.map((u) => (u.id === unitId ? { ...u, ...patch } : u)),
  };
}

export function setFaceShelf(
  layout: FloorLayout,
  unitId: string,
  faceIndex: 0 | 1 | 2,
  shelf: number,
): FloorLayout {
  return {
    ...layout,
    units: layout.units.map((u) => {
      if (u.id !== unitId) return u;
      const faces = [...u.faces] as [number, number, number];
      // Swap if shelf already on another face of this unit
      const existing = faces.indexOf(shelf);
      if (existing >= 0 && existing !== faceIndex) {
        faces[existing] = faces[faceIndex];
      }
      faces[faceIndex] = shelf;
      return { ...u, faces };
    }),
  };
}

export function clampUnit(layout: FloorLayout, unit: FloorUnit): FloorUnit {
  const pad = unit.radius + 8;
  return {
    ...unit,
    x: Math.min(layout.width - pad, Math.max(pad, unit.x)),
    y: Math.min(layout.height - pad, Math.max(pad, unit.y)),
  };
}
