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

/** Load repo-root .env into process.env (Expo does this for the app; Node seed does not). */
function loadEnvFile() {
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const keyName = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[keyName] === undefined) {
      process.env[keyName] = value;
    }
  }
}

loadEnvFile();

const rawUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!rawUrl || !key) {
  const missing = [];
  if (!rawUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL (or SUPABASE_URL)');
  if (!key) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  console.error(`Missing in .env (or environment): ${missing.join(', ')}`);
  console.error(
    'Anon key is for the app only. Seeding needs the service_role key from Supabase → Project Settings → API.',
  );
  process.exit(1);
}

const url = String(rawUrl).trim().replace(/\/+$/, '');
if (!/^https:\/\//i.test(url)) {
  console.warn('Warning: SUPABASE URL should be https://…supabase.co — got:', url);
}

const skipThumbs = process.env.SEED_SKIP_THUMBS === '1';
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = 'product-thumbs';

function storageHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${key}`,
    apikey: key,
    ...extra,
  };
}

async function ensureBucket() {
  // Prefer Storage REST — client listBuckets() can return PGRST125 on some setups.
  const listRes = await fetch(`${url}/storage/v1/bucket`, {
    headers: storageHeaders(),
  });
  if (!listRes.ok) {
    const body = await listRes.text();
    throw new Error(
      `Cannot list storage buckets (${listRes.status}): ${body}\n` +
        `Create a public bucket named "${BUCKET}" in Supabase → Storage, then re-run.\n` +
        `Or catalog-only: SEED_SKIP_THUMBS=1 npm run seed`,
    );
  }
  const buckets = await listRes.json();
  const exists = Array.isArray(buckets)
    ? buckets.some((b) => b.id === BUCKET || b.name === BUCKET)
    : false;
  if (exists) {
    console.log('Storage bucket exists:', BUCKET);
    return;
  }

  const createRes = await fetch(`${url}/storage/v1/bucket`, {
    method: 'POST',
    headers: storageHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
      file_size_limit: 5_000_000,
    }),
  });
  if (!createRes.ok) {
    const body = await createRes.text();
    if (createRes.status !== 409 && !/already exists/i.test(body)) {
      throw new Error(
        `Cannot create bucket "${BUCKET}" (${createRes.status}): ${body}\n` +
          `Create it manually in Supabase → Storage (Public), then re-run.`,
      );
    }
  }
  console.log('Created storage bucket', BUCKET);
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
  const safeSku = sku.replace(/[^A-Za-z0-9_-]/g, '_');
  const objectPath = `packs/${safeSku}.${ext}`;
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const body = new Blob([bytes], { type: contentType });

  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, body, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

async function main() {
  console.log('Seeding from', catalogPath);
  console.log('Project URL:', url);
  console.log('Products:', catalog.products.length, 'Placements:', catalog.placements.length);

  let uploadThumbs = !skipThumbs;
  if (skipThumbs) {
    console.log('SEED_SKIP_THUMBS=1 — keeping relative thumb_path values');
  } else {
    try {
      await ensureBucket();
    } catch (err) {
      console.error('\nStorage setup failed — continuing without thumb uploads.');
      console.error(String(err?.message || err));
      console.error(
        `\nFix: Dashboard → Storage → New bucket → "${BUCKET}" → Public, then re-run.\n` +
          `Or: SEED_SKIP_THUMBS=1 npm run seed\n`,
      );
      uploadThumbs = false;
    }
  }

  const skuToId = new Map();
  let uploaded = 0;
  let thumbErrors = 0;

  for (const p of catalog.products) {
    let thumbPath = p.thumb_path;
    if (uploadThumbs && p.thumb_path) {
      try {
        thumbPath = await uploadThumb(p.sku, p.thumb_path);
        uploaded += 1;
        if (uploaded % 25 === 0) console.log(`  uploaded ${uploaded} thumbs…`);
      } catch (err) {
        thumbErrors += 1;
        console.warn(`Thumb upload failed for ${p.sku}:`, err?.message || err);
        thumbPath = p.thumb_path;
        if (thumbErrors >= 3) {
          console.warn('Multiple thumb failures — skipping remaining uploads.');
          uploadThumbs = false;
        }
      }
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
  console.log(
    'Upserted products',
    skuToId.size,
    `(thumbs uploaded: ${uploaded}, failures: ${thumbErrors})`,
  );

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
