import { useCallback, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Polygon, Text as SvgText } from 'react-native-svg';
import {
  clampUnit,
  faceMidpoints,
  setFaceShelf,
  unitVertices,
  updateUnit,
  type FloorLayout,
  type FloorUnit,
} from '../lib/floorLayout';

type Props = {
  layout: FloorLayout;
  onChange: (next: FloorLayout) => void;
  accent?: string;
};

function faceFramePoints(
  a: { x: number; y: number },
  b: { x: number; y: number },
  inward: { x: number; y: number },
  thickness: number,
): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
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
  return [
    `${a.x},${a.y}`,
    `${b.x},${b.y}`,
    `${b.x + ox},${b.y + oy}`,
    `${a.x + ox},${a.y + oy}`,
  ].join(' ');
}

function UnitGraphic({
  unit,
  selected,
  selectedFace,
  onSelectFace,
}: {
  unit: FloorUnit;
  selected: boolean;
  selectedFace: number | null;
  onSelectFace: (faceIndex: 0 | 1 | 2) => void;
}) {
  const verts = unitVertices(unit);
  const [top, bl, br] = verts;
  const edges: Array<[{ x: number; y: number }, { x: number; y: number }]> = [
    [bl, br],
    [top, bl],
    [br, top],
  ];
  const mids = faceMidpoints(unit);
  const core = verts.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <>
      <Polygon
        points={core}
        fill={selected ? '#cbd5e1' : '#e2e8f0'}
        stroke="#94a3b8"
        strokeWidth={1.5}
      />
      {edges.map(([a, b], i) => {
        const shelf = unit.faces[i];
        const active = selected && selectedFace === i;
        const mid = mids[i];
        const lx = mid.x + (unit.x - mid.x) * 0.15;
        const ly = mid.y + (unit.y - mid.y) * 0.15;
        return (
          <Polygon
            key={`${unit.id}-f${i}`}
            points={faceFramePoints(a, b, { x: unit.x, y: unit.y }, 14)}
            fill={active ? '#fde68a' : '#f8fafc'}
            stroke={active ? '#f59e0b' : '#334155'}
            strokeWidth={active ? 2.5 : 1.75}
            onPress={() => onSelectFace(i as 0 | 1 | 2)}
          />
        );
      })}
      {mids.map((mid, i) => {
        const shelf = unit.faces[i];
        const lx = mid.x + (unit.x - mid.x) * 0.15;
        const ly = mid.y + (unit.y - mid.y) * 0.15;
        return (
          <SvgText
            key={`${unit.id}-lab${i}`}
            x={lx}
            y={ly}
            fill="#0f172a"
            fontSize={13}
            fontWeight="700"
            textAnchor="middle"
            alignmentBaseline="middle"
            onPress={() => onSelectFace(i as 0 | 1 | 2)}
          >
            {`S${shelf}`}
          </SvgText>
        );
      })}
      <Circle
        cx={unit.x}
        cy={unit.y}
        r={12}
        fill={selected ? '#1d4ed8' : '#64748b'}
      />
      <SvgText
        x={unit.x}
        y={unit.y}
        fill="#fff"
        fontSize={10}
        fontWeight="700"
        textAnchor="middle"
        alignmentBaseline="middle"
      >
        {unit.id === 'west' ? 'A' : unit.id === 'east' ? 'B' : unit.id[0]?.toUpperCase()}
      </SvgText>
    </>
  );
}

