import React, { useRef, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Church } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, logoScale]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0B0F1A', '#131A2E', '#0B0F1A']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.patternOverlay}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.patternCircle,
              {
                top: Math.random() * height * 0.6,
                left: Math.random() * width,
                width: 100 + Math.random() * 150,
                height: 100 + Math.random() * 150,
                opacity: 0.03 + Math.random() * 0.04,
              },
            ]}
          />
        ))}
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
          <LinearGradient
            colors={[theme.colors.accent, theme.colors.accentLight]}
            style={styles.logoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Church size={36} color={theme.colors.background} strokeWidth={1.8} />
          </LinearGradient>
        </Animated.View>

        <Image
          source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/fv408whgqhsmotq5f9m63' }}
          style={styles.appLogo}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>Church management{'\n'}made simple</Text>

        <View style={styles.divider} />

        <Text style={styles.description}>
          Connect your congregation, manage events, share prayers, and grow together — all in one place.
        </Text>
      </Animated.View>

      <Animated.View style={[styles.actions, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => router.push('/login')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[theme.colors.accent, theme.colors.accentDark]}
            style={styles.signInGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.signInText}>Sign In</Text>
            <ArrowRight size={18} color={theme.colors.background} strokeWidth={2.5} />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => router.push('/register')}
          activeOpacity={0.7}
        >
          <Text style={styles.joinText}>Join as Member</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.push('/onboard')}
          activeOpacity={0.7}
        >
          <Text style={styles.registerText}>Register Your Church</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  patternOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  patternCircle: {
    position: 'absolute' as const,
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  logoGradient: {
    width: 68,
    height: 68,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appLogo: {
    width: 220,
    height: 55,
    alignSelf: 'flex-start',
    marginLeft: -8,
  },
  tagline: {
    fontSize: 28,
    fontWeight: '300' as const,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 36,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: theme.colors.accent,
    marginVertical: 24,
    borderRadius: 1,
  },
  description: {
    fontSize: 16,
    color: theme.colors.textTertiary,
    lineHeight: 24,
  },
  actions: {
    paddingHorizontal: 32,
    paddingBottom: 60,
    gap: 14,
  },
  signInButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  signInGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  signInText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: theme.colors.background,
  },
  joinButton: {
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  joinText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: theme.colors.accent,
  },
  registerButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  registerText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
  },
});

