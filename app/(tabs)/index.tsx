import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMMKVString } from 'react-native-mmkv';
import { storage } from '../storage/mmkv'; // Adjust path as needed

export default function Home() {
  const [userName] = useMMKVString('user.name', storage) || 'User';
  const [age] = useMMKVString('user.age', storage);
  const isOlder = parseInt(age) > 60;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, isOlder && styles.largerText]}>
        Welcome back, {userName}!
      </Text>
      <Text style={[styles.subtitle, isOlder && styles.largerText]}>
        Your personal fitness companion.
      </Text>

      <View style={styles.navContainer}>
        <Link href="/scan" asChild>
          <TouchableOpacity style={[styles.navButton, isOlder && styles.largerButton]}>
            <Ionicons name="camera-outline" size={24} color="#007AFF" />
            <Text style={[styles.navText, isOlder && styles.largerNavText]}>
              Scan Equipment
            </Text>
          </TouchableOpacity>
        </Link>

        <Link href="/fitness" asChild>
          <TouchableOpacity style={[styles.navButton, isOlder && styles.largerButton]}>
            <Ionicons name="barbell-outline" size={24} color="#007AFF" />
            <Text style={[styles.navText, isOlder && styles.largerNavText]}>
              Fitness Tracking
            </Text>
          </TouchableOpacity>
        </Link>

        <Link href="/profile" asChild>
          <TouchableOpacity style={[styles.navButton, isOlder && styles.largerButton]}>
            <Ionicons name="person-outline" size={24} color="#007AFF" />
            <Text style={[styles.navText, isOlder && styles.largerNavText]}>
              Profile
            </Text>
          </TouchableOpacity>
        </Link>

        <Link href="/workout" asChild>
          <TouchableOpacity style={[styles.navButton, isOlder && styles.largerButton]}>
            <Ionicons name="heart-outline" size={24} color="#007AFF" />
            <Text style={[styles.navText, isOlder && styles.largerNavText]}>
              Workout Generator
            </Text>
          </TouchableOpacity>
        </Link>

        <Link href="/logs" asChild>
          <TouchableOpacity style={[styles.navButton, isOlder && styles.largerButton]}>
            <Ionicons name="clipboard-outline" size={24} color="#007AFF" />
            <Text style={[styles.navText, isOlder && styles.largerNavText]}>
              Workout Logs
            </Text>
          </TouchableOpacity>
        </Link>

        <Link href="/leaderboard" asChild>
          <TouchableOpacity style={[styles.navButton, isOlder && styles.largerButton]}>
            <Ionicons name="trophy-outline" size={24} color="#007AFF" />
            <Text style={[styles.navText, isOlder && styles.largerNavText]}>
              Leaderboard
            </Text>
          </TouchableOpacity>
        </Link>
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
    backgroundColor: '#f8f8f8',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
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
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 12,
    height: 60,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  navText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
    color: '#333',
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