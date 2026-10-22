import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { loadCatalog } from './catalog';
import type { CatalogSnapshot, DisplayConfigPayload } from './types';

type CatalogContextValue = {
  catalog: CatalogSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  theme: DisplayConfigPayload['theme'];
  copy: DisplayConfigPayload['copy'];
  header: DisplayConfigPayload['header'];
  filtersConfig: DisplayConfigPayload['filters'];
  card: DisplayConfigPayload['card'];
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

const fallbackTheme = {
  accent: '#1d4ed8',
  premiumBorder: '#8b5cf6',
  bg: '#f4f4f5',
};

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<CatalogSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await loadCatalog();
      setCatalog(snap);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<CatalogContextValue>(() => {
    const payload = catalog?.displayConfig.payload;
    return {
      catalog,
      loading,
      error,
      refresh,
      theme: payload?.theme ?? fallbackTheme,
      copy: payload?.copy ?? {
        noShelfPosition: 'no shelf position',
        countFormat: '{n} / {total}',
        productLinkLabel: 'Product page →',
        clearLabel: 'Clear',
      },
      header: payload?.header ?? { title: 'Sleeve finder', subtitle: null },
      filtersConfig: payload?.filters ?? {
        searchPlaceholder: 'SKU or name (e.g. 7039)',
        toleranceDefault: 1,
        showPremiumSegment: true,
      },
      card: payload?.card ?? {
        showThumb: true,
        showDims: true,
        showPackMeta: true,
        showPositionBadges: true,
      },
    };
  }, [catalog, loading, error, refresh]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider');
  return ctx;
}
