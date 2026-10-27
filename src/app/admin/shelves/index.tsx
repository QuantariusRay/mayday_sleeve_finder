import { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, router, Stack } from 'expo-router';
import { useAuth } from '../../../lib/AuthContext';
import { useCatalog } from '../../../lib/CatalogContext';
import { listShelfIds, placementsOnShelf } from '../../../lib/shelves';

export default function AdminShelvesScreen() {
  const { catalog, theme } = useCatalog();
  const { loading, isAdmin } = useAuth();
  const shelves = listShelfIds(catalog);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/admin/login');
    }
  }, [loading, isAdmin]);

  if (loading || !isAdmin) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'Configure shelves' }} />
      <View style={styles.toolbar}>
        <Text style={styles.hint}>
          Edit each shelf’s SVG map and slot placements. Changes publish for everyone when
          Supabase is connected; otherwise they stay on this device (demo admin).
        </Text>
        <Link href="/admin/layout-map" asChild>
          <Pressable style={styles.chip}>
            <Text style={styles.chipText}>Edit floor layout</Text>
          </Pressable>
        </Link>
      </View>
      <FlatList
        data={shelves}
        keyExtractor={(n) => String(n)}
        contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={styles.hint}>No shelves in catalog yet.</Text>
        }
        renderItem={({ item: shelf }) => {
          const count = placementsOnShelf(catalog, shelf).length;
          const hasMap = Boolean(catalog?.shelfMaps[String(shelf)]);
          return (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/admin/shelves/${shelf}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Shelf {shelf}</Text>
                <Text style={styles.meta}>
                  {count} placements · map {hasMap ? 'present' : 'missing'}
                </Text>
              </View>
              <Text style={{ color: theme.accent, fontWeight: '700' }}>Edit</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toolbar: { padding: 12, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4e4e7' },
  hint: { color: '#52525b', lineHeight: 20, fontSize: 13 },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chipText: { fontWeight: '700', color: '#1e3a8a' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    padding: 14,
  },
  title: { fontWeight: '800', fontSize: 16, color: '#18181b' },
  meta: { color: '#71717a', marginTop: 4, fontSize: 13 },
});
