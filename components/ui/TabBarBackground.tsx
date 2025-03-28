import React from 'react';
import { StyleSheet, View } from 'react-native';

const TabBarBackground = () => {
  return <View style={styles.background} />;
};

const styles = StyleSheet.create({
  background: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60, // Adjust as needed
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4, // For Android
  },
});

export default TabBarBackground;
