import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useThemeColor } from '../../hooks/useThemeColor';
import { Colors } from '../../constants/Colors';
import { useMMKVString } from 'react-native-mmkv';
import { storage } from '../../storage/mmkv';

export default function ExploreScreen() {
  const [age] = useMMKVString('user.age', storage);
  const isOlder = age ? parseInt(age) > 60 : false;
  const backgroundColor = useThemeColor({ light: Colors.light.background, dark: Colors.dark.background }, 'background');
  const textColor = useThemeColor({ light: Colors.light.text, dark: Colors.dark.text }, 'text');

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.title, isOlder && styles.largerText, { color: textColor }]}>
        Explore
      </Text>
      <Text style={[styles.text, isOlder && styles.largerText, { color: textColor }]}>
        Discover new workouts and community content.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
  },
  largerText: {
    fontSize: 20,
  },
});