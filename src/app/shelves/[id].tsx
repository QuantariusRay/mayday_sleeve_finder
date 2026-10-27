import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PositionBadges } from '../../components/PositionBadges';
import { ShelfHighlight } from '../../components/ShelfHighlight';
import { useAuth } from '../../lib/AuthContext';
import { useCatalog } from '../../lib/CatalogContext';
import {
  placementsOnShelf,
  positionCodesOnShelf,
  productsOnShelf,
} from '../../lib/shelves';

export default function ShelfDetailScreen() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const shelf = Number(raw);
  const { catalog, loading, theme, copy } = useCatalog();
  const { isAdmin } = useAuth();
  const insets = useSafeAreaInsets();

  const products = useMemo(() => productsOnShelf(catalog, shelf), [catalog, shelf]);
  const positions = useMemo(
    () => positionCodesOnShelf(catalog, shelf),
    [catalog, shelf],
  );
  const placements = useMemo(
    () => placementsOnShelf(catalog, shelf),
    [catalog, shelf],
  );

  if (!Number.isFinite(shelf)) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Invalid shelf</Text>
      </View>
    );
  }

  if (loading && !catalog) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  const svg = catalog?.shelfMaps[String(shelf)] ?? '';

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Stack.Screen
        options={{
          title: `Shelf ${shelf}`,
          headerRight: () =>
            isAdmin ? (
              <Pressable
                hitSlop={8}
                onPress={() => router.push(`/admin/shelves/${shelf}`)}
              >
                <Text style={{ color: theme.accent, fontWeight: '700' }}>Edit</Text>
              </Pressable>
            ) : null,
        }}
      />

      <FlatList
        data={products}
        keyExtractor={(row) => row.product.sku}
        contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 28, gap: 10 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.meta}>
              {placements.length} placement{placements.length === 1 ? '' : 's'} ·{' '}
              {products.length} SKU{products.length === 1 ? '' : 's'}
            </Text>
            {svg ? (
              <ShelfHighlight
                title="Shelf map"
                svgMarkup={svg}
                highlightPositions={positions}
                height={280}
              />
            ) : (
              <Text style={styles.missing}>No SVG map for this shelf yet.</Text>
            )}
            <Text style={styles.section}>Products on this shelf</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.missing}>No placements on this shelf.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              router.push(`/product/${encodeURIComponent(item.product.sku)}`)
            }
          >
            <Text style={styles.sku}>{item.product.sku}</Text>
            <Text style={styles.name} numberOfLines={2}>
              {item.product.name}
            </Text>
            <PositionBadges
              positions={item.positions}
              emptyLabel={copy.noShelfPosition}
              accent={theme.accent}
            />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#b91c1c' },
  header: { gap: 8, marginBottom: 4 },
  meta: { color: '#52525b', fontWeight: '600' },
  section: { fontSize: 16, fontWeight: '800', color: '#18181b', marginTop: 4 },
  missing: { color: '#a1a1aa', fontStyle: 'italic', paddingVertical: 8 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    padding: 12,
    gap: 6,
  },
  sku: { fontWeight: '800', color: '#18181b' },
  name: { color: '#3f3f46', fontSize: 13, lineHeight: 17 },
});
