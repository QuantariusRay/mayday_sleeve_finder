import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FloorLayoutView } from '../../components/FloorLayoutView';
import { ShelfHighlight } from '../../components/ShelfHighlight';
import { useCatalog } from '../../lib/CatalogContext';
import { listShelfIds, placementsOnShelf } from '../../lib/shelves';

export default function ShelvesScreen() {
  const { catalog, loading, theme } = useCatalog();
  const insets = useSafeAreaInsets();
  const shelves = useMemo(() => listShelfIds(catalog), [catalog]);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ title: 'Shelves' }} />

      {loading && !catalog ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : (
        <FlatList
          data={shelves}
          keyExtractor={(n) => String(n)}
          contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 28, gap: 12 }}
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <Text style={styles.lead}>
                Browse physical shelves. Tap a shelf for its map and SKUs.
              </Text>
              <FloorLayoutView
                title="Floor layout"
                layoutMap={catalog?.layoutMap}
                height={170}
              />
            </View>
          }
          renderItem={({ item: shelf }) => {
            const count = placementsOnShelf(catalog, shelf).length;
            return (
              <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                onPress={() => router.push(`/shelves/${shelf}`)}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.shelfTitle}>Shelf {shelf}</Text>
                  <Text style={[styles.count, { color: theme.accent }]}>
                    {count} slot{count === 1 ? '' : 's'}
                  </Text>
                </View>
                {catalog?.shelfMaps[String(shelf)] ? (
                  <View style={styles.mapPreview} pointerEvents="none">
                    <ShelfHighlight
                      title=""
                      svgMarkup={catalog.shelfMaps[String(shelf)]}
                      height={160}
                    />
                  </View>
                ) : (
                  <Text style={styles.missing}>No map uploaded yet</Text>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerBlock: { gap: 10, marginBottom: 4 },
  lead: { color: '#52525b', lineHeight: 20, fontSize: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    padding: 12,
    gap: 8,
  },
  pressed: { opacity: 0.9 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shelfTitle: { fontSize: 18, fontWeight: '800', color: '#18181b' },
  count: { fontWeight: '700', fontSize: 13 },
  mapPreview: { marginTop: 4 },
  missing: { color: '#a1a1aa', fontStyle: 'italic', paddingVertical: 12 },
});
