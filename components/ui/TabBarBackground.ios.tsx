import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TabBarBackgroundProps {
  backgroundColor?: string;
  height?: number;
}

const TabBarBackground: React.FC<TabBarBackgroundProps> = ({
  backgroundColor = '#f5f5f5',
  height = 60,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.background, { backgroundColor, height: height + insets.bottom }]} />
  );
};

const styles = StyleSheet.create({
  background: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
});

export default TabBarBackground;
