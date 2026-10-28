import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { router, Stack } from 'expo-router';
import { FloorLayoutEditor } from '../../components/FloorLayoutEditor';
import { FloorLayoutView } from '../../components/FloorLayoutView';
import { useAuth } from '../../lib/AuthContext';
import { useCatalog } from '../../lib/CatalogContext';
import {
  DEFAULT_FLOOR_LAYOUT,
  floorLayoutToSvg,
  resolveFloorLayout,
  type FloorLayout,
} from '../../lib/floorLayout';
import { saveLocalLayoutMap } from '../../lib/localOverrides';
import {
  DEFAULT_LAYOUT_NAME,
  deleteSavedLayout,
  listSavedLayouts,
  upsertSavedLayout,
  type SavedLayout,
} from '../../lib/savedLayouts';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';

export default function AdminLayoutMapScreen() {
  const { catalog, refresh, theme } = useCatalog();
  const { loading: authLoading, isAdmin, isMockAdmin } = useAuth();
  const [layout, setLayout] = useState<FloorLayout>(DEFAULT_FLOOR_LAYOUT);
  const [layoutName, setLayoutName] = useState(DEFAULT_LAYOUT_NAME);
  const [saved, setSaved] = useState<SavedLayout[]>([]);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const useLocal = !isSupabaseConfigured || isMockAdmin;

  const reloadSaved = useCallback(async () => {
    try {
      const rows = await listSavedLayouts({ useLocal });
      setSaved(rows);
    } catch (e) {
      console.warn('Failed to list saved layouts', e);
    }
  }, [useLocal]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/admin/login');
      return;
    }
    if (catalog) {
      setLayout(resolveFloorLayout(catalog.layoutMap));
      setReady(true);
      void reloadSaved();
    }
  }, [authLoading, isAdmin, catalog, reloadSaved]);

  const previewSvg = useMemo(() => floorLayoutToSvg(layout), [layout]);

  const publishLive = async () => {
    setBusy(true);
    try {
      const svg = floorLayoutToSvg(layout);
      if (isSupabaseConfigured && !isMockAdmin) {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase client missing');
        const { error } = await supabase
          .from('layout_map')
          .upsert({ id: 1, svg_markup: svg }, { onConflict: 'id' });
        if (error) throw error;
      } else {
        await saveLocalLayoutMap(svg);
      }
      await refresh();
      Alert.alert('Published', 'Live floor layout updated for staff views.');
    } catch (e) {
      Alert.alert('Publish failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const saveNamed = async () => {
    const name = layoutName.trim();
    if (!name) {
      Alert.alert('Name required', 'Give this layout a name (e.g. Essen 2026 or PaxU).');
      return;
    }
    setBusy(true);
    try {
      const svg = floorLayoutToSvg(layout);
      await upsertSavedLayout(name, svg, { useLocal });
      setLayoutName(name);
      await reloadSaved();
      Alert.alert('Saved', `“${name}” stored. Publish live when you want staff to see it.`);
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const loadNamed = (row: SavedLayout) => {
    Alert.alert('Load layout?', `Replace the editor with “${row.name}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Load',
        onPress: () => {
          setLayout(resolveFloorLayout(row.svg_markup));
          setLayoutName(row.name);
        },
      },
    ]);
  };

  const removeNamed = (row: SavedLayout) => {
    Alert.alert('Delete saved layout?', `Remove “${row.name}”? The live map is unchanged.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await deleteSavedLayout(row.id, { useLocal });
              await reloadSaved();
            } catch (e) {
              Alert.alert(
                'Delete failed',
                e instanceof Error ? e.message : 'Unknown error',
              );
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  };

  const reset = () => {
    setLayout(DEFAULT_FLOOR_LAYOUT);
    setLayoutName(DEFAULT_LAYOUT_NAME);
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
      <Stack.Screen options={{ title: 'Floor layout' }} />
      <Text style={styles.lead}>
        Each rack is a triangular prism with three faces (like a carousel that doesn&apos;t
        move). Place the two carousels on the floor, rotate them, and assign S1–S6 to each
        face. Save named layouts for different events (Essen 2026, PaxU, …), then publish
        one as the live staff map.
      </Text>

      <Text style={styles.label}>Layout name</Text>
      <TextInput
        style={styles.input}
        value={layoutName}
        onChangeText={setLayoutName}
        placeholder={DEFAULT_LAYOUT_NAME}
        placeholderTextColor="#a1a1aa"
        autoCapitalize="words"
        autoCorrect={false}
      />

      <FloorLayoutEditor layout={layout} onChange={setLayout} accent={theme.accent} />

      <Text style={styles.previewLabel}>Staff preview</Text>
      <FloorLayoutView layout={layout} layoutMap={previewSvg} title="" height={160} />

      <View style={styles.actions}>
        <Pressable
          style={[styles.btn, { backgroundColor: theme.accent }]}
          onPress={() => void saveNamed()}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Save named layout</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.btn, styles.publish]}
          onPress={() => void publishLive()}
          disabled={busy}
        >
          <Text style={styles.btnText}>Publish live</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={reset}>
          <Text style={styles.secondaryText}>Reset default</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Saved layouts ({saved.length})</Text>
      {saved.length === 0 ? (
        <Text style={styles.empty}>
          No named layouts yet. Save this one as “{DEFAULT_LAYOUT_NAME}” to get started.
        </Text>
      ) : (
        saved.map((row) => (
          <View key={row.id} style={styles.savedRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.savedName}>{row.name}</Text>
              <Text style={styles.savedMeta}>
                Updated {new Date(row.updated_at).toLocaleString()}
              </Text>
            </View>
            <Pressable style={styles.miniChip} onPress={() => loadNamed(row)}>
              <Text style={styles.miniChipText}>Load</Text>
            </Pressable>
            <Pressable onPress={() => removeNamed(row)} hitSlop={6}>
              <Text style={styles.danger}>Delete</Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wrap: { padding: 14, gap: 12, paddingBottom: 48 },
  lead: { color: '#52525b', lineHeight: 20 },
  label: { fontWeight: '800', color: '#27272a' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#18181b',
  },
  previewLabel: { fontWeight: '800', color: '#27272a', marginTop: 4 },
  actions: { gap: 10, marginTop: 4 },
  btn: { borderRadius: 10, padding: 14, alignItems: 'center' },
  publish: { backgroundColor: '#0f766e' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondary: {
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d4d4d8',
  },
  secondaryText: { fontWeight: '700', color: '#3f3f46' },
  section: { fontWeight: '800', color: '#27272a', marginTop: 8 },
  empty: { color: '#71717a', lineHeight: 20 },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  savedName: { fontWeight: '800', color: '#18181b' },
  savedMeta: { color: '#71717a', fontSize: 12, marginTop: 2 },
  miniChip: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  miniChipText: { fontWeight: '700', color: '#1e3a8a' },
  danger: { color: '#b91c1c', fontWeight: '700' },
});
