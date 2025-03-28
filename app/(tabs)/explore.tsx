/import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';

export default function ExploreScreen() {
  const [categories, setCategories] = useState([
    { id: '1', title: 'Weight Loss Tips', expanded: false, items: ['Eat more protein', 'Avoid sugary drinks', 'Exercise regularly'] },
    { id: '2', title: 'Strength Training', expanded: false, items: ['Bench Press Basics', 'Deadlift Guide', 'Squat Form Tips'] },
    { id: '3', title: 'Challenges', expanded: false, items: ['30-Day Push-Up Challenge', 'Plank Challenge', 'Step Goal Challenge'] },
  ]);

  const toggleCategory = (id: string) => {
    setCategories((prevCategories) =>
      prevCategories.map((category) =>
        category.id === id ? { ...category, expanded: !category.expanded } : category
      )
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explore</Text>
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.category}>
            <TouchableOpacity onPress={() => toggleCategory(item.id)} style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>{item.title}</Text>
              <Text style={styles.categoryToggle}>{item.expanded ? '-' : '+'}</Text>
            </TouchableOpacity>
            {item.expanded && (
              <View style={styles.categoryItems}>
                {item.items.map((content, index) => (
                  <Text key={index} style={styles.contentItem}>- {content}</Text>
                ))}
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f8f8',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  category: {
    marginBottom: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  categoryToggle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  categoryItems: {
    padding: 16,
  },
  contentItem: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
});
