import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { DisplayConfigPayload, Product } from '../lib/types';
import { resolveThumbSource } from '../lib/thumbs';
import { PositionBadges } from './PositionBadges';

type Props = {
  product: Product;
  card: DisplayConfigPayload['card'];
  noShelfLabel: string;
  accent: string;
  premiumBorder: string;
  onPress: () => void;
};

export function ProductCard({
  product,
  card,
  noShelfLabel,
  accent,
  premiumBorder,
  onPress,
}: Props) {
  const thumb = resolveThumbSource(product);
  const dims =
    product.width_mm != null && product.height_mm != null
      ? `${product.width_mm}×${product.height_mm} mm`
      : '—';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        product.is_premium && { borderColor: premiumBorder, borderWidth: 2 },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${product.sku} ${product.name}`}
    >
      {card.showThumb ? (
        <View style={[styles.thumbWrap, { backgroundColor: product.accent_color ?? '#e4e4e7' }]}>
          {thumb ? (
            <Image source={thumb} style={styles.thumb} contentFit="contain" />
          ) : (
            <Text style={styles.thumbFallback}>{product.sku.slice(-4)}</Text>
          )}
        </View>
      ) : null}

      <Text style={styles.sku}>{product.sku}</Text>
      {card.showDims ? <Text style={styles.dims}>{dims}</Text> : null}
      <Text style={styles.name} numberOfLines={3}>
        {product.name}
      </Text>
      {card.showPackMeta ? (
        <Text style={styles.meta}>
          {product.brand}
          {product.pack_count != null ? ` · ${product.pack_count}/pack` : ''}
          {product.is_premium ? ' · Premium' : ' · Standard'}
        </Text>
      ) : null}
      {card.showPositionBadges ? (
        <View style={styles.badges}>
          <PositionBadges
            positions={product.positions}
            emptyLabel={noShelfLabel}
            accent={accent}
          />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    minHeight: 220,
  },
  pressed: { opacity: 0.85 },
  thumbWrap: {
    height: 96,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  thumb: { width: '100%', height: '100%' },
  thumbFallback: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
  sku: { fontWeight: '800', fontSize: 13, color: '#18181b' },
  dims: { fontSize: 12, color: '#52525b', marginTop: 2 },
  name: { fontSize: 13, color: '#27272a', marginTop: 4, lineHeight: 17 },
  meta: { fontSize: 11, color: '#71717a', marginTop: 6 },
  badges: { marginTop: 8 },
});
