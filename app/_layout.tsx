import { Stack } from 'expo-router';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import TabBarBackground from '@/components/TabBarBackground';
import { Ionicons } from '@expo/vector-icons';

// Import Screens
import HomeScreen from '@/screens/HomeScreen';
import EquipmentScanScreen from '@/screens/EquipmentScanScreen';
import WorkoutGenerationScreen from '@/screens/WorkoutGenerationScreen';
import WorkoutLogScreen from '@/screens/WorkoutLogScreen';
import LeaderboardsScreen from '@/screens/LeaderboardsScreen';
import ProfileScreen from '@/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { height: 60 },
        }}
      >
        <Tab.Screen
          name="home"
          component={HomeScreen}
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="scan"
          component={EquipmentScanScreen}
          options={{
            title: 'Scan',
            tabBarIcon: ({ color, size }) => <Ionicons name="scan-outline" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="workout"
          component={WorkoutGenerationScreen}
          options={{
            title: 'Workout',
            tabBarIcon: ({ color, size }) => <Ionicons name="barbell-outline" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="logs"
          component={WorkoutLogScreen}
          options={{
            title: 'Logs',
            tabBarIcon: ({ color, size }) => <Ionicons name="clipboard-outline" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="leaderboard"
          component={LeaderboardsScreen}
          options={{
            title: 'Leaderboard',
            tabBarIcon: ({ color, size }) => <Ionicons name="trophy-outline" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="profile"
          component={ProfileScreen}
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
          }}
        />
      </Tab.Navigator>
      <TabBarBackground />
    </View>
  );
}

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} component={TabLayout} />
      <Stack.Screen name="fitness" options={{ title: 'Fitness Tracking' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}
