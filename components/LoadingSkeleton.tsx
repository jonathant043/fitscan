// components/LoadingSkeleton.tsx
// Skeleton loading components for better UX

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../lib/constants';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: object;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 4, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function ExerciseCardSkeleton() {
  return (
    <View style={styles.exerciseCard}>
      <Skeleton width="70%" height={18} />
      <Skeleton width="90%" height={14} style={{ marginTop: 8 }} />
      <View style={styles.metaRow}>
        <Skeleton width={80} height={12} />
        <Skeleton width={60} height={12} />
      </View>
    </View>
  );
}

export function ExerciseListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <ExerciseCardSkeleton key={index} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: COLORS.backgroundLight,
  },
  exerciseCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
});
