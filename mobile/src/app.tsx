import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import React from 'react';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen 
          name="index" 
          options={{ 
            headerShown: false,
            title: 'Login' 
          }} 
        />
        <Stack.Screen 
          name="pos" 
          options={{ 
            headerShown: true,
            title: 'Point of Sale' 
          }} 
        />
        <Stack.Screen 
          name="inventory" 
          options={{ 
            headerShown: true,
            title: 'Inventory' 
          }} 
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
