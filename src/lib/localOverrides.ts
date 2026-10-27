import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CatalogSnapshot, Placement } from './types';

const KEY = 'mayday.localOverrides.v1';

export type LocalOverrides = {
  shelfMaps?: Record<string, string>;
  layoutMap?: string;
  /** Replaces all placements when set (full list). */
  placements?: Placement[];
};

export async function readLocalOverrides(): Promise<LocalOverrides> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as LocalOverrides;
  } catch {
    return {};
  }
}

export async function writeLocalOverrides(next: LocalOverrides): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function mergeLocalOverrides(
  snap: CatalogSnapshot,
): Promise<CatalogSnapshot> {
  const o = await readLocalOverrides();
  const shelfMaps = { ...snap.shelfMaps, ...(o.shelfMaps ?? {}) };
  const layoutMap = o.layoutMap ?? snap.layoutMap;
  let placements = snap.placements;
  let products = snap.products;

  if (o.placements) {
    placements = o.placements;
    const bySku = new Map<string, string[]>();
    for (const pl of placements) {
      const list = bySku.get(pl.sku) ?? [];
      list.push(pl.position_code);
      bySku.set(pl.sku, list);
    }
    products = snap.products.map((p) => ({
      ...p,
      positions: bySku.get(p.sku) ?? [],
    }));
  }

  return { ...snap, shelfMaps, layoutMap, placements, products };
}

export async function saveLocalShelfMap(shelf: number, svg: string): Promise<void> {
  const o = await readLocalOverrides();
  await writeLocalOverrides({
    ...o,
    shelfMaps: { ...(o.shelfMaps ?? {}), [String(shelf)]: svg },
  });
}

export async function saveLocalLayoutMap(svg: string): Promise<void> {
  const o = await readLocalOverrides();
  await writeLocalOverrides({ ...o, layoutMap: svg });
}

export async function saveLocalPlacements(placements: Placement[]): Promise<void> {
  const o = await readLocalOverrides();
  await writeLocalOverrides({ ...o, placements });
}
