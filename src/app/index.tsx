import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Link, router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FilterBar } from '../components/FilterBar';
import { ProductCard } from '../components/ProductCard';
import { useAuth } from '../lib/AuthContext';
import { useCatalog } from '../lib/CatalogContext';
import { filterProducts } from '../lib/filter';
import { isSupabaseConfigured } from '../lib/supabase';
import type { FinderFilters, Product } from '../lib/types';

function defaultFilters(tol: number): FinderFilters {
  return {
    query: '',
    width: '',
    height: '',
    tolerance: String(tol),
    premium: 'all',
  };
}

export default function FinderScreen() {
  const { catalog, loading, error, refresh, theme, copy, header, filtersConfig, card } =
    useCatalog();
  const { isAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const columns = width < 360 ? 1 : 2;

  const [filters, setFilters] = useState<FinderFilters>(() =>
    defaultFilters(filtersConfig.toleranceDefault),
  );

  const products = catalog?.products ?? [];
  const filtered = useMemo(
    () => filterProducts(products, filters),
    [products, filters],
  );

  const countLabel = (copy.countFormat || '{n} / {total}')
    .replace('{n}', String(filtered.length))
    .replace('{total}', String(products.length));

  const clear = () => setFilters(defaultFilters(filtersConfig.toleranceDefault));

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Stack.Screen
        options={{
          title: header.title,
          headerRight: () => (
            <View style={styles.headerRight}>
              <Link href="/shelves" asChild>
                <Pressable hitSlop={10} style={styles.adminLink}>
                  <Text style={[styles.adminText, { color: theme.accent }]}>Shelves</Text>
                </Pressable>
              </Link>
              <Link href={isAdmin ? '/admin' : '/admin/login'} asChild>
                <Pressable hitSlop={10} style={styles.adminLink}>
                  <Text style={[styles.adminText, { color: theme.accent }]}>
                    {isAdmin ? 'Admin' : 'Login'}
                  </Text>
                </Pressable>
              </Link>
            </View>
          ),
        }}
      />

      <FilterBar
        value={filters}
        onChange={setFilters}
        onClear={clear}
        resultLabel={countLabel}
        filtersConfig={filtersConfig}
        clearLabel={copy.clearLabel}
        accent={theme.accent}
      />

      {!isSupabaseConfigured ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Using local seed (mock). Set EXPO_PUBLIC_SUPABASE_URL + ANON_KEY for live data.
          </Text>
        </View>
      ) : catalog?.source === 'mock' ? (
        <View style={[styles.banner, styles.bannerWarn]}>
          <Text style={styles.bannerText}>
            Supabase unreachable — showing local seed fallback.
          </Text>
        </View>
      ) : null}

      {loading && !catalog ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} size="large" />
          <Text style={styles.muted}>Loading catalog…</Text>
        </View>
      ) : error && !catalog ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => void refresh()} style={styles.retry}>
            <Text style={{ color: theme.accent, fontWeight: '700' }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          key={columns}
          keyExtractor={(item: Product) => item.sku}
          numColumns={columns}
          contentContainerStyle={{
            padding: 10,
            paddingBottom: insets.bottom + 24,
            gap: 10,
          }}
          columnWrapperStyle={columns > 1 ? styles.row : undefined}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => void refresh()} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No sleeves match</Text>
              <Text style={styles.muted}>Try clearing filters or widening ±tolerance.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.cell, columns === 1 && styles.cellFull]}>
              <ProductCard
                product={item}
                card={card}
                noShelfLabel={copy.noShelfPosition}
                accent={theme.accent}
                premiumBorder={theme.premiumBorder}
                onPress={() => router.push(`/product/${encodeURIComponent(item.sku)}`)}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  adminLink: { paddingHorizontal: 8, paddingVertical: 4 },
  adminText: { fontWeight: '700', fontSize: 15 },
  banner: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bannerWarn: { backgroundColor: '#fef3c7' },
  bannerText: { fontSize: 12, color: '#3730a3' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: '#71717a', fontSize: 14 },
  error: { color: '#b91c1c', paddingHorizontal: 24, textAlign: 'center' },
  retry: { padding: 8 },
  row: { gap: 10 },
  cell: { flex: 1 },
  cellFull: { width: '100%' },
  empty: { paddingTop: 48, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#3f3f46' },
});
