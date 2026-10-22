import seed from '../data/seed-catalog.json';
import { getSupabase, isSupabaseConfigured } from './supabase';
import type {
  CatalogSnapshot,
  DisplayConfig,
  DisplayConfigPayload,
  Placement,
  Product,
} from './types';

type SeedFile = {
  products: Array<{
    sku: string;
    name: string;
    brand: string;
    width_mm: number | null;
    height_mm: number | null;
    pack_count: number | null;
    is_premium: boolean;
    positions: string[];
    thumb_path: string | null;
    product_url: string | null;
    accent_color: string | null;
    accent_gradient: string[] | null;
  }>;
  placements: Array<{
    position_code: string;
    shelf: number;
    row: number;
    slot: number;
    sku: string;
  }>;
  shelf_maps: Record<string, string>;
  layout_map: string;
  display_config: {
    key: string;
    version: number;
    payload: DisplayConfigPayload;
  };
};

const seedData = seed as SeedFile;

function mockSnapshot(): CatalogSnapshot {
  const products: Product[] = seedData.products.map((p) => ({
    id: `mock-${p.sku}`,
    sku: p.sku,
    name: p.name,
    brand: p.brand,
    width_mm: p.width_mm,
    height_mm: p.height_mm,
    pack_count: p.pack_count,
    is_premium: p.is_premium,
    thumb_path: p.thumb_path,
    product_url: p.product_url,
    accent_color: p.accent_color,
    accent_gradient: p.accent_gradient,
    positions: p.positions ?? [],
    is_active: true,
  }));

  const placements: Placement[] = seedData.placements.map((pl) => ({
    ...pl,
    id: `mock-${pl.position_code}`,
  }));

  return {
    source: 'mock',
    products,
    placements,
    shelfMaps: seedData.shelf_maps,
    layoutMap: seedData.layout_map,
    displayConfig: {
      key: seedData.display_config.key,
      version: seedData.display_config.version,
      payload: seedData.display_config.payload,
    },
  };
}

export function getMockCatalog(): CatalogSnapshot {
  return mockSnapshot();
}

export async function loadCatalog(): Promise<CatalogSnapshot> {
  if (!isSupabaseConfigured) {
    return mockSnapshot();
  }

  const supabase = getSupabase();
  if (!supabase) return mockSnapshot();

  try {
    const [productsRes, placementsRes, shelvesRes, layoutRes, displayRes] =
      await Promise.all([
        supabase.from('products').select('*').eq('is_active', true).order('sku'),
        supabase.from('shelf_placements').select('*, products(sku)'),
        supabase.from('shelf_maps').select('shelf, svg_markup'),
        supabase.from('layout_map').select('svg_markup').eq('id', 1).maybeSingle(),
        supabase
          .from('display_config')
          .select('key, version, payload')
          .eq('key', 'mobile_home')
          .maybeSingle(),
      ]);

    if (productsRes.error) throw productsRes.error;
    if (placementsRes.error) throw placementsRes.error;
    if (shelvesRes.error) throw shelvesRes.error;

    const placementByProduct = new Map<string, string[]>();
    const placements: Placement[] = (placementsRes.data ?? []).map((row: any) => {
      const sku = row.products?.sku ?? '';
      const list = placementByProduct.get(row.product_id) ?? [];
      list.push(row.position_code);
      placementByProduct.set(row.product_id, list);
      return {
        id: row.id,
        position_code: row.position_code,
        shelf: row.shelf,
        row: row.row,
        slot: row.slot,
        sku,
        product_id: row.product_id,
      };
    });

    const products: Product[] = (productsRes.data ?? []).map((row: any) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      brand: row.brand,
      width_mm: row.width_mm,
      height_mm: row.height_mm,
      pack_count: row.pack_count,
      is_premium: row.is_premium,
      thumb_path: row.thumb_path,
      product_url: row.product_url,
      accent_color: row.accent_color,
      accent_gradient: row.accent_gradient,
      positions: placementByProduct.get(row.id) ?? [],
      sort_hint: row.sort_hint,
      is_active: row.is_active,
    }));

    const shelfMaps: Record<string, string> = {};
    for (const row of shelvesRes.data ?? []) {
      shelfMaps[String(row.shelf)] = row.svg_markup;
    }

    const fallback = mockSnapshot();
    const displayConfig: DisplayConfig = displayRes.data
      ? {
          key: displayRes.data.key,
          version: displayRes.data.version,
          payload: displayRes.data.payload as DisplayConfigPayload,
        }
      : fallback.displayConfig;

    return {
      source: 'supabase',
      products,
      placements,
      shelfMaps: Object.keys(shelfMaps).length ? shelfMaps : fallback.shelfMaps,
      layoutMap: layoutRes.data?.svg_markup ?? fallback.layoutMap,
      displayConfig,
    };
  } catch (err) {
    console.warn('Supabase catalog load failed; using mock seed', err);
    return mockSnapshot();
  }
}

export async function refreshDisplayConfig(): Promise<DisplayConfig> {
  const snap = await loadCatalog();
  return snap.displayConfig;
}
