#!/usr/bin/env node
/**
 * Seed Supabase from seed/catalog.json + seed/thumbs/*.
 *
 * Requires:
 *   EXPO_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   SEED_SKIP_THUMBS=1  — skip Storage uploads; keep relative thumb_path
 *
 * Usage: node scripts/seed-from-catalog.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const catalogPath = join(root, 'seed', 'catalog.json');
const thumbsDir = join(root, 'seed', 'thumbs');

const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    'Missing SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.',
  );
  process.exit(1);
}

const skipThumbs = process.env.SEED_SKIP_THUMBS === '1';
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const supabase = createClient(url, key, { auth: { persistSession: false } });

const BUCKET = 'product-thumbs';

async function ensureBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if (!buckets?.some((b) => b.id === BUCKET || b.name === BUCKET)) {
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 5_000_000,
    });
    if (createErr) throw createErr;
    console.log('Created storage bucket', BUCKET);
  }
}

async function uploadThumb(sku, relativePath) {
  if (!relativePath) return null;
  const local = join(root, 'seed', relativePath);
  if (!existsSync(local)) {
    console.warn('Missing thumb file', local);
    return null;
  }
  const bytes = readFileSync(local);
  const ext = relativePath.split('.').pop() || 'jpg';
  const objectPath = `${sku}.${ext}`;
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, bytes, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

async function main() {
  console.log('Seeding from', catalogPath);
  console.log('Products:', catalog.products.length, 'Placements:', catalog.placements.length);

  if (!skipThumbs) {
    await ensureBucket();
  }

  const skuToId = new Map();

  for (const p of catalog.products) {
    let thumbPath = p.thumb_path;
    if (!skipThumbs && p.thumb_path) {
      thumbPath = await uploadThumb(p.sku, p.thumb_path);
    }

    const row = {
      sku: p.sku,
      name: p.name,
      brand: p.brand,
      width_mm: p.width_mm,
      height_mm: p.height_mm,
      pack_count: p.pack_count,
      is_premium: p.is_premium,
      thumb_path: thumbPath,
      product_url: p.product_url,
      accent_color: p.accent_color,
      accent_gradient: p.accent_gradient,
      is_active: true,
    };

    const { data, error } = await supabase
      .from('products')
      .upsert(row, { onConflict: 'sku' })
      .select('id, sku')
      .single();
    if (error) throw error;
    skuToId.set(data.sku, data.id);
  }
  console.log('Upserted products', skuToId.size);

  // Replace placements (stable position_code)
  const placementRows = catalog.placements
    .map((pl) => {
      const product_id = skuToId.get(pl.sku);
      if (!product_id) {
        console.warn('Unknown SKU for placement', pl.sku, pl.position_code);
        return null;
      }
      return {
        position_code: pl.position_code,
        shelf: pl.shelf,
        row: pl.row,
        slot: pl.slot,
        product_id,
      };
    })
    .filter(Boolean);

  const { error: delPlErr } = await supabase
    .from('shelf_placements')
    .delete()
    .neq('position_code', '');
  if (delPlErr) throw delPlErr;

  const chunk = 50;
  for (let i = 0; i < placementRows.length; i += chunk) {
    const { error } = await supabase
      .from('shelf_placements')
      .insert(placementRows.slice(i, i + chunk));
    if (error) throw error;
  }
  console.log('Inserted placements', placementRows.length);

  for (const [shelf, svg] of Object.entries(catalog.shelf_maps)) {
    const { error } = await supabase
      .from('shelf_maps')
      .upsert({ shelf: Number(shelf), svg_markup: svg }, { onConflict: 'shelf' });
    if (error) throw error;
  }
  console.log('Upserted shelf maps', Object.keys(catalog.shelf_maps).length);

  const { error: layoutErr } = await supabase
    .from('layout_map')
    .upsert({ id: 1, svg_markup: catalog.layout_map }, { onConflict: 'id' });
  if (layoutErr) throw layoutErr;
  console.log('Upserted layout map');

  const dc = catalog.display_config;
  const { error: dcErr } = await supabase.from('display_config').upsert(
    {
      key: dc.key,
      version: dc.version,
      payload: dc.payload,
    },
    { onConflict: 'key' },
  );
  if (dcErr) throw dcErr;
  console.log('Upserted display_config', dc.key);

  const thumbCount = existsSync(thumbsDir) ? readdirSync(thumbsDir).length : 0;
  console.log('Done. Local thumb files available:', thumbCount);
  console.log(
    'Next: create an Auth user in Supabase, then insert into admin_users (id, email, role).',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
