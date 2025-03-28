import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import Colors from '@/constants/Colors';
import { useMMKVString } from 'react-native-mmkv';
import { storage } from '../storage/mmkv';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [age] = useMMKVString('user.age', storage);
  const isOlder = parseInt(age) > 60;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].text,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].background,
          height: isOlder ? 60 : 50, // Larger for accessibility
        },
        tabBarLabelStyle: {
          fontSize: isOlder ? 14 : 12, // Larger text for older users
        },
        tabBarIconStyle: {
          marginTop: isOlder ? 5 : 0, // Adjust icon spacing
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={isOlder ? 28 : 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color }) => (
            <Ionicons name="camera" size={isOlder ? 28 : 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color }) => (
            <Ionicons name="heart" size={isOlder ? 28 : 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="fitnessTracking"
        options={{
          title: 'Fitness',
          tabBarIcon: ({ color }) => (
            <Ionicons name="fitness" size={isOlder ? 28 : 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={isOlder ? 28 : 24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}