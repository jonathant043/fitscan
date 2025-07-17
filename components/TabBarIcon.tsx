import React from 'react';
import { Ionicons } from '@expo/vector-icons';

export function TabBarIcon({ name, color }: { name: React.ComponentProps<typeof Ionicons>['name']; color: string }) {
  return <Ionicons size={24} name={name} color={color} />;
}