export function FloorLayoutEditor({ layout, onChange, accent = '#1d4ed8' }: Props) {
  const [selectedId, setSelectedId] = useState<string>(layout.units[0]?.id ?? '');
  const [selectedFace, setSelectedFace] = useState<0 | 1 | 2 | null>(null);
  const [box, setBox] = useState({ w: 1, h: 1 });
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const layoutRef = useRef(layout);
  const onChangeRef = useRef(onChange);
  layoutRef.current = layout;
  onChangeRef.current = onChange;

  const selected = layout.units.find((u) => u.id === selectedId) ?? null;

  const scale = useMemo(() => {
    const sx = box.w / layout.width;
    const sy = box.h / layout.height;
    return Math.min(sx, sy) || 1;
  }, [box, layout.width, layout.height]);

  const offset = useMemo(() => {
    const drawnW = layout.width * scale;
    const drawnH = layout.height * scale;
    return {
      x: (box.w - drawnW) / 2,
      y: (box.h - drawnH) / 2,
    };
  }, [box, layout.width, layout.height, scale]);

  const scaleRef = useRef(scale);
  const offsetRef = useRef(offset);
  scaleRef.current = scale;
  offsetRef.current = offset;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 4,
        onPanResponderGrant: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          const sc = scaleRef.current;
          const off = offsetRef.current;
          const x = (locationX - off.x) / sc;
          const y = (locationY - off.y) / sc;
          const current = layoutRef.current;
          let best: FloorUnit | null = null;
          let bestDist = Infinity;
          for (const u of current.units) {
            const d = Math.hypot(u.x - x, u.y - y);
            if (d < bestDist) {
              bestDist = d;
              best = u;
            }
          }
          if (!best || bestDist > best.radius * 0.85) return;
          setSelectedId(best.id);
          setSelectedFace(null);
          dragRef.current = {
            id: best.id,
            startX: x,
            startY: y,
            originX: best.x,
            originY: best.y,
          };
        },
        onPanResponderMove: (e) => {
          const drag = dragRef.current;
          if (!drag) return;
          const { locationX, locationY } = e.nativeEvent;
          const sc = scaleRef.current;
          const off = offsetRef.current;
          const x = (locationX - off.x) / sc;
          const y = (locationY - off.y) / sc;
          const current = layoutRef.current;
          const nx = drag.originX + (x - drag.startX);
          const ny = drag.originY + (y - drag.startY);
          const unit = current.units.find((u) => u.id === drag.id);
          if (!unit) return;
          const next = clampUnit(current, { ...unit, x: nx, y: ny });
          onChangeRef.current(updateUnit(current, drag.id, { x: next.x, y: next.y }));
        },
        onPanResponderRelease: () => {
          dragRef.current = null;
        },
        onPanResponderTerminate: () => {
          dragRef.current = null;
        },
      }),
    [],
  );

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ w: width, h: height });
  }, []);

  const rotate = (delta: number) => {
    if (!selected) return;
    onChange(
      updateUnit(layout, selected.id, {
        rotation: (selected.rotation + delta + 360) % 360,
      }),
    );
  };

  const assignShelf = (shelf: number) => {
    if (!selected || selectedFace === null) return;
    onChange(setFaceShelf(layout, selected.id, selectedFace, shelf));
  };

  const allShelves = useMemo(() => {
    const set = new Set<number>();
    for (const u of layout.units) u.faces.forEach((f) => set.add(f));
    return [...set].sort((a, b) => a - b);
  }, [layout.units]);

  return (
    <View style={styles.root}>
      <Text style={styles.hint}>
        Drag a carousel hub (A / B) to place it. Tap a face, then a shelf chip to assign
        which frame sits on that side. Rotate to match the floor.
      </Text>

      <View style={styles.canvas} onLayout={onLayout} {...panResponder.panHandlers}>
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          style={styles.svg}
        >
          {/* floor pad */}
          <Polygon
            points={`0,0 ${layout.width},0 ${layout.width},${layout.height} 0,${layout.height}`}
            fill="#f1f5f9"
          />
          {layout.units.map((u) => (
            <UnitGraphic
              key={u.id}
              unit={u}
              selected={u.id === selectedId}
              selectedFace={u.id === selectedId ? selectedFace : null}
              onSelectFace={(face) => {
                setSelectedId(u.id);
                setSelectedFace(face);
              }}
            />
          ))}
        </Svg>
      </View>

      <View style={styles.toolbar}>
        <Text style={styles.toolbarLabel}>
          {selected
            ? `Carousel ${selected.id === 'west' ? 'A' : selected.id === 'east' ? 'B' : selected.id}`
            : 'Select a carousel'}
          {selectedFace !== null ? ` · face ${selectedFace + 1}` : ''}
        </Text>
        <View style={styles.row}>
          <Pressable
            style={[styles.btn, { borderColor: accent }]}
            onPress={() => rotate(-30)}
            disabled={!selected}
          >
            <Text style={[styles.btnText, { color: accent }]}>⟲ 30°</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, { borderColor: accent }]}
            onPress={() => rotate(30)}
            disabled={!selected}
          >
            <Text style={[styles.btnText, { color: accent }]}>⟳ 30°</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.chipLabel}>
        {selectedFace === null
          ? 'Tap a face on the map, then assign a shelf:'
          : `Assign shelf to selected face:`}
      </Text>
      <View style={styles.chips}>
        {allShelves.map((shelf) => (
          <Pressable
            key={shelf}
            style={[
              styles.chip,
              selectedFace !== null && { backgroundColor: accent },
            ]}
            onPress={() => assignShelf(shelf)}
            disabled={selectedFace === null}
          >
            <Text
              style={[
                styles.chipText,
                selectedFace !== null && styles.chipTextOn,
              ]}
            >
              S{shelf}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  hint: { color: '#52525b', lineHeight: 20, fontSize: 13 },
  canvas: {
    height: 240,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  svg: { flex: 1 },
  toolbar: { gap: 8 },
  toolbarLabel: { fontWeight: '700', color: '#27272a' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  btnText: { fontWeight: '800' },
  chipLabel: { color: '#71717a', fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#e4e4e7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  chipText: { fontWeight: '800', color: '#3f3f46' },
  chipTextOn: { color: '#fff' },
});
