import {
  readLocalOverrides,
  writeLocalOverrides,
} from './localOverrides';
import { getSupabase, isSupabaseConfigured } from './supabase';
import type { SavedLayout } from './types';

export type { SavedLayout };

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function localIdForName(name: string): string {
  return `local-${normalizeName(name).toLowerCase()}`;
}

async function listLocal(): Promise<SavedLayout[]> {
  const o = await readLocalOverrides();
  const rows = o.savedLayouts ?? [];
  return [...rows].sort((a, b) => a.name.localeCompare(b.name));
}

async function upsertLocal(name: string, svg: string): Promise<SavedLayout> {
  const o = await readLocalOverrides();
  const rows = [...(o.savedLayouts ?? [])];
  const key = normalizeName(name).toLowerCase();
  const now = new Date().toISOString();
  const existing = rows.findIndex((r) => r.name.trim().toLowerCase() === key);
  const row: SavedLayout = {
    id: existing >= 0 ? rows[existing].id : localIdForName(name),
    name: normalizeName(name),
    svg_markup: svg,
    updated_at: now,
  };
  if (existing >= 0) rows[existing] = row;
  else rows.push(row);
  await writeLocalOverrides({ ...o, savedLayouts: rows });
  return row;
}

async function deleteLocal(id: string): Promise<void> {
  const o = await readLocalOverrides();
  await writeLocalOverrides({
    ...o,
    savedLayouts: (o.savedLayouts ?? []).filter((r) => r.id !== id),
  });
}

export async function listSavedLayouts(opts?: {
  useLocal?: boolean;
}): Promise<SavedLayout[]> {
  if (opts?.useLocal || !isSupabaseConfigured) {
    return listLocal();
  }
  const supabase = getSupabase();
  if (!supabase) return listLocal();

  const { data, error } = await supabase
    .from('saved_layouts')
    .select('id, name, svg_markup, updated_at')
    .order('name');
  if (error) throw error;
  return (data ?? []) as SavedLayout[];
}

export async function upsertSavedLayout(
  name: string,
  svg: string,
  opts?: { useLocal?: boolean },
): Promise<SavedLayout> {
  const clean = normalizeName(name);
  if (!clean) throw new Error('Layout name is required');

  if (opts?.useLocal || !isSupabaseConfigured) {
    return upsertLocal(clean, svg);
  }
  const supabase = getSupabase();
  if (!supabase) return upsertLocal(clean, svg);

  const { data: rows, error: findError } = await supabase
    .from('saved_layouts')
    .select('id, name');
  if (findError) throw findError;

  const key = clean.toLowerCase();
  const existing = (rows ?? []).find(
    (r) => String(r.name).trim().toLowerCase() === key,
  );

  if (existing) {
    const { data, error } = await supabase
      .from('saved_layouts')
      .update({ name: clean, svg_markup: svg })
      .eq('id', existing.id)
      .select('id, name, svg_markup, updated_at')
      .single();
    if (error) throw error;
    return data as SavedLayout;
  }

  const { data, error } = await supabase
    .from('saved_layouts')
    .insert({ name: clean, svg_markup: svg })
    .select('id, name, svg_markup, updated_at')
    .single();
  if (error) throw error;
  return data as SavedLayout;
}

export async function deleteSavedLayout(
  id: string,
  opts?: { useLocal?: boolean },
): Promise<void> {
  if (opts?.useLocal || !isSupabaseConfigured) {
    await deleteLocal(id);
    return;
  }
  const supabase = getSupabase();
  if (!supabase) {
    await deleteLocal(id);
    return;
  }
  const { error } = await supabase.from('saved_layouts').delete().eq('id', id);
  if (error) throw error;
}

export const DEFAULT_LAYOUT_NAME = 'Essen 2026';
