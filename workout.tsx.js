import React, { useEffect } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useMMKVString } from 'react-native-mmkv';
import { storage } from '../storage/mmkv';
import { useThemeColor } from '../hooks/useThemeColor';
import { Colors } from '../constants/Colors';
import { useWorkout } from '../hooks/useWorkout'; // From earlier code

const WorkoutGenerationScreen = ({ route }) => {
  const [equipment] = useState(route?.params?.equipment || 'Bodyweight'); // From ScanScreen
  const [goal] = useMMKVString('user.goal', storage) || 'Weight Loss';
  const [fitnessLevel] = useMMKVString('user.fitnessLevel', storage) || 'Beginner';
  const [age] = useMMKVString('user.age', storage);
  const isOlder = parseInt(age) > 60;

  const { workout, createWorkout } = useWorkout(); // Custom hook

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');

  useEffect(() => {
    // Generate workout on mount if equipment is provided
    if (equipment) {
      createWorkout(equipment, goal, fitnessLevel);
    }
  }, [equipment, goal, fitnessLevel, createWorkout]);

  const handleGenerateWorkout = () => {
    createWorkout(equipment, goal, fitnessLevel);
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.title, isOlder && styles.largerText, { color: textColor }]}>
        Workout Generator
      </Text>
      <Text style={[styles.subtitle, isOlder && styles.largerText, { color: textColor }]}>
        Equipment: {equipment} | Goal: {goal} | Level: {fitnessLevel}
      </Text>
      <Button
        title="Generate New Workout"
        onPress={handleGenerateWorkout}
        color={primaryColor}
      />
      {workout.length > 0 && (
        <View style={styles.workoutContainer}>
          <Text style={[styles.workoutTitle, isOlder && styles.largerText, { color: textColor }]}>
            Your Workout Plan:
          </Text>
          {workout.map((exercise, index) => (
            <View key={index} style={styles.exercise}>
              <Text style={[styles.exerciseText, isOlder && styles.largerText, { color: textColor }]}>
                {exercise}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

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
  workoutContainer: {
    marginTop: 20,
    width: '100%',
  },
  workoutTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
  },
  exercise: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  exerciseText: {
    fontSize: 16,
  },
  largerText: {
    fontSize: 20, // Base size for larger text
  },
  largerButton: {
    height: 70,
  },
});

export default WorkoutGenerationScreen;