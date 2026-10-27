import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../lib/AuthContext';
import { useCatalog } from '../../../lib/CatalogContext';
import {
  saveLocalPlacements,
  saveLocalShelfMap,
} from '../../../lib/localOverrides';
import { placementsOnShelf } from '../../../lib/shelves';
import { getSupabase, isSupabaseConfigured } from '../../../lib/supabase';
import type { Placement } from '../../../lib/types';
import { ShelfHighlight } from '../../../components/ShelfHighlight';

export default function AdminShelfEditorScreen() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const shelf = Number(raw);
  const { catalog, refresh, theme } = useCatalog();
  const { loading: authLoading, isAdmin, isMockAdmin } = useAuth();

  const [svg, setSvg] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  // New placement form
  const [row, setRow] = useState('');
  const [slot, setSlot] = useState('');
  const [sku, setSku] = useState('');

  const placements = useMemo(
    () => (Number.isFinite(shelf) ? placementsOnShelf(catalog, shelf) : []),
    [catalog, shelf],
  );

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/admin/login');
      return;
    }
    if (catalog && Number.isFinite(shelf)) {
      setSvg(catalog.shelfMaps[String(shelf)] ?? '');
      setReady(true);
    }
  }, [authLoading, isAdmin, catalog, shelf]);

  const saveMap = async () => {
    setBusy(true);
    try {
      if (isSupabaseConfigured && !isMockAdmin) {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase client missing');
        const { error } = await supabase
          .from('shelf_maps')
          .upsert({ shelf, svg_markup: svg }, { onConflict: 'shelf' });
        if (error) throw error;
      } else {
        await saveLocalShelfMap(shelf, svg);
      }
      await refresh();
      Alert.alert('Saved', `Shelf ${shelf} map updated.`);
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const addPlacement = async () => {
    const r = Number(row);
    const s = Number(slot);
    const code = `S${shelf}-R${r}-P${s}`;
    if (!Number.isFinite(r) || !Number.isFinite(s) || !sku.trim()) {
      Alert.alert('Need row, slot, and SKU');
      return;
    }
    setBusy(true);
    try {
      if (isSupabaseConfigured && !isMockAdmin) {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase client missing');
        const { data: product, error: pErr } = await supabase
          .from('products')
          .select('id')
          .eq('sku', sku.trim())
          .maybeSingle();
        if (pErr) throw pErr;
        if (!product) throw new Error(`Unknown SKU ${sku}`);
        const { error } = await supabase.from('shelf_placements').upsert(
          {
            position_code: code,
            shelf,
            row: r,
            slot: s,
            product_id: product.id,
          },
          { onConflict: 'position_code' },
        );
        if (error) throw error;
      } else {
        const next: Placement[] = [
          ...((catalog?.placements ?? []).filter((p) => p.position_code !== code)),
          {
            id: `local-${code}`,
            position_code: code,
            shelf,
            row: r,
            slot: s,
            sku: sku.trim(),
          },
        ];
        await saveLocalPlacements(next);
      }
      setRow('');
      setSlot('');
      setSku('');
      await refresh();
    } catch (e) {
      Alert.alert('Add failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const removePlacement = async (pl: Placement) => {
    setBusy(true);
    try {
      if (isSupabaseConfigured && !isMockAdmin) {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase client missing');
        const { error } = await supabase
          .from('shelf_placements')
          .delete()
          .eq('position_code', pl.position_code);
        if (error) throw error;
      } else {
        const next = (catalog?.placements ?? []).filter(
          (p) => p.position_code !== pl.position_code,
        );
        await saveLocalPlacements(next);
      }
      await refresh();
    } catch (e) {
      Alert.alert('Delete failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  if (!ready || authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Stack.Screen options={{ title: `Edit shelf ${shelf}` }} />

      {isMockAdmin ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Demo admin — saves stay on this device until Supabase is configured.
          </Text>
        </View>
      ) : null}

      <Text style={styles.section}>Live preview</Text>
      <ShelfHighlight
        title=""
        svgMarkup={svg || '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><text x="8" y="24" font-size="12">Empty map</text></svg>'}
        highlightPositions={placements.map((p) => p.position_code)}
        height={260}
      />

      <Text style={styles.section}>SVG markup</Text>
      <Text style={styles.hint}>
        Paste or edit the shelf SVG. Rects/paths should use data-pos=&quot;S{shelf}-R#-P#&quot;
        so highlights keep working.
      </Text>
      <TextInput
        style={styles.editor}
        multiline
        autoCorrect={false}
        autoCapitalize="none"
        value={svg}
        onChangeText={setSvg}
        textAlignVertical="top"
      />
      <Pressable
        style={[styles.btn, { backgroundColor: theme.accent }]}
        onPress={() => void saveMap()}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Save shelf map</Text>
        )}
      </Pressable>

      <Text style={styles.section}>Placements ({placements.length})</Text>
      <View style={styles.addBox}>
        <Text style={styles.hint}>Add slot → position S{shelf}-R{'{row}'}-P{'{slot}'}</Text>
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, styles.small]}
            placeholder="Row"
            keyboardType="number-pad"
            value={row}
            onChangeText={setRow}
          />
          <TextInput
            style={[styles.input, styles.small]}
            placeholder="Slot"
            keyboardType="number-pad"
            value={slot}
            onChangeText={setSlot}
          />
          <TextInput
            style={[styles.input, styles.flex]}
            placeholder="SKU"
            autoCapitalize="characters"
            value={sku}
            onChangeText={setSku}
          />
        </View>
        <Pressable style={styles.secondary} onPress={() => void addPlacement()} disabled={busy}>
          <Text style={styles.secondaryText}>Add placement</Text>
        </Pressable>
      </View>

      {placements.map((pl) => (
        <View key={pl.position_code} style={styles.placeRow}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() =>
              router.push(
                `/admin/placement/${encodeURIComponent(pl.id ?? pl.position_code)}`,
              )
            }
          >
            <Text style={styles.sku}>{pl.position_code}</Text>
            <Text style={styles.meta}>{pl.sku}</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert('Remove placement?', pl.position_code, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: () => void removePlacement(pl),
                },
              ])
            }
          >
            <Text style={styles.danger}>Remove</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wrap: { padding: 14, gap: 10, paddingBottom: 48 },
  banner: {
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 8,
  },
  bannerText: { color: '#92400e', fontSize: 13, lineHeight: 18 },
  section: { fontSize: 16, fontWeight: '800', color: '#18181b', marginTop: 8 },
  hint: { color: '#71717a', fontSize: 13, lineHeight: 18 },
  editor: {
    minHeight: 180,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  btn: { borderRadius: 10, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  addBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    padding: 12,
    gap: 8,
  },
  addRow: { flexDirection: 'row', gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fafafa',
    fontSize: 15,
  },
  small: { width: 64 },
  flex: { flex: 1 },
  secondary: {
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  secondaryText: { fontWeight: '700', color: '#1e3a8a' },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    padding: 12,
    gap: 8,
  },
  sku: { fontWeight: '800', color: '#18181b' },
  meta: { color: '#71717a', marginTop: 2, fontSize: 13 },
  danger: { color: '#b91c1c', fontWeight: '700' },
});
