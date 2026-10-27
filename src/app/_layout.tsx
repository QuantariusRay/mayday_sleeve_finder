import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/AuthContext';
import { CatalogProvider } from '../lib/CatalogContext';

export default function RootLayout() {
  return (
    <CatalogProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerTintColor: '#1d4ed8',
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: '#f4f4f5' },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Sleeve finder' }} />
          <Stack.Screen name="shelves/index" options={{ title: 'Shelves' }} />
          <Stack.Screen name="shelves/[id]" options={{ title: 'Shelf' }} />
          <Stack.Screen
            name="product/[sku]"
            options={{ title: 'Product', presentation: 'modal' }}
          />
          <Stack.Screen name="admin/index" options={{ title: 'Admin' }} />
          <Stack.Screen name="admin/login" options={{ title: 'Staff login' }} />
          <Stack.Screen name="admin/shelves/index" options={{ title: 'Configure shelves' }} />
          <Stack.Screen name="admin/shelves/[id]" options={{ title: 'Edit shelf' }} />
          <Stack.Screen name="admin/layout-map" options={{ title: 'Floor layout' }} />
          <Stack.Screen name="admin/product/[id]" options={{ title: 'Edit product' }} />
          <Stack.Screen name="admin/display" options={{ title: 'Display config' }} />
          <Stack.Screen name="admin/placement/[id]" options={{ title: 'Edit placement' }} />
        </Stack>
      </AuthProvider>
    </CatalogProvider>
  );
}
