import type { ImageSource } from 'expo-image';
import { localThumbs } from '../data/localThumbs';
import type { Product } from './types';

export function resolveThumbSource(product: Product): ImageSource | number | null {
  const path = product.thumb_path;
  if (path && /^https?:\/\//i.test(path)) {
    return { uri: path };
  }
  const local = localThumbs[product.sku];
  if (local) return local as number;
  return null;
}
