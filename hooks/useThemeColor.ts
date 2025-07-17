// hooks/useThemeColor.ts

import { useColorScheme } from 'react-native';
import Colors from '../constants/Colors';

export function useThemeColor(
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const scheme = useColorScheme() ?? 'light';
  return Colors[scheme][colorName];
}
