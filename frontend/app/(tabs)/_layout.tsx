import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: 'white', // active icon/text color
        tabBarInactiveTintColor: 'lightgray', // inactive icon/text color
        tabBarStyle: {
          backgroundColor: '#1E3A8A', // background color of the bar
          borderTopWidth: 0, // remove top border if you want
          height: 60, // make it taller if needed
        },
      }}
    >
      <Tabs.Screen
        name="HomeScreen"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="SavedJobsScreen"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmark" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="AppliedJobScreen"
        options={{
          title: 'Applied Jobs',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="paper-plane" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
