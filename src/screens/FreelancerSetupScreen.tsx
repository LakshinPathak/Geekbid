import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';
import { SKILL_TAXONOMY } from '../data/mockData';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'FreelancerSetup'>;

export const FreelancerSetupScreen = ({ navigation }: Props) => {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [hourlyMin, setHourlyMin] = useState('50');
  const [hourlyMax, setHourlyMax] = useState('150');

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : prev.length < 20 ? [...prev, skill] : prev
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient colors={colors.gradientPurple as any} style={styles.hero}>
        <Text style={styles.heroIcon}>🧑‍💻</Text>
        <Text style={styles.heroTitle}>Set Up Your Geek Profile</Text>
        <Text style={styles.heroSub}>Pick your skills, set your rate, and start winning jobs.</Text>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Skills ({selectedSkills.length}/20)</Text>
        <View style={styles.skillGrid}>
          {SKILL_TAXONOMY.map((skill) => {
            const isSelected = selectedSkills.includes(skill);
            return (
              <Pressable
                key={skill}
                onPress={() => toggleSkill(skill)}
                style={[styles.skillChip, isSelected && styles.skillChipActive]}
              >
                <Text style={[styles.skillText, isSelected && styles.skillTextActive]}>{skill}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bio</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Tell clients about your experience..."
          placeholderTextColor={colors.placeholder}
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={500}
        />
        <Text style={styles.charCount}>{bio.length}/500</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hourly Rate Range (USD)</Text>
        <View style={styles.rateRow}>
          <View style={styles.rateInput}>
            <Text style={styles.rateLabel}>Min</Text>
            <TextInput
              style={styles.input}
              value={hourlyMin}
              onChangeText={setHourlyMin}
              keyboardType="numeric"
              placeholder="50"
              placeholderTextColor={colors.placeholder}
            />
          </View>
          <Text style={styles.rateDash}>—</Text>
          <View style={styles.rateInput}>
            <Text style={styles.rateLabel}>Max</Text>
            <TextInput
              style={styles.input}
              value={hourlyMax}
              onChangeText={setHourlyMax}
              keyboardType="numeric"
              placeholder="150"
              placeholderTextColor={colors.placeholder}
            />
          </View>
        </View>
      </View>

      <Pressable style={styles.connectBtn}>
        <Text style={styles.connectIcon}>⚫</Text>
        <Text style={styles.connectText}>Connect GitHub</Text>
      </Pressable>

      <Pressable style={styles.submitBtn} onPress={() => navigation.replace('Main')}>
        <LinearGradient
          colors={colors.gradientAccent as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.submitGradient}
        >
          <Text style={styles.submitText}>Start Winning Jobs →</Text>
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
  section: { gap: 10 },
  sectionTitle: { ...typography.bodyBold, color: colors.text },
  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  skillChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentGlow,
  },
  skillText: { ...typography.caption, color: colors.muted },
  skillTextActive: { color: colors.accent },
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
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  charCount: { ...typography.caption, color: colors.muted, textAlign: 'right' },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rateInput: { flex: 1, gap: 4 },
  rateLabel: { ...typography.label, color: colors.muted },
  rateDash: { ...typography.h3, color: colors.muted, marginTop: 16 },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingVertical: 14,
    backgroundColor: colors.card,
  },
  connectIcon: { fontSize: 18 },
  connectText: { ...typography.bodyBold, color: colors.textSecondary },
  submitBtn: { borderRadius: radius.lg, overflow: 'hidden' },
  submitGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: radius.lg },
  submitText: { ...typography.bodyBold, color: colors.text, fontSize: 16 },
});
