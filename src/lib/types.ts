export type PremiumFilter = 'all' | 'standard' | 'premium';

export type Product = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  width_mm: number | null;
  height_mm: number | null;
  pack_count: number | null;
  is_premium: boolean;
  thumb_path: string | null;
  product_url: string | null;
  accent_color: string | null;
  accent_gradient: string[] | null;
  positions: string[];
  sort_hint?: number | null;
  is_active?: boolean;
};

export type Placement = {
  id?: string;
  position_code: string;
  shelf: number;
  row: number;
  slot: number;
  sku: string;
  product_id?: string;
};

export type DisplayConfigPayload = {
  theme: {
    accent: string;
    premiumBorder: string;
    bg: string;
  };
  header: {
    title: string;
    subtitle: string | null;
  };
  filters: {
    searchPlaceholder: string;
    toleranceDefault: number;
    showPremiumSegment: boolean;
  };
  sections: Array<{ type: string; id: string; columns?: number }>;
  card: {
    showThumb: boolean;
    showDims: boolean;
    showPackMeta: boolean;
    showPositionBadges: boolean;
  };
  detail: {
    blocks: string[];
  };
  copy: {
    noShelfPosition: string;
    countFormat: string;
    productLinkLabel: string;
    clearLabel: string;
  };
};

export type DisplayConfig = {
  key: string;
  version: number;
  payload: DisplayConfigPayload;
};

export type CatalogSnapshot = {
  source: 'supabase' | 'mock';
  products: Product[];
  placements: Placement[];
  shelfMaps: Record<string, string>;
  layoutMap: string;
  displayConfig: DisplayConfig;
};

/** Named floor layout snapshot (Admin → Floor layout). */
export type SavedLayout = {
  id: string;
  name: string;
  svg_markup: string;
  updated_at: string;
};

export type FinderFilters = {
  query: string;
  width: string;
  height: string;
  tolerance: string;
  premium: PremiumFilter;
};
