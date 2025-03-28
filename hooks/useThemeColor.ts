import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMMKVString } from 'react-native-mmkv';
import { storage } from '../storage/mmkv';
import { useThemeColor } from '../hooks/useThemeColor'; // Import the hook
import { Colors } from '../constants/Colors';

export default function Home() {
  const [userName] = useMMKVString('user.name', storage) || 'User';
  const [age] = useMMKVString('user.age', storage);
  const isOlder = parseInt(age) > 60;

  // Use theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');
  const shadowColor = useThemeColor({}, 'shadow');

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.title, isOlder && styles.largerText, { color: textColor }]}>
        Welcome back, {userName}!
      </Text>
      <Text style={[styles.subtitle, isOlder && styles.largerText, { color: textColor }]}>
        Your personal fitness companion.
      </Text>

      <View style={styles.navContainer}>
        <Link href="/scan" asChild>
          <TouchableOpacity
            style={[styles.navButton, isOlder && styles.largerButton, { backgroundColor, shadowColor }]}
          >
            <Ionicons name="camera-outline" size={24} color={primaryColor} />
            <Text style={[styles.navText, isOlder && styles.largerNavText, { color: textColor }]}>
              Scan Equipment
            </Text>
          </TouchableOpacity>
        </Link>
        {/* Repeat for other buttons, updating colors similarly */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  navContainer: {
    width: '100%',
    marginTop: 20,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    height: 60,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  navText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
  largerText: {
    fontSize: 20,
  },
  largerButton: {
    height: 70,
  },
  largerNavText: {
    fontSize: 18,
  },
});