import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CatalogProvider } from '../lib/CatalogContext';

export default function RootLayout() {
  return (
    <CatalogProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: '#1d4ed8',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#f4f4f5' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Sleeve finder' }} />
        <Stack.Screen
          name="product/[sku]"
          options={{ title: 'Product', presentation: 'modal' }}
        />
        <Stack.Screen name="admin/index" options={{ title: 'Admin' }} />
        <Stack.Screen name="admin/login" options={{ title: 'Admin login' }} />
        <Stack.Screen name="admin/product/[id]" options={{ title: 'Edit product' }} />
        <Stack.Screen name="admin/display" options={{ title: 'Display config' }} />
        <Stack.Screen name="admin/placement/[id]" options={{ title: 'Edit placement' }} />
      </Stack>
    </CatalogProvider>
  );
}
