import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';
import { SKILL_TAXONOMY } from '../data/mockData';
import { Button } from '../components/Button';
import { formatMoney, validateFloor } from '../utils/pricing';

type Step = 'details' | 'pricing' | 'review';

export const PostJobScreen = () => {
  const { currentUser, postJob, isMockMode } = useApp();
  const [step, setStep] = useState<Step>('details');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [startingPrice, setStartingPrice] = useState('800');
  const [minimumPrice, setMinimumPrice] = useState('350');
  const [decayRate, setDecayRate] = useState('15');
  const [estimatedHours, setEstimatedHours] = useState('30');
  const [deadlineHours, setDeadlineHours] = useState('48');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (currentUser.role !== 'client') {
    return (
      <View style={styles.center}>
        <Text style={styles.centerIcon}>🏢</Text>
        <Text style={styles.centerTitle}>Post a Job</Text>
        <Text style={styles.centerSub}>Switch to Client role from your Profile to post jobs.</Text>
      </View>
    );
  }

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : prev.length < 10 ? [...prev, skill] : prev
    );
  };

  const suggestedDecay = Math.round((Number(startingPrice) - Number(minimumPrice)) / 48);

  const onSubmit = async () => {
    setIsSubmitting(true);
    const result = await postJob({
      title,
      description,
      skillsRequired: selectedSkills,
      startingPrice: Number(startingPrice),
      minimumPrice: Number(minimumPrice),
      decayRatePerHour: Number(decayRate),
      estimatedHours: Number(estimatedHours),
      deadlineAt: new Date(Date.now() + Number(deadlineHours) * 60 * 60 * 1000).toISOString(),
    });
    setIsSubmitting(false);
    if (!result.ok) return Alert.alert('Cannot post', result.message);
    setTitle('');
    setDescription('');
    setSelectedSkills([]);
    setStep('details');
    Alert.alert('⚡ Job Live!', 'Your reverse auction is now live in the feed.');
  };

  const floorValid = validateFloor(Number(startingPrice), Number(minimumPrice));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Step indicators */}
      <View style={styles.stepRow}>
        {(['details', 'pricing', 'review'] as Step[]).map((s, i) => (
          <Pressable key={s} style={styles.stepItem} onPress={() => setStep(s)}>
            <View style={[styles.stepDot, step === s && styles.stepDotActive]}>
              <Text style={[styles.stepNum, step === s && styles.stepNumActive]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, step === s && styles.stepLabelActive]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {step === 'details' && (
        <>
          <LinearGradient colors={colors.gradientBlue as any} style={styles.hero}>
            <Text style={styles.heroTitle}>📋 Job Details</Text>
            <Text style={styles.heroSub}>Describe the work so geeks know exactly what you need.</Text>
          </LinearGradient>

          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput testID="postjob-title-input" style={styles.input} placeholder="e.g. Build AI chatbot for support" placeholderTextColor={colors.placeholder} value={title} onChangeText={setTitle} maxLength={80} />
            <Text style={styles.charCount}>{title.length}/80</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Description (min 200 chars)</Text>
            <TextInput testID="postjob-description-input" style={[styles.input, styles.multiline]} placeholder="Detailed job requirements..." placeholderTextColor={colors.placeholder} value={description} onChangeText={setDescription} multiline maxLength={5000} />
            <Text style={styles.charCount}>{description.length}/5000</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Skills Required ({selectedSkills.length}/10)</Text>
            <View style={styles.skillGrid}>
              {SKILL_TAXONOMY.map((skill) => {
                const sel = selectedSkills.includes(skill);
                return (
                  <Pressable key={skill} style={[styles.chip, sel && styles.chipActive]} onPress={() => toggleSkill(skill)}>
                    <Text style={[styles.chipText, sel && styles.chipTextActive]}>{skill}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Button title="Next: Pricing →" onPress={() => setStep('pricing')} variant="secondary" />
        </>
      )}

      {step === 'pricing' && (
        <>
          <LinearGradient colors={colors.gradientAccent as any} style={styles.hero}>
            <Text style={styles.heroTitle}>💰 Reverse Pricing</Text>
            <Text style={styles.heroSub}>Set the starting price, floor, and decay rate for your auction.</Text>
          </LinearGradient>

          <View style={styles.priceRow}>
            <View style={styles.priceField}>
              <Text style={styles.label}>Starting Price ($)</Text>
              <TextInput style={styles.input} value={startingPrice} onChangeText={setStartingPrice} keyboardType="numeric" placeholder="800" placeholderTextColor={colors.placeholder} />
            </View>
            <View style={styles.priceField}>
              <Text style={styles.label}>Floor Price ($)</Text>
              <TextInput style={styles.input} value={minimumPrice} onChangeText={setMinimumPrice} keyboardType="numeric" placeholder="350" placeholderTextColor={colors.placeholder} />
            </View>
          </View>
          {!floorValid && <Text style={styles.warn}>⚠️ Floor must be ≥ 30% of starting price</Text>}

          <View style={styles.field}>
            <Text style={styles.label}>Decay Rate ($/hour) — Suggested: ${suggestedDecay}/hr</Text>
            <TextInput style={styles.input} value={decayRate} onChangeText={setDecayRate} keyboardType="numeric" placeholder="15" placeholderTextColor={colors.placeholder} />
          </View>
          <View style={styles.priceRow}>
            <View style={styles.priceField}>
              <Text style={styles.label}>Est. Hours</Text>
              <TextInput style={styles.input} value={estimatedHours} onChangeText={setEstimatedHours} keyboardType="numeric" placeholder="30" placeholderTextColor={colors.placeholder} />
            </View>
            <View style={styles.priceField}>
              <Text style={styles.label}>Deadline (hours)</Text>
              <TextInput style={styles.input} value={deadlineHours} onChangeText={setDeadlineHours} keyboardType="numeric" placeholder="48" placeholderTextColor={colors.placeholder} />
            </View>
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>📉 Decay Preview</Text>
            <Text style={styles.previewText}>Start: {formatMoney(Number(startingPrice))}</Text>
            <Text style={styles.previewText}>After 12h: {formatMoney(Math.max(Number(startingPrice) - Number(decayRate) * 12, Number(minimumPrice)))}</Text>
            <Text style={styles.previewText}>After 24h: {formatMoney(Math.max(Number(startingPrice) - Number(decayRate) * 24, Number(minimumPrice)))}</Text>
            <Text style={styles.previewText}>Floor: {formatMoney(Number(minimumPrice))}</Text>
          </View>

          <View style={styles.navRow}>
            <Button title="← Details" onPress={() => setStep('details')} variant="outline" />
            <Button title="Review →" onPress={() => setStep('review')} variant="secondary" />
          </View>
        </>
      )}

      {step === 'review' && (
        <>
          <LinearGradient colors={colors.gradientPurple as any} style={styles.hero}>
            <Text style={styles.heroTitle}>✅ Review & Publish</Text>
            <Text style={styles.heroSub}>Double-check everything before your auction goes live.</Text>
          </LinearGradient>

          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>Title</Text>
            <Text style={styles.reviewValue}>{title || '(not set)'}</Text>
          </View>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>Description</Text>
            <Text style={styles.reviewValue} numberOfLines={4}>{description || '(not set)'}</Text>
          </View>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>Skills</Text>
            <Text style={styles.reviewValue}>{selectedSkills.join(', ') || '(none)'}</Text>
          </View>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>Pricing</Text>
            <Text style={styles.reviewValue}>
              {formatMoney(Number(startingPrice))} → {formatMoney(Number(minimumPrice))} at ${decayRate}/hr
            </Text>
          </View>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>Timeline</Text>
            <Text style={styles.reviewValue}>{estimatedHours}h estimated • {deadlineHours}h deadline</Text>
          </View>

          <View style={styles.navRow}>
            <Button title="← Pricing" onPress={() => setStep('pricing')} variant="outline" />
            <Button testID="postjob-submit-btn" title="⚡ Publish Job" onPress={() => void onSubmit()} loading={isSubmitting} />
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 8 },
  centerIcon: { fontSize: 40 },
  centerTitle: { ...typography.h2, color: colors.text },
  centerSub: { ...typography.caption, color: colors.muted, textAlign: 'center' },

  stepRow: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { borderColor: colors.accent, backgroundColor: colors.accentGlow },
  stepNum: { ...typography.captionBold, color: colors.muted },
  stepNumActive: { color: colors.accent },
  stepLabel: { ...typography.label, color: colors.muted },
  stepLabelActive: { color: colors.accent },

  hero: { borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 4, alignItems: 'center' },
  heroTitle: { ...typography.h3, color: colors.text },
  heroSub: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },

  field: { gap: 6 },
  label: { ...typography.captionBold, color: colors.muted },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: radius.md, color: colors.text, paddingHorizontal: 14, paddingVertical: 12, ...typography.body },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  charCount: { ...typography.caption, color: colors.muted, textAlign: 'right' },
  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
  chipActive: { borderColor: colors.accent, backgroundColor: colors.accentGlow },
  chipText: { ...typography.caption, color: colors.muted, fontSize: 12 },
  chipTextActive: { color: colors.accent },

  priceRow: { flexDirection: 'row', gap: 10 },
  priceField: { flex: 1, gap: 6 },
  warn: { ...typography.caption, color: colors.danger },

  previewCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14, gap: 4 },
  previewTitle: { ...typography.bodyBold, color: colors.text },
  previewText: { ...typography.caption, color: colors.textSecondary },

  navRow: { flexDirection: 'row', gap: 10 },

  reviewCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, gap: 4 },
  reviewLabel: { ...typography.label, color: colors.muted },
  reviewValue: { ...typography.body, color: colors.text },
});
