import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCatalog } from '../../../lib/CatalogContext';
import { getSupabase, isSupabaseConfigured } from '../../../lib/supabase';
import { isCurrentUserAdmin } from '../../../lib/auth';

type Form = {
  sku: string;
  name: string;
  brand: string;
  width_mm: string;
  height_mm: string;
  pack_count: string;
  is_premium: boolean;
  product_url: string;
  accent_color: string;
  thumb_path: string;
};

const empty: Form = {
  sku: '',
  name: '',
  brand: 'mayday',
  width_mm: '',
  height_mm: '',
  pack_count: '',
  is_premium: false,
  product_url: '',
  accent_color: '#1d4ed8',
  thumb_path: '',
};

export default function AdminProductScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = decodeURIComponent(rawId ?? '');
  const isNew = id === 'new';
  const { catalog, refresh, theme } = useCatalog();
  const [form, setForm] = useState<Form>(empty);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const ok = await isCurrentUserAdmin();
      if (!ok) {
        router.replace('/admin/login');
        return;
      }
      if (!isNew && catalog) {
        const p = catalog.products.find((x) => x.id === id || x.sku === id);
        if (p) {
          setForm({
            sku: p.sku,
            name: p.name,
            brand: p.brand,
            width_mm: p.width_mm != null ? String(p.width_mm) : '',
            height_mm: p.height_mm != null ? String(p.height_mm) : '',
            pack_count: p.pack_count != null ? String(p.pack_count) : '',
            is_premium: p.is_premium,
            product_url: p.product_url ?? '',
            accent_color: p.accent_color ?? '',
            thumb_path: p.thumb_path ?? '',
          });
        }
      }
      setReady(true);
    })();
  }, [catalog, id, isNew]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const uploadThumb = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert('Supabase required for uploads');
      return;
    }
    const supabase = getSupabase();
    if (!supabase) return;

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets[0]) return;

    const asset = picked.assets[0];
    setBusy(true);
    try {
      const ext = asset.uri.split('.').pop()?.split('?')[0] || 'jpg';
      const path = `${form.sku || 'upload'}-${Date.now()}.${ext}`;
      const res = await fetch(asset.uri);
      const blob = await res.blob();
      const { error } = await supabase.storage
        .from('product-thumbs')
        .upload(path, blob, { contentType: asset.mimeType ?? 'image/jpeg', upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('product-thumbs').getPublicUrl(path);
      set('thumb_path', data.publicUrl);
      Alert.alert('Uploaded', 'Thumb URL set on the form — save to persist.');
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      Alert.alert('Supabase not configured');
      return;
    }
    if (!form.sku.trim() || !form.name.trim()) {
      Alert.alert('SKU and name are required');
      return;
    }
    setBusy(true);
    try {
      const row = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        brand: form.brand.trim() || 'mayday',
        width_mm: form.width_mm ? Number(form.width_mm) : null,
        height_mm: form.height_mm ? Number(form.height_mm) : null,
        pack_count: form.pack_count ? Number(form.pack_count) : null,
        is_premium: form.is_premium,
        product_url: form.product_url.trim() || null,
        accent_color: form.accent_color.trim() || null,
        thumb_path: form.thumb_path.trim() || null,
        is_active: true,
      };

      if (isNew) {
        const { error } = await supabase.from('products').insert(row);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').update(row).eq('id', id);
        if (error) {
          // fallback if id was sku
          const { error: e2 } = await supabase.from('products').update(row).eq('sku', id);
          if (e2) throw error;
        }
      }
      await refresh();
      router.back();
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
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
    <ScrollView contentContainerStyle={styles.wrap}>
      {(
        [
          ['sku', 'SKU'],
          ['name', 'Name'],
          ['brand', 'Brand'],
          ['width_mm', 'Width mm'],
          ['height_mm', 'Height mm'],
          ['pack_count', 'Pack count'],
          ['product_url', 'Product URL'],
          ['accent_color', 'Accent color'],
          ['thumb_path', 'Thumb URL / path'],
        ] as const
      ).map(([key, label]) => (
        <View key={key} style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={styles.input}
            value={form[key]}
            onChangeText={(v) => set(key, v)}
            autoCapitalize={key === 'sku' || key === 'brand' ? 'characters' : 'sentences'}
            editable={!(key === 'sku' && !isNew)}
          />
        </View>
      ))}

      <View style={styles.switchRow}>
        <Text style={styles.label}>Premium</Text>
        <Switch value={form.is_premium} onValueChange={(v) => set('is_premium', v)} />
      </View>

      <Pressable style={styles.secondary} onPress={() => void uploadThumb()} disabled={busy}>
        <Text style={styles.secondaryText}>Upload thumb</Text>
      </Pressable>

      <Pressable
        style={[styles.btn, { backgroundColor: theme.accent }]}
        onPress={() => void save()}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>{isNew ? 'Create' : 'Save'}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wrap: { padding: 16, gap: 12, paddingBottom: 40 },
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondary: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  secondaryText: { fontWeight: '700', color: '#1e3a8a' },
  btn: { borderRadius: 10, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
