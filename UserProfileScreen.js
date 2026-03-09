import React, { useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useMMKVString } from 'react-native-mmkv';
import { storage } from '../storage/mmkv';
import { useThemeColor } from '../hooks/useThemeColor';
import { Colors } from '../constants/Colors';

export default function ProfileScreen({ navigation }) {
  const [name, setName] = useMMKVString('user.name', storage) || 'User';
  const [email, setEmail] = useMMKVString('user.email', storage) || '';
  const [age, setAge] = useMMKVString('user.age', storage) || '';
  const [weight, setWeight] = useMMKVString('user.weight', storage) || '';
  const isOlder = parseInt(age) > 60;

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');
  const borderColor = useThemeColor({ light: '#ccc', dark: '#444' }, 'border');

  const handleLogout = () => {
    // Placeholder for auth logout; for now, reset navigation
    navigation.reset({
      index: 0,
      routes: [{ name: 'onboarding' }], // Assumes an onboarding screen exists
    });
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.title, isOlder && styles.largerText, { color: textColor }]}>
        Profile
      </Text>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, isOlder && styles.largerText, { color: textColor }]}>
          Name:
        </Text>
        <TextInput
          style={[styles.input, isOlder && styles.largerInput, { borderColor, backgroundColor: 'white' }]}
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, isOlder && styles.largerText, { color: textColor }]}>
          Email:
        </Text>
        <TextInput
          style={[styles.input, isOlder && styles.largerInput, { borderColor, backgroundColor: 'white' }]}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, isOlder && styles.largerText, { color: textColor }]}>
          Age:
        </Text>
        <TextInput
          style={[styles.input, isOlder && styles.largerInput, { borderColor, backgroundColor: 'white' }]}
          value={age}
          onChangeText={text => setAge(text.replace(/[^0-9]/g, ''))} // Numeric only
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, isOlder && styles.largerText, { color: textColor }]}>
          Weight:
        </Text>
        <TextInput
          style={[styles.input, isOlder && styles.largerInput, { borderColor, backgroundColor: 'white' }]}
          value={weight}
          onChangeText={setWeight}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, isOlder && styles.largerButton, { backgroundColor: primaryColor }]}
        onPress={handleLogout}
      >
        <Text style={[styles.buttonText, isOlder && styles.largerText, { color: '#fff' }]}>
          Logout
        </Text>
      </TouchableOpacity>
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
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  button: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  largerText: {
    fontSize: 20,
  },
  largerInput: {
    height: 48,
    fontSize: 18,
  },
  largerButton: {
    padding: 16,
  },
});