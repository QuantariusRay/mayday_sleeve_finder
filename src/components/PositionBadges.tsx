import { StyleSheet, Text, View } from 'react-native';

type Props = {
  positions: string[];
  emptyLabel: string;
  accent?: string;
};

export function PositionBadges({ positions, emptyLabel, accent = '#1d4ed8' }: Props) {
  if (!positions.length) {
    return <Text style={styles.empty}>{emptyLabel}</Text>;
  }
  return (
    <View style={styles.row}>
      {positions.map((pos) => (
        <View key={pos} style={[styles.badge, { backgroundColor: accent }]}>
          <Text style={styles.badgeText}>{pos}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    color: '#71717a',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
