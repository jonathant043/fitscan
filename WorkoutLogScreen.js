import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

const WorkoutLogScreen = () => {
  const [workoutLogs, setWorkoutLogs] = useState([
    {
      date: '2023-11-20',
      duration: 45,
      exercises: ['Push-ups', 'Squats', 'Lunges'],
    },
    // ... more workout logs
  ]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Workout Log</Text>
      <FlatList
        data={workoutLogs}
        renderItem={({ item }) => (
          <View style={styles.workoutItem}>
            <Text>Date: {item.date}</Text>
            <Text>Duration: {item.duration} minutes</Text>
            <Text>Exercises:</Text>
            {item.exercises.map((exercise, index) => (
              <Text key={index}>- {exercise}</Text>
            ))}
          </View>
        )}
        keyExtractor={(item) => item.date}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // ... styles for the container, title, and workout items
});

export default WorkoutLogScreen;