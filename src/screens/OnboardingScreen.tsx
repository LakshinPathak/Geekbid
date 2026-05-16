import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRef, useEffect } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: '⚡',
    title: 'Reverse Bidding',
    desc: 'Clients post high, price decays over time. Accept at the right moment and earn more.',
    gradient: ['#0F2B5E', '#1A3F7D', '#080E1E'] as const,
  },
  {
    icon: '📊',
    title: 'Live Price Ticker',
    desc: 'Watch prices drop in real-time. Set alerts. Accept with one tap when the price is right.',
    gradient: ['#1A3D2E', '#0D5233', '#080E1E'] as const,
  },
  {
    icon: '🏆',
    title: 'Geek Score',
    desc: 'Build your reputation from Newbie to 10x Engineer. Higher scores unlock premium jobs.',
    gradient: ['#3D1A5E', '#5B2E8A', '#080E1E'] as const,
  },
];

export const OnboardingScreen = ({ navigation }: Props) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.heroSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.logo}>⚡ GeekBid</Text>
        <Text style={styles.tagline}>The stock exchange of freelance tech work</Text>
      </Animated.View>

      <View style={styles.slides}>
        {SLIDES.map((slide, i) => (
          <LinearGradient key={i} colors={slide.gradient as any} style={styles.slideCard}>
            <Text style={styles.slideIcon}>{slide.icon}</Text>
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideDesc}>{slide.desc}</Text>
          </LinearGradient>
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => navigation.replace('Auth')}
        >
          <LinearGradient
            colors={colors.gradientAccent as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientBtn}
          >
            <Text style={styles.btnText}>Get Started</Text>
          </LinearGradient>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => navigation.replace('Auth')}
        >
          <Text style={styles.secondaryText}>I already have an account</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  heroSection: {
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    ...typography.h1,
    fontSize: 38,
    color: colors.text,
    textAlign: 'center',
  },
  tagline: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 280,
  },
  slides: {
    gap: 12,
  },
  slideCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  slideIcon: {
    fontSize: 28,
  },
  slideTitle: {
    ...typography.bodyBold,
    color: colors.text,
    flex: 0,
  },
  slideDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  actions: {
    gap: 12,
  },
  primaryBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  gradientBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
  },
  btnText: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 17,
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: {
    ...typography.body,
    color: colors.accentBlue,
  },
});
