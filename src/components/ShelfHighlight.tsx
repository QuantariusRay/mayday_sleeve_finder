import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

type Props = {
  title: string;
  svgMarkup: string;
  /** Position codes to highlight (data-pos) and/or shelf ids (data-shelf). */
  highlightPositions?: string[];
  highlightShelves?: number[];
  height?: number;
};

function buildHtml(
  svg: string,
  positions: string[],
  shelves: number[],
): string {
  const posSel = positions.map((p) => `[data-pos="${p}"]`).join(',');
  const shelfSel = shelves.map((s) => `[data-shelf="${s}"]`).join(',');
  const selectors = [posSel, shelfSel].filter(Boolean).join(',');

  const css = `
    html, body { margin: 0; padding: 0; background: #fafafa; }
    svg { width: 100%; height: auto; display: block; }
    @keyframes maydayBlink {
      0%, 100% { opacity: 1; filter: drop-shadow(0 0 2px #f59e0b); }
      50% { opacity: 0.35; }
    }
    ${
      selectors
        ? `${selectors} {
      stroke: #f59e0b !important;
      stroke-width: 3px !important;
      fill: #fde68a !important;
      animation: maydayBlink 1s ease-in-out infinite;
    }`
        : ''
    }
  `;

  return `<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>${css}</style>
  </head><body>${svg}</body></html>`;
}

export function ShelfHighlight({
  title,
  svgMarkup,
  highlightPositions = [],
  highlightShelves = [],
  height = 220,
}: Props) {
  const html = useMemo(
    () => buildHtml(svgMarkup, highlightPositions, highlightShelves),
    [svgMarkup, highlightPositions.join('|'), highlightShelves.join('|')],
  );

  if (!svgMarkup) {
    return (
      <View style={[styles.box, { height }]}>
        <Text style={styles.missing}>No map for {title}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <View style={[styles.box, { height }]}>
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={styles.web}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#27272a',
    marginBottom: 6,
  },
  box: {
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fafafa',
  },
  web: { flex: 1, backgroundColor: 'transparent' },
  missing: { color: '#a1a1aa', padding: 16 },
});
