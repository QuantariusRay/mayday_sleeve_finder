import type { CatalogSnapshot, Placement, Product } from './types';

export function listShelfIds(catalog: CatalogSnapshot | null): number[] {
  if (!catalog) return [];
  const fromMaps = Object.keys(catalog.shelfMaps)
    .map(Number)
    .filter((n) => Number.isFinite(n));
  const fromPlacements = catalog.placements.map((p) => p.shelf);
  return [...new Set([...fromMaps, ...fromPlacements])].sort((a, b) => a - b);
}

export function placementsOnShelf(
  catalog: CatalogSnapshot | null,
  shelf: number,
): Placement[] {
  if (!catalog) return [];
  return catalog.placements
    .filter((p) => p.shelf === shelf)
    .sort((a, b) => a.row - b.row || a.slot - b.slot || a.position_code.localeCompare(b.position_code));
}

export function productsOnShelf(
  catalog: CatalogSnapshot | null,
  shelf: number,
): Array<{ product: Product; positions: string[] }> {
  if (!catalog) return [];
  const bySku = new Map<string, string[]>();
  for (const pl of placementsOnShelf(catalog, shelf)) {
    const list = bySku.get(pl.sku) ?? [];
    list.push(pl.position_code);
    bySku.set(pl.sku, list);
  }
  const out: Array<{ product: Product; positions: string[] }> = [];
  for (const [sku, positions] of bySku) {
    const product = catalog.products.find((p) => p.sku === sku);
    if (product) out.push({ product, positions });
  }
  return out.sort((a, b) => a.product.sku.localeCompare(b.product.sku));
}

export function positionCodesOnShelf(
  catalog: CatalogSnapshot | null,
  shelf: number,
): string[] {
  return placementsOnShelf(catalog, shelf).map((p) => p.position_code);
}
