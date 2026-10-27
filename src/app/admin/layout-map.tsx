import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { ShelfHighlight } from '../../components/ShelfHighlight';
import { useAuth } from '../../lib/AuthContext';
import { useCatalog } from '../../lib/CatalogContext';
import { saveLocalLayoutMap } from '../../lib/localOverrides';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';

export default function AdminLayoutMapScreen() {
  const { catalog, refresh, theme } = useCatalog();
  const { loading: authLoading, isAdmin, isMockAdmin } = useAuth();
  const [svg, setSvg] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/admin/login');
      return;
    }
    if (catalog) {
      setSvg(catalog.layoutMap ?? '');
      setReady(true);
    }
  }, [authLoading, isAdmin, catalog]);

  const save = async () => {
    setBusy(true);
    try {
      if (isSupabaseConfigured && !isMockAdmin) {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase client missing');
        const { error } = await supabase
          .from('layout_map')
          .upsert({ id: 1, svg_markup: svg }, { onConflict: 'id' });
        if (error) throw error;
      } else {
        await saveLocalLayoutMap(svg);
      }
      await refresh();
      Alert.alert('Saved', 'Floor layout updated.');
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  if (!ready || authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Stack.Screen options={{ title: 'Floor layout' }} />
      <Text style={styles.hint}>
        Mini floor / rack overview SVG. Use data-shelf=&quot;N&quot; on edges/labels so product
        detail can blink the right shelf.
      </Text>
      <ShelfHighlight title="Preview" svgMarkup={svg} height={160} />
      <TextInput
        style={styles.editor}
        multiline
        autoCorrect={false}
        autoCapitalize="none"
        value={svg}
        onChangeText={setSvg}
        textAlignVertical="top"
      />
      <Pressable
        style={[styles.btn, { backgroundColor: theme.accent }]}
        onPress={() => void save()}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Save layout</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wrap: { padding: 14, gap: 12, paddingBottom: 40 },
  hint: { color: '#52525b', lineHeight: 20 },
  editor: {
    minHeight: 220,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  btn: { borderRadius: 10, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
