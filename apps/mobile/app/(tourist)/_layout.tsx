import { Tabs } from 'expo-router';
import { Bell, CalendarDays, Heart, Home, Map, Search, UserRound } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useNotificationStore } from '@/stores/notification-store';
import { useAppTheme } from '@/theme/useAppTheme';

export default function TouristTabsLayout() {
  const theme = useAppTheme();
  const { t } = useTranslation('common');
  const unreadCount = useNotificationStore(
    (state) => state.localNotifications.filter((notification) => !notification.read).length,
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home'),
          tabBarAccessibilityLabel: t('home'),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('explore'),
          tabBarAccessibilityLabel: t('explore'),
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t('map'),
          tabBarAccessibilityLabel: t('map'),
          tabBarIcon: ({ color, size }) => <Map color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('favorites'),
          tabBarAccessibilityLabel: t('favorites'),
          tabBarIcon: ({ color, size }) => <Heart color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('bookings'),
          tabBarAccessibilityLabel: t('bookings'),
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          title: t('notifications'),
          tabBarAccessibilityLabel: t('notifications'),
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile'),
          tabBarAccessibilityLabel: t('profile'),
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="tour/[tourId]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="poi/[poiId]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="guide/[guideId]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="book/[tourId]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="booking/[bookingId]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="payment/[bookingId]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="payment-return/success"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="payment-return/cancel"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen name="experience" options={{ href: null }} />
      <Tabs.Screen name="chats" options={{ href: null }} />
      <Tabs.Screen name="chat/[chatId]" options={{ href: null }} />
      <Tabs.Screen name="recommendations" options={{ href: null }} />
      <Tabs.Screen name="community-gallery" options={{ href: null }} />
      <Tabs.Screen name="coupons" options={{ href: null }} />
      <Tabs.Screen name="offline" options={{ href: null }} />
      <Tabs.Screen name="marketplace" options={{ href: null }} />
      <Tabs.Screen name="ar-discovery" options={{ href: null }} />
      <Tabs.Screen name="review/[bookingId]" options={{ href: null }} />
    </Tabs>
  );
}
