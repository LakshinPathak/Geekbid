import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRef, useEffect } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { RootStackParamList } from '../types/navigation';
import { Button } from '../components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: '⚡',
    title: 'Reverse Bidding',
    desc: 'Clients post high, price decays over time. Accept at the right moment and earn more.',
    gradient: ['#1E3A8A', '#1E293B', '#090D1A'] as const,
  },
  {
    icon: '📊',
    title: 'Live Price Ticker',
    desc: 'Watch prices drop in real-time. Set alerts. Accept with one tap when the price is right.',
    gradient: ['#064E3B', '#1E293B', '#090D1A'] as const,
  },
  {
    icon: '🏆',
    title: 'Geek Score',
    desc: 'Build your reputation from Newbie to 10x Engineer. Higher scores unlock premium jobs.',
    gradient: ['#581C87', '#1E293B', '#090D1A'] as const,
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
            <View style={styles.slideTextContainer}>
              <Text style={styles.slideTitle}>{slide.title}</Text>
              <Text style={styles.slideDesc}>{slide.desc}</Text>
            </View>
          </LinearGradient>
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          title="Get Started"
          onPress={() => navigation.replace('Auth')}
          variant="primary"
        />
        <Button
          title="I already have an account"
          onPress={() => navigation.replace('Auth')}
          variant="ghost"
        />
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
    padding: 20,
    gap: 12,
  },
  slideIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  slideTextContainer: {
    gap: 4,
  },
  slideTitle: {
    ...typography.bodyBold,
    color: colors.text,
  },
  slideDesc: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actions: {
    gap: 12,
  },
});
