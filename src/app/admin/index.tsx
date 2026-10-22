import { useCallback, useEffect, useState } from 'react';
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
import {
  getSession,
  isCurrentUserAdmin,
  signOut,
} from '../../lib/auth';
import { useCatalog } from '../../lib/CatalogContext';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';
import type { Product } from '../../lib/types';

export default function AdminHomeScreen() {
  const { catalog, refresh, theme } = useCatalog();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [busySku, setBusySku] = useState<string | null>(null);

  const gate = useCallback(async () => {
    setChecking(true);
    if (!isSupabaseConfigured) {
      setAllowed(false);
      setChecking(false);
      return;
    }
    const session = await getSession();
    if (!session) {
      router.replace('/admin/login');
      return;
    }
    setEmail(session.user.email ?? null);
    const ok = await isCurrentUserAdmin();
    setAllowed(ok);
    setChecking(false);
  }, []);

  useEffect(() => {
    void gate();
  }, [gate]);

  const deactivate = async (product: Product) => {
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

  if (checking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Admin needs Supabase</Text>
        <Text style={styles.body}>
          Configure env vars, run migrations, seed the catalog, add your user to{' '}
          <Text style={styles.mono}>admin_users</Text>, then sign in.
        </Text>
        <Link href="/admin/login" asChild>
          <Pressable style={[styles.btn, { backgroundColor: theme.accent }]}>
            <Text style={styles.btnText}>Open login</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  if (!allowed) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Not an admin</Text>
        <Text style={styles.body}>
          Signed in as {email ?? 'unknown'}, but no matching row in admin_users.
        </Text>
        <Pressable
          style={[styles.btn, { backgroundColor: theme.accent }]}
          onPress={async () => {
            await signOut();
            router.replace('/admin/login');
          }}
        >
          <Text style={styles.btnText}>Sign out</Text>
        </Pressable>
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
        <Text style={styles.subtle}>{email}</Text>
        <View style={styles.toolbarRow}>
          <Link href="/admin/display" asChild>
            <Pressable style={styles.chip}>
              <Text style={styles.chipText}>Display config</Text>
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
            <Text style={styles.section}>Placements</Text>
            {placements.slice(0, 40).map((pl) => (
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
            {placements.length > 40 ? (
              <Text style={styles.subtle}>Showing first 40 placements…</Text>
            ) : null}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wrap: { flex: 1, padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '800' },
  body: { color: '#52525b', lineHeight: 20 },
  mono: { fontFamily: 'monospace' },
  btn: { borderRadius: 10, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
  toolbar: { padding: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4e4e7' },
  toolbarRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chipText: { fontWeight: '700', color: '#1e3a8a' },
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
