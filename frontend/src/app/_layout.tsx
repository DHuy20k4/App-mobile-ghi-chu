import React, { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider } from '../context/AuthContext';
import { initDatabase } from '../services/database';

SplashScreen.preventAutoHideAsync();

// Bắt lỗi toàn cục của Expo Router để tránh lỗi "Cannot read property 'ErrorBoundary' of undefined"
export function ErrorBoundary(props: { error: Error; retry: () => void }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>⚠️ Ứng dụng gặp sự cố</Text>
      <Text style={styles.errorMessage}>{props.error?.message || 'Lỗi không xác định'}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={props.retry}>
        <Text style={styles.retryText}>Thử lại</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    initDatabase()
      .then(() => {
        console.log('SQLite Database initialized successfully');
      })
      .catch((err) => {
        console.error('Failed to initialize SQLite Database:', err);
      });
  }, []);

  return (
    <AuthProvider>
      <View style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? '#121212' : '#FFFFFF' }}>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFF5F5',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E53E3E',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#3182CE',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
