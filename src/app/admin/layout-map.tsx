import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';

export default function AdminLayoutMapScreen() {
  const { catalog, refresh, theme } = useCatalog();
  const { loading: authLoading, isAdmin, isMockAdmin } = useAuth();
  const [layout, setLayout] = useState<FloorLayout>(DEFAULT_FLOOR_LAYOUT);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/admin/login');
      return;
    }
    if (catalog) {
      setLayout(resolveFloorLayout(catalog.layoutMap));
      setReady(true);
    }
  }, [authLoading, isAdmin, catalog]);

  const previewSvg = useMemo(() => floorLayoutToSvg(layout), [layout]);

  const save = async () => {
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
      Alert.alert('Saved', 'Floor layout updated.');
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setLayout(DEFAULT_FLOOR_LAYOUT);
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
        face.
      </Text>

      <FloorLayoutEditor layout={layout} onChange={setLayout} accent={theme.accent} />

      <Text style={styles.previewLabel}>Staff preview</Text>
      <FloorLayoutView layout={layout} layoutMap={previewSvg} title="" height={160} />

      <View style={styles.actions}>
        <Pressable style={styles.secondary} onPress={reset}>
          <Text style={styles.secondaryText}>Reset default</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, { backgroundColor: theme.accent }]}
          onPress={() => void save()}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Save layout</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wrap: { padding: 14, gap: 12, paddingBottom: 48 },
  lead: { color: '#52525b', lineHeight: 20 },
  previewLabel: { fontWeight: '800', color: '#27272a', marginTop: 4 },
  actions: { gap: 10, marginTop: 4 },
  btn: { borderRadius: 10, padding: 14, alignItems: 'center' },
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
});
