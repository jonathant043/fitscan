import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Leaderboards() {
  const [stringValue, setStringValue] = useState<string | null>(null);
  const [numberValue, setNumberValue] = useState<number | null>(null);

  // Custom hook equivalent to useMMKVString
  const useAsyncString = (key: string) => {
    const [value, setValue] = useState<string | null>(null);
    
    useEffect(() => {
      AsyncStorage.getItem(key).then(setValue);
    }, [key]);

    const updateValue = async (newValue: string | null) => {
      if (newValue === null) {
        await AsyncStorage.removeItem(key);
      } else {
        await AsyncStorage.setItem(key, newValue);
      }
      setValue(newValue);
    };

    return [value, updateValue] as const;
  };

  // Custom hook equivalent to useMMKVNumber
  const useAsyncNumber = (key: string) => {
    const [value, setValue] = useState<number | null>(null);
    
    useEffect(() => {
      AsyncStorage.getItem(key).then(item => {
        setValue(item ? Number(item) : null);
      });
    }, [key]);

    const updateValue = async (newValue: number | null) => {
      if (newValue === null) {
        await AsyncStorage.removeItem(key);
      } else {
        await AsyncStorage.setItem(key, newValue.toString());
      }
      setValue(newValue);
    };

    return [value, updateValue] as const;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leaderboards</Text>
      <Text style={styles.subtitle}>Coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});