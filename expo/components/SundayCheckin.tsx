import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Church, MapPin, CheckCircle2, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';

export default function SundayCheckin() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const slideIn = useRef(new Animated.Value(-100)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const [dismissed, setDismissed] = useState(false);
  const [checkinResult, setCheckinResult] = useState<{
    success: boolean;
    message: string;
    sundays?: number;
  } | null>(null);

  const isSunday = new Date().getDay() === 0;

  useEffect(() => {
    if (isSunday && !dismissed) {
      Animated.parallel([
        Animated.spring(slideIn, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
        Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [isSunday, dismissed, slideIn, fadeIn]);

  const checkinMutation = useMutation({
    mutationFn: async () => {
      if (Platform.OS === 'web') {
        return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            (err) => reject(new Error(err.message))
          );
        }).then((coords) =>
          api.post<{ data: { message: string; distance_miles?: number; sundays_this_year?: number } }>(
            '/attendance/sunday-checkin',
            coords as unknown as Record<string, unknown>
          )
        );
      } else {
        const Location = await import('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Location permission is required to check in.');
        }
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        return api.post<{ data: { message: string; distance_miles?: number; sundays_this_year?: number } }>(
          '/attendance/sunday-checkin',
          { latitude: location.coords.latitude, longitude: location.coords.longitude } as unknown as Record<string, unknown>
        );
      }
    },
    onSuccess: (data) => {
      console.log('[Checkin] Success:', JSON.stringify(data));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const result = (data as Record<string, unknown>)?.data as { message: string; sundays_this_year?: number } | undefined;
      setCheckinResult({
        success: true,
        message: result?.message ?? 'Church attendance recorded!',
        sundays: result?.sundays_this_year,
      });
      void queryClient.invalidateQueries({ queryKey: ['my-sundays'] });
    },
    onError: (error) => {
      console.log('[Checkin] Error:', error.message);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setCheckinResult({
        success: false,
        message: error.message,
      });
    },
  });

  if (!isSunday || dismissed) return null;

  const handleDismiss = () => {
    Animated.timing(fadeIn, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setDismissed(true);
    });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeIn, transform: [{ translateY: slideIn }] }]}>
      {checkinResult ? (
        <View style={styles.resultRow}>
          {checkinResult.success ? (
            <>
              <CheckCircle2 size={20} color={theme.colors.success} />
              <View style={styles.resultInfo}>
                <Text style={styles.resultTitle}>{checkinResult.message}</Text>
                {checkinResult.sundays != null && (
                  <Text style={styles.resultSubtext}>
                    {checkinResult.sundays} Sundays attended this year
                  </Text>
                )}
              </View>
            </>
          ) : (
            <>
              <MapPin size={20} color={theme.colors.warning} />
              <View style={styles.resultInfo}>
                <Text style={styles.resultTitle}>{checkinResult.message}</Text>
              </View>
            </>
          )}
          <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={16} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.promptRow}>
          <View style={styles.churchIconWrap}>
            <Church size={20} color={theme.colors.accent} />
          </View>
          <View style={styles.promptInfo}>
            <Text style={styles.promptTitle}>Are you at church today?</Text>
            <Text style={styles.promptSubtext}>Tap to check in with your location</Text>
          </View>
          <TouchableOpacity
            style={styles.checkinBtn}
            onPress={() => checkinMutation.mutate()}
            disabled={checkinMutation.isPending}
            activeOpacity={0.7}
          >
            <Text style={styles.checkinBtnText}>
              {checkinMutation.isPending ? 'Checking...' : 'Check In'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={14} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  churchIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptInfo: {
    flex: 1,
    gap: 1,
  },
  promptTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  promptSubtext: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  checkinBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  checkinBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.colors.textInverse,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultInfo: {
    flex: 1,
    gap: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  resultSubtext: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
});
