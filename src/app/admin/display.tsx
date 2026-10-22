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
import { router } from 'expo-router';
import { isCurrentUserAdmin } from '../../lib/auth';
import { useCatalog } from '../../lib/CatalogContext';
import { getSupabase } from '../../lib/supabase';

export default function AdminDisplayScreen() {
  const { catalog, refresh, theme } = useCatalog();
  const [json, setJson] = useState('');
  const [version, setVersion] = useState(1);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const ok = await isCurrentUserAdmin();
      if (!ok) {
        router.replace('/admin/login');
        return;
      }
      if (catalog) {
        setJson(JSON.stringify(catalog.displayConfig.payload, null, 2));
        setVersion(catalog.displayConfig.version);
      }
      setReady(true);
    })();
  }, [catalog]);

  const save = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      Alert.alert('Supabase not configured');
      return;
    }
    let payload: unknown;
    try {
      payload = JSON.parse(json);
    } catch {
      Alert.alert('Invalid JSON');
      return;
    }
    setBusy(true);
    try {
      const nextVersion = version + 1;
      const { error } = await supabase.from('display_config').upsert(
        {
          key: 'mobile_home',
          version: nextVersion,
          payload,
        },
        { onConflict: 'key' },
      );
      if (error) throw error;
      setVersion(nextVersion);
      await refresh();
      Alert.alert('Saved', `Display config v${nextVersion}`);
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.hint}>
        Edit the mobile_home display_config payload (theme, filters, card, detail blocks,
        copy). Unknown keys are ignored by the client.
      </Text>
      <Text style={styles.meta}>Current version: {version}</Text>
      <TextInput
        style={styles.editor}
        multiline
        autoCorrect={false}
        autoCapitalize="none"
        value={json}
        onChangeText={setJson}
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
          <Text style={styles.btnText}>Save & publish</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wrap: { padding: 16, gap: 12, paddingBottom: 40 },
  hint: { color: '#52525b', lineHeight: 20 },
  meta: { fontWeight: '700', color: '#3f3f46' },
  editor: {
    minHeight: 360,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    fontFamily: 'monospace',
    fontSize: 13,
  },
  btn: { borderRadius: 10, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
