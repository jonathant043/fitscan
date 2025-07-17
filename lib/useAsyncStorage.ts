import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAsyncString = (key: string) => {
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

export const useAsyncNumber = (key: string) => {
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
