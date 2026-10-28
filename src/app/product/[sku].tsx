import { useMemo } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FloorLayoutView } from '../../components/FloorLayoutView';
import { PositionBadges } from '../../components/PositionBadges';
import { ShelfHighlight } from '../../components/ShelfHighlight';
import { useCatalog } from '../../lib/CatalogContext';
import { resolveThumbSource } from '../../lib/thumbs';

export default function ProductDetailScreen() {
  const { sku: rawSku } = useLocalSearchParams<{ sku: string }>();
  const sku = decodeURIComponent(rawSku ?? '');
  const { catalog, loading, theme, copy } = useCatalog();
  const insets = useSafeAreaInsets();

  const product = useMemo(
    () => catalog?.products.find((p) => p.sku === sku),
    [catalog, sku],
  );

  const shelves = useMemo(() => {
    if (!product) return [] as number[];
    const set = new Set<number>();
    for (const pos of product.positions) {
      const m = /^S(\d+)/.exec(pos);
      if (m) set.add(Number(m[1]));
    }
    return [...set].sort((a, b) => a - b);
  }, [product]);

  if (loading && !catalog) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={styles.missing}>Product {sku} not found</Text>
      </View>
    );
  }

  const thumb = resolveThumbSource(product);
  const dims =
    product.width_mm != null && product.height_mm != null
      ? `${product.width_mm}×${product.height_mm} mm`
      : '—';
  const blocks = catalog?.displayConfig.payload.detail.blocks ?? [
    'title',
    'meta',
    'positions',
    'layout_map',
    'shelf_maps',
    'pack_photo',
    'product_link',
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12 }}
    >
      <Stack.Screen options={{ title: product.sku }} />

      {blocks.includes('title') ? (
        <View>
          <Text style={styles.sku}>{product.sku}</Text>
          <Text style={styles.name}>{product.name}</Text>
        </View>
      ) : null}

      {blocks.includes('meta') ? (
        <Text style={styles.meta}>
          {product.brand} · {dims}
          {product.pack_count != null ? ` · ${product.pack_count}/pack` : ''}
          {` · ${product.is_premium ? 'Premium' : 'Standard'}`}
        </Text>
      ) : null}

      {blocks.includes('positions') ? (
        <View>
          <Text style={styles.section}>Shelf positions</Text>
          <PositionBadges
            positions={product.positions}
            emptyLabel={copy.noShelfPosition}
            accent={theme.accent}
          />
        </View>
      ) : null}

      {blocks.includes('layout_map') ? (
        <FloorLayoutView
          title="Floor layout"
          layoutMap={catalog?.layoutMap}
          highlightShelves={shelves}
          height={160}
        />
      ) : null}

      {blocks.includes('shelf_maps')
        ? shelves.map((shelf) => (
            <ShelfHighlight
              key={shelf}
              title={`Shelf ${shelf}`}
              svgMarkup={catalog?.shelfMaps[String(shelf)] ?? ''}
              highlightPositions={product.positions}
              height={240}
            />
          ))
        : null}

      {blocks.includes('pack_photo') ? (
        <View
          style={[
            styles.photoWrap,
            { backgroundColor: product.accent_color ?? '#e4e4e7' },
          ]}
        >
          {thumb ? (
            <Image source={thumb} style={styles.photo} contentFit="contain" />
          ) : (
            <Text style={styles.photoFallback}>No pack photo</Text>
          )}
        </View>
      ) : null}

      {blocks.includes('product_link') && product.product_url ? (
        <Pressable
          style={[styles.linkBtn, { backgroundColor: theme.accent }]}
          onPress={() => void Linking.openURL(product.product_url!)}
        >
          <Text style={styles.linkText}>{copy.productLinkLabel}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missing: { color: '#b91c1c' },
  sku: { fontSize: 14, fontWeight: '800', color: '#52525b' },
  name: { fontSize: 20, fontWeight: '800', color: '#18181b', marginTop: 4 },
  meta: { fontSize: 14, color: '#52525b' },
  section: { fontSize: 14, fontWeight: '700', marginBottom: 8, color: '#27272a' },
  photoWrap: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
  photoFallback: { color: '#fff', fontWeight: '700' },
  linkBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  linkText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
