import { createElement, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
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
  const posSel = positions
    .map((p) => `[data-pos="${p.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`)
    .join(',');
  const shelfSel = shelves.map((s) => `[data-shelf="${s}"]`).join(',');
  const selectors = [posSel, shelfSel].filter(Boolean).join(',');

  const css = `
    html, body { margin: 0; padding: 8px; background: #fafafa; }
    svg { width: 100%; height: auto; display: block; max-height: 100%; }
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
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>${css}</style>
  </head><body>${svg}</body></html>`;
}

function SvgFrame({ html, height }: { html: string; height: number }) {
  // react-native-webview does not support web — use a real iframe there.
  if (Platform.OS === 'web') {
    return createElement('iframe', {
      srcDoc: html,
      title: 'Shelf map',
      style: {
        width: '100%',
        height,
        border: 'none',
        display: 'block',
        background: '#fafafa',
      },
      sandbox: 'allow-same-origin',
    });
  }

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      style={styles.web}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    />
  );
}

export function ShelfHighlight({
  title,
  svgMarkup,
  highlightPositions = [],
  highlightShelves = [],
  height = 220,
}: Props) {
  const posKey = highlightPositions.join('|');
  const shelfKey = highlightShelves.join('|');
  const html = useMemo(
    () => buildHtml(svgMarkup, highlightPositions, highlightShelves),
    // Keys capture array identity for highlighting; markup is the map body.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [svgMarkup, posKey, shelfKey],
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
        <SvgFrame html={html} height={height} />
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
