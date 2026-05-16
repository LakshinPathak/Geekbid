import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { RootStackParamList, MainTabParamList } from '../types/navigation';

// Screens
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { FreelancerSetupScreen } from '../screens/FreelancerSetupScreen';
import { ClientSetupScreen } from '../screens/ClientSetupScreen';
import { FeedScreen } from '../screens/FeedScreen';
import { PostJobScreen } from '../screens/PostJobScreen';
import { WorkspaceScreen } from '../screens/WorkspaceScreen';
import { InboxScreen } from '../screens/InboxScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { JobDetailScreen } from '../screens/JobDetailScreen';
import { MyJobsScreen } from '../screens/MyJobsScreen';
import { MyBidsScreen } from '../screens/MyBidsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ChatRoomScreen } from '../screens/ChatRoomScreen';
import { EarningsScreen } from '../screens/EarningsScreen';
import { PaymentsScreen } from '../screens/PaymentsScreen';
import { AdminDashboardScreen } from '../screens/AdminDashboardScreen';
import { DisputesScreen } from '../screens/DisputesScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Feed: '⚡',
  PostJob: '📝',
  Workspace: '🏠',
  Inbox: '💬',
  Profile: '👤',
};

const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => (
  <View style={[tabStyles.wrap, focused && tabStyles.wrapActive]}>
    <Text style={[tabStyles.icon, focused && tabStyles.iconActive]}>{TAB_ICONS[name] ?? '•'}</Text>
  </View>
);

const tabStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 12 },
  wrapActive: { backgroundColor: colors.accentGlow },
  icon: { fontSize: 18 },
  iconActive: { fontSize: 20 },
});

const MainTabs = () => {
  const { currentUser, unreadNotificationsCount } = useApp();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgSecondary,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: 6,
          paddingTop: 6,
          height: 62,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} options={{ tabBarLabel: 'Feed' }} />
      {currentUser.role === 'client' && (
        <Tab.Screen name="PostJob" component={PostJobScreen} options={{ tabBarLabel: 'Post Job' }} />
      )}
      <Tab.Screen
        name="Workspace"
        component={WorkspaceScreen}
        options={{
          tabBarLabel: 'Hub',
          tabBarBadge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, fontSize: 10, fontWeight: '700' },
        }}
      />
      <Tab.Screen name="Inbox" component={InboxScreen} options={{ tabBarLabel: 'Chat' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
};

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.bgSecondary },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '700' as const },
  headerShadowVisible: false,
};

export const AppNavigator = () => (
  <Stack.Navigator screenOptions={{ ...stackScreenOptions, headerShown: false }}>
    <Stack.Screen name="Auth" component={AuthScreen} />
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen name="FreelancerSetup" component={FreelancerSetupScreen} options={{ headerShown: true, title: 'Setup Profile' }} />
    <Stack.Screen name="ClientSetup" component={ClientSetupScreen} options={{ headerShown: true, title: 'Setup Company' }} />
    <Stack.Screen name="Main" component={MainTabs} />
    <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ headerShown: true, title: 'Job Details' }} />
    <Stack.Screen name="MyJobs" component={MyJobsScreen} options={{ headerShown: true, title: 'My Jobs' }} />
    <Stack.Screen name="MyBids" component={MyBidsScreen} options={{ headerShown: true, title: 'My Bids' }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: true, title: 'Notifications' }} />
    <Stack.Screen
      name="ChatRoom"
      component={ChatRoomScreen}
      options={({ route }) => ({ headerShown: true, title: route.params?.title ?? 'Chat' })}
    />
    <Stack.Screen name="Earnings" component={EarningsScreen} options={{ headerShown: true, title: 'Earnings' }} />
    <Stack.Screen name="Payments" component={PaymentsScreen} options={{ headerShown: true, title: 'Payments' }} />
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ headerShown: true, title: 'Admin' }} />
    <Stack.Screen name="Disputes" component={DisputesScreen} options={{ headerShown: true, title: 'Disputes' }} />
  </Stack.Navigator>
);
