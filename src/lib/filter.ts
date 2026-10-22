import type { FinderFilters, Product } from './types';

function parseNum(value: string): number | null {
  const t = value.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function sizeDistance(
  product: Product,
  width: number | null,
  height: number | null,
): number {
  const dw =
    width == null || product.width_mm == null
      ? 0
      : Math.abs(Number(product.width_mm) - width);
  const dh =
    height == null || product.height_mm == null
      ? 0
      : Math.abs(Number(product.height_mm) - height);
  return dw + dh;
}

export function filterProducts(products: Product[], filters: FinderFilters): Product[] {
  const q = filters.query.trim().toLowerCase();
  const w = parseNum(filters.width);
  const h = parseNum(filters.height);
  const tol = parseNum(filters.tolerance) ?? 1;
  const sizeQuery = w != null || h != null;

  let list = products.filter((p) => {
    if (filters.premium === 'standard' && p.is_premium) return false;
    if (filters.premium === 'premium' && !p.is_premium) return false;

    if (q) {
      const hay = `${p.sku} ${p.name}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    if (sizeQuery) {
      if (w != null) {
        if (p.width_mm == null) return false;
        if (Math.abs(Number(p.width_mm) - w) > tol) return false;
      }
      if (h != null) {
        if (p.height_mm == null) return false;
        if (Math.abs(Number(p.height_mm) - h) > tol) return false;
      }
    }

    return true;
  });

  list = [...list].sort((a, b) => {
    if (sizeQuery) {
      const da = sizeDistance(a, w, h);
      const db = sizeDistance(b, w, h);
      if (da !== db) return da - db;
    } else {
      const pa = a.positions.length > 0 ? 0 : 1;
      const pb = b.positions.length > 0 ? 0 : 1;
      if (pa !== pb) return pa - pb;
    }
    return a.sku.localeCompare(b.sku);
  });

  return list;
}
