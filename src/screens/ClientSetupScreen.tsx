import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ClientSetup'>;

const COMPANY_SIZES = ['Solo / Freelancer', '2-10', '11-50', '51-200', '200+'];

export const ClientSetupScreen = ({ navigation }: Props) => {
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [selectedSize, setSelectedSize] = useState('2-10');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient colors={colors.gradientBlue as any} style={styles.hero}>
        <Text style={styles.heroIcon}>🏢</Text>
        <Text style={styles.heroTitle}>Set Up Your Company</Text>
        <Text style={styles.heroSub}>Help freelancers understand your business and build trust.</Text>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Company Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. NexaAI Labs"
          placeholderTextColor={colors.placeholder}
          value={companyName}
          onChangeText={setCompanyName}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Website</Text>
        <TextInput
          style={styles.input}
          placeholder="https://your-company.com"
          placeholderTextColor={colors.placeholder}
          value={website}
          onChangeText={setWebsite}
          keyboardType="url"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Team Size</Text>
        <View style={styles.sizeRow}>
          {COMPANY_SIZES.map((size) => (
            <Pressable
              key={size}
              style={[styles.sizeChip, selectedSize === size && styles.sizeChipActive]}
              onPress={() => setSelectedSize(size)}
            >
              <Text style={[styles.sizeText, selectedSize === size && styles.sizeTextActive]}>{size}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>💳 Payment Method</Text>
        <Text style={styles.infoText}>You'll add a payment method when posting your first job. Funds are held in escrow until you approve deliverables.</Text>
      </View>

      <Pressable style={styles.submitBtn} onPress={() => navigation.replace('Main')}>
        <LinearGradient
          colors={colors.gradientBlue as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.submitGradient}
        >
          <Text style={styles.submitText}>Start Hiring →</Text>
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 20, paddingBottom: 40 },
  hero: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  heroIcon: { fontSize: 36 },
  heroTitle: { ...typography.h2, color: colors.text, textAlign: 'center' },
  heroSub: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  section: { gap: 8 },
  sectionTitle: { ...typography.bodyBold, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...typography.body,
  },
  sizeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sizeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  sizeChipActive: { borderColor: colors.accentBlue, backgroundColor: colors.accentBlueGlow },
  sizeText: { ...typography.caption, color: colors.muted },
  sizeTextActive: { color: colors.accentBlue },
  infoCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    gap: 6,
  },
  infoTitle: { ...typography.bodyBold, color: colors.text },
  infoText: { ...typography.caption, color: colors.muted, lineHeight: 20 },
  submitBtn: { borderRadius: radius.lg, overflow: 'hidden' },
  submitGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: radius.lg },
  submitText: { ...typography.bodyBold, color: colors.text, fontSize: 16 },
});
