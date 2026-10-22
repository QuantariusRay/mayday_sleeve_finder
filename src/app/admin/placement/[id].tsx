import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { isCurrentUserAdmin } from '../../../lib/auth';
import { useCatalog } from '../../../lib/CatalogContext';
import { getSupabase } from '../../../lib/supabase';

export default function AdminPlacementScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = decodeURIComponent(rawId ?? '');
  const { catalog, refresh, theme } = useCatalog();
  const [positionCode, setPositionCode] = useState('');
  const [shelf, setShelf] = useState('');
  const [row, setRow] = useState('');
  const [slot, setSlot] = useState('');
  const [sku, setSku] = useState('');
  const [productId, setProductId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const ok = await isCurrentUserAdmin();
      if (!ok) {
        router.replace('/admin/login');
        return;
      }
      const pl = catalog?.placements.find(
        (p) => p.id === id || p.position_code === id,
      );
      if (pl) {
        setPositionCode(pl.position_code);
        setShelf(String(pl.shelf));
        setRow(String(pl.row));
        setSlot(String(pl.slot));
        setSku(pl.sku);
        setProductId(pl.product_id ?? null);
      }
      setReady(true);
    })();
  }, [catalog, id]);

  const save = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      Alert.alert('Supabase not configured');
      return;
    }
    setBusy(true);
    try {
      let resolvedProductId = productId;
      if (!resolvedProductId || sku) {
        const { data, error } = await supabase
          .from('products')
          .select('id')
          .eq('sku', sku.trim())
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error(`Unknown SKU ${sku}`);
        resolvedProductId = data.id;
      }

      const rowData = {
        position_code: positionCode.trim(),
        shelf: Number(shelf),
        row: Number(row),
        slot: Number(slot),
        product_id: resolvedProductId,
      };

      if (id && id !== 'new' && catalog?.source === 'supabase') {
        const { error } = await supabase
          .from('shelf_placements')
          .update(rowData)
          .or(`id.eq.${id},position_code.eq.${id}`);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('shelf_placements').upsert(rowData, {
          onConflict: 'position_code',
        });
        if (error) throw error;
      }
      await refresh();
      router.back();
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('shelf_placements')
        .delete()
        .or(`id.eq.${id},position_code.eq.${positionCode}`);
      if (error) throw error;
      await refresh();
      router.back();
    } catch (e) {
      Alert.alert('Delete failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {(
        [
          ['Position code', positionCode, setPositionCode],
          ['Shelf', shelf, setShelf],
          ['Row', row, setRow],
          ['Slot', slot, setSlot],
          ['SKU', sku, setSku],
        ] as const
      ).map(([label, value, setter]) => (
        <View key={label} style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput style={styles.input} value={value} onChangeText={setter} />
        </View>
      ))}

      <Pressable
        style={[styles.btn, { backgroundColor: theme.accent }]}
        onPress={() => void save()}
        disabled={busy}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save</Text>}
      </Pressable>

      <Pressable
        style={styles.danger}
        onPress={() =>
          Alert.alert('Delete placement?', positionCode, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => void remove() },
          ])
        }
      >
        <Text style={styles.dangerText}>Delete placement</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wrap: { flex: 1, padding: 16, gap: 12, backgroundColor: '#f4f4f5' },
  field: { gap: 4 },
  label: { fontWeight: '700', color: '#3f3f46' },
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  btn: { borderRadius: 10, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
  danger: { padding: 12, alignItems: 'center' },
  dangerText: { color: '#b91c1c', fontWeight: '700' },
});
