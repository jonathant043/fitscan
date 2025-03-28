import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useMMKVString, useMMKVNumber } from 'react-native-mmkv';
import { storage } from '../storage/mmkv';
import { useThemeColor } from '../hooks/useThemeColor';
import { Colors } from '../constants/Colors';

export default function FitnessTrackingScreen() {
  const [age] = useMMKVString('user.age', storage);
  const [goal] = useMMKVString('user.goal', storage) || 'Weight Loss';
  const isOlder = parseInt(age) > 60;

  // Fitness data from MMKV
  const [steps] = useMMKVNumber('fitness.steps', storage) || 0;
  const [calories] = useMMKVNumber('fitness.calories', storage) || 0;
  const [workoutTime] = useMMKVNumber('fitness.workoutTime', storage) || 0;

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.title, isOlder && styles.largerText, { color: textColor }]}>
        Fitness Tracking
      </Text>
      <Text style={[styles.description, isOlder && styles.largerText, { color: textColor }]}>
        Track your workouts, steps, and more!
      </Text>
      <View style={styles.statsContainer}>
        <Text style={[styles.stat, isOlder && styles.largerText, { color: primaryColor }]}>
          Steps: {steps}
        </Text>
        <Text style={[styles.stat, isOlder && styles.largerText, { color: primaryColor }]}>
          Calories Burned: {calories}
        </Text>
        <Text style={[styles.stat, isOlder && styles.largerText, { color: primaryColor }]}>
          Workout Time: {workoutTime} min
        </Text>
        <Text style={[styles.stat, isOlder && styles.largerText, { color: textColor }]}>
          Goal: {goal}
        </Text>
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
  description: {
    fontSize: 16,
    marginBottom: 20,
  },
  statsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  stat: {
    fontSize: 18,
    marginVertical: 5,
  },
  largerText: {
    fontSize: 20, // Base size for larger text
  },
});