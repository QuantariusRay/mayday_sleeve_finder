import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, router, Stack } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { useCatalog } from '../../lib/CatalogContext';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';
import type { Product } from '../../lib/types';

export default function AdminHomeScreen() {
  const { catalog, refresh, theme } = useCatalog();
  const { loading, isAdmin, isMockAdmin, email, signOut } = useAuth();
  const [busySku, setBusySku] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/admin/login');
    }
  }, [loading, isAdmin]);

  const deactivate = async (product: Product) => {
    if (!isSupabaseConfigured || isMockAdmin) {
      Alert.alert(
        'Needs Supabase',
        'Product deactivate writes to Postgres. Configure Supabase or edit the seed offline.',
      );
      return;
    }
    const supabase = getSupabase();
    if (!supabase) return;
    setBusySku(product.sku);
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('sku', product.sku);
      if (error) throw error;
      await refresh();
    } catch (e) {
      Alert.alert('Delete failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusySku(null);
    }
  };

  if (loading || !isAdmin) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  const products = catalog?.products ?? [];
  const placements = catalog?.placements ?? [];

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={async () => {
                await signOut();
                router.replace('/admin/login');
              }}
              hitSlop={8}
            >
              <Text style={{ color: theme.accent, fontWeight: '700' }}>Sign out</Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.toolbar}>
        <Text style={styles.subtle}>
          {email}
          {isMockAdmin ? ' · demo admin' : ''}
        </Text>
        <View style={styles.toolbarRow}>
          <Link href="/admin/shelves" asChild>
            <Pressable style={[styles.chip, styles.chipPrimary]}>
              <Text style={[styles.chipText, styles.chipPrimaryText]}>Shelves</Text>
            </Pressable>
          </Link>
          <Link href="/admin/layout-map" asChild>
            <Pressable style={styles.chip}>
              <Text style={styles.chipText}>Floor layout</Text>
            </Pressable>
          </Link>
          <Link href="/admin/display" asChild>
            <Pressable style={styles.chip}>
              <Text style={styles.chipText}>Display</Text>
            </Pressable>
          </Link>
          <Pressable
            style={styles.chip}
            onPress={() => router.push('/admin/product/new')}
          >
            <Text style={styles.chipText}>New product</Text>
          </Pressable>
        </View>
        <Text style={styles.section}>
          Products ({products.length}) · Placements ({placements.length})
        </Text>
      </View>

      <FlatList
        data={products}
        keyExtractor={(p) => p.sku}
        contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              style={{ flex: 1 }}
              onPress={() =>
                router.push(`/admin/product/${encodeURIComponent(item.id)}`)
              }
            >
              <Text style={styles.sku}>{item.sku}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.meta}>
                {item.positions.length
                  ? item.positions.join(', ')
                  : 'no shelf position'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                Alert.alert('Deactivate product?', item.sku, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Deactivate',
                    style: 'destructive',
                    onPress: () => void deactivate(item),
                  },
                ])
              }
              disabled={busySku === item.sku}
            >
              <Text style={styles.danger}>
                {busySku === item.sku ? '…' : 'Deactivate'}
              </Text>
            </Pressable>
          </View>
        )}
        ListFooterComponent={
          <View style={{ marginTop: 16, gap: 8 }}>
            <Text style={styles.section}>Recent placements</Text>
            {placements.slice(0, 30).map((pl) => (
              <Pressable
                key={pl.position_code}
                style={styles.placeRow}
                onPress={() =>
                  router.push(
                    `/admin/placement/${encodeURIComponent(pl.id ?? pl.position_code)}`,
                  )
                }
              >
                <Text style={styles.sku}>{pl.position_code}</Text>
                <Text style={styles.meta}>{pl.sku}</Text>
              </Pressable>
            ))}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toolbar: {
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
  },
  toolbarRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chipPrimary: { backgroundColor: '#1d4ed8' },
  chipText: { fontWeight: '700', color: '#1e3a8a' },
  chipPrimaryText: { color: '#fff' },
  section: { fontWeight: '800', color: '#27272a', marginTop: 4 },
  subtle: { color: '#71717a', fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  placeRow: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  sku: { fontWeight: '800', color: '#18181b' },
  name: { color: '#3f3f46', marginTop: 2 },
  meta: { color: '#71717a', fontSize: 12, marginTop: 4 },
  danger: { color: '#b91c1c', fontWeight: '700' },
});
