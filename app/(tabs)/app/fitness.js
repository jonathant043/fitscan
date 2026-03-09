import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useMMKVString, useMMKVNumber } from 'react-native-mmkv';
import { storage } from '../storage/mmkv';
import { useThemeColor } from '../hooks/useThemeColor';
import { Colors } from '../constants/Colors';

export default function Fitness() {
  const [age] = useMMKVString('user.age', storage);
  const [goal] = useMMKVString('user.goal', storage) || 'Weight Loss';
  const [caloriesGoal] = useMMKVNumber('user.caloriesGoal', storage) || 500; // Example goal
  const isOlder = parseInt(age) > 60;

  // Fitness data from MMKV (could integrate with sensors or workout logs)
  const [steps] = useMMKVNumber('fitness.steps', storage) || 8500;
  const [calories] = useMMKVNumber('fitness.calories', storage) || 400;
  const [workoutTime] = useMMKVNumber('fitness.workoutTime', storage) || 45;

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');
  const shadowColor = useThemeColor({}, 'shadow');

  // Calculate progress (example for calories)
  const progress = Math.min((calories / caloriesGoal) * 100, 100).toFixed(0);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.title, isOlder && styles.largerText, { color: textColor }]}>
        Fitness Tracking
      </Text>
      <Text style={[styles.subtitle, isOlder && styles.largerText, { color: textColor }]}>
        Goal: {goal} | Progress: {progress}%
      </Text>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor, shadowColor }]}>
          <Text style={[styles.statValue, isOlder && styles.largerText, { color: primaryColor }]}>
            {steps}
          </Text>
          <Text style={[styles.statLabel, isOlder && styles.largerText, { color: textColor }]}>
            Steps
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor, shadowColor }]}>
          <Text style={[styles.statValue, isOlder && styles.largerText, { color: primaryColor }]}>
            {calories}
          </Text>
          <Text style={[styles.statLabel, isOlder && styles.largerText, { color: textColor }]}>
            Calories Burned
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor, shadowColor }]}>
          <Text style={[styles.statValue, isOlder && styles.largerText, { color: primaryColor }]}>
            {workoutTime} min
          </Text>
          <Text style={[styles.statLabel, isOlder && styles.largerText, { color: textColor }]}>
            Workout Time
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  statCard: {
    flex: 1,
    marginHorizontal: 5,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 5,
  },
  largerText: {
    fontSize: 20, // Base size for larger text
  },
});