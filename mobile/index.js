import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { initializeDatabase } from '@pos/shared-services';

export default function RootLayout() {
  useEffect(() => {
    // Initialize the shared database adapter on app startup
    initializeDatabase().catch(error => {
      console.error('Failed to initialize database:', error);
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* App will be rendered by expo-router */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
