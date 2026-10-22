import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { DisplayConfigPayload, FinderFilters, PremiumFilter } from '../lib/types';

type Props = {
  value: FinderFilters;
  onChange: (next: FinderFilters) => void;
  onClear: () => void;
  resultLabel: string;
  filtersConfig: DisplayConfigPayload['filters'];
  clearLabel: string;
  accent: string;
};

const SEGMENTS: { id: PremiumFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'standard', label: 'Standard' },
  { id: 'premium', label: 'Premium' },
];

export function FilterBar({
  value,
  onChange,
  onClear,
  resultLabel,
  filtersConfig,
  clearLabel,
  accent,
}: Props) {
  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.search}
        placeholder={filtersConfig.searchPlaceholder}
        placeholderTextColor="#a1a1aa"
        value={value.query}
        onChangeText={(query) => onChange({ ...value, query })}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      <View style={styles.sizeRow}>
        <TextInput
          style={[styles.sizeInput, styles.flex]}
          placeholder="W mm"
          placeholderTextColor="#a1a1aa"
          keyboardType="decimal-pad"
          value={value.width}
          onChangeText={(width) => onChange({ ...value, width })}
        />
        <Text style={styles.times}>×</Text>
        <TextInput
          style={[styles.sizeInput, styles.flex]}
          placeholder="H mm"
          placeholderTextColor="#a1a1aa"
          keyboardType="decimal-pad"
          value={value.height}
          onChangeText={(height) => onChange({ ...value, height })}
        />
        <Text style={styles.tolLabel}>±</Text>
        <TextInput
          style={styles.tolInput}
          placeholder="1"
          placeholderTextColor="#a1a1aa"
          keyboardType="decimal-pad"
          value={value.tolerance}
          onChangeText={(tolerance) => onChange({ ...value, tolerance })}
        />
      </View>

      {filtersConfig.showPremiumSegment ? (
        <View style={styles.segment}>
          {SEGMENTS.map((seg) => {
            const active = value.premium === seg.id;
            return (
              <Pressable
                key={seg.id}
                onPress={() => onChange({ ...value, premium: seg.id })}
                style={[styles.segBtn, active && { backgroundColor: accent }]}
              >
                <Text style={[styles.segText, active && styles.segTextActive]}>{seg.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.count}>{resultLabel}</Text>
        <Pressable onPress={onClear} hitSlop={8}>
          <Text style={[styles.clear, { color: accent }]}>{clearLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d4d4d8',
    gap: 8,
  },
  search: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sizeInput: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  flex: { flex: 1 },
  times: { color: '#71717a', fontWeight: '600' },
  tolLabel: { color: '#71717a', fontWeight: '600' },
  tolInput: {
    width: 52,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 15,
    backgroundColor: '#fafafa',
    textAlign: 'center',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    padding: 3,
    gap: 2,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  segText: { fontSize: 13, fontWeight: '600', color: '#3f3f46' },
  segTextActive: { color: '#fff' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  count: { fontSize: 13, color: '#52525b', fontWeight: '600' },
  clear: { fontSize: 14, fontWeight: '700' },
});
