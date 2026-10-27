import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { useCatalog } from '../../lib/CatalogContext';
import { isSupabaseConfigured } from '../../lib/supabase';

export default function AdminLoginScreen() {
  const { theme } = useCatalog();
  const { signIn, enableMockAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      router.replace('/admin');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const onDemo = async () => {
    setBusy(true);
    setError(null);
    try {
      await enableMockAdmin();
      router.replace('/admin/shelves');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Demo login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Staff sign in</Text>
      <Text style={styles.body}>
        Admins can configure shelf maps, placements, products, and display settings.
      </Text>

      {isSupabaseConfigured ? (
        <>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            style={[styles.btn, { backgroundColor: theme.accent }]}
            onPress={() => void onSubmit()}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Sign in</Text>
            )}
          </Pressable>
        </>
      ) : (
        <>
          <View style={styles.note}>
            <Text style={styles.noteText}>
              Supabase is not configured yet. Use demo admin to try shelf layout editing
              locally, or set EXPO_PUBLIC_SUPABASE_URL + ANON_KEY and add your user to
              admin_users.
            </Text>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            style={[styles.btn, { backgroundColor: theme.accent }]}
            onPress={() => void onDemo()}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Continue as demo admin</Text>
            )}
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, gap: 12, backgroundColor: '#f4f4f5' },
  title: { fontSize: 22, fontWeight: '800', color: '#18181b' },
  body: { color: '#52525b', lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  btn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  error: { color: '#b91c1c' },
  note: {
    backgroundColor: '#e0e7ff',
    borderRadius: 10,
    padding: 12,
  },
  noteText: { color: '#312e81', lineHeight: 19, fontSize: 13 },
});
