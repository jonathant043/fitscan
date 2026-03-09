// components/OfflineNotice.tsx
// Component to display when the user is offline

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { COLORS } from '../lib/constants';

export function OfflineNotice() {
  const { isOffline } = useNetworkStatus();

  if (!isOffline) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline" size={16} color={COLORS.text} />
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.warning,
    gap: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.background,
  },
});
