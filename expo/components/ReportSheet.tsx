import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  ChevronRight,
  CheckCircle,
  Shield,
  Ban,
  BookOpen,
  Circle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMutation } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';

type ReportStep = 'reason' | 'sub-reason' | 'preview' | 'submitted';

interface ReportCategory {
  id: string;
  label: string;
  subReasons?: { id: string; label: string }[];
  guideline?: {
    title: string;
    bullets: string[];
  };
}

const REPORT_CATEGORIES: ReportCategory[] = [
  { id: 'inappropriate', label: "I just don't like it" },
  { id: 'spam', label: "It's spam" },
  { id: 'nudity', label: 'Nudity or sexual activity' },
  { id: 'hate_speech', label: 'Hate speech or symbols' },
  {
    id: 'violence',
    label: 'Violence or dangerous organisations',
    subReasons: [
      { id: 'violent_threat', label: 'Violent threat' },
      { id: 'animal_abuse', label: 'Animal abuse' },
      { id: 'death_injury', label: 'Death or severe injury' },
      { id: 'dangerous_orgs', label: 'Dangerous organisations or individuals' },
    ],
    guideline: {
      title: 'Violence and dangerous organisations guidelines',
      bullets: [
        'Photos or videos of extreme graphic violence.',
        'Posts that encourage violence or attacks on anyone based on their religious, ethnic or sexual background.',
        'Specific threats of physical harm, theft, vandalism or financial harm.',
      ],
    },
  },
  { id: 'false_info', label: 'False information' },
  { id: 'bullying', label: 'Bullying or harassment' },
  { id: 'scam', label: 'Scam or fraud' },
  { id: 'ip_violation', label: 'Intellectual property violation' },
  { id: 'self_harm', label: 'Suicide or self-injury' },
  { id: 'illegal_goods', label: 'Sale of illegal or regulated goods' },
];

interface ReportSheetProps {
  visible: boolean;
  onClose: () => void;
  contentId: string | null;
  contentType: 'post' | 'short' | 'clip' | 'comment' | 'prayer';
  authorName?: string;
  authorId?: string;
}

export default function ReportSheet({ visible, onClose, contentId, contentType, authorName, authorId }: ReportSheetProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState<ReportStep>('reason');
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  const [selectedSubReason, setSelectedSubReason] = useState<string | null>(null);
  const [showReportStatus, setShowReportStatus] = useState(true);

  const resetState = useCallback(() => {
    setStep('reason');
    setSelectedCategory(null);
    setSelectedSubReason(null);
    setShowReportStatus(true);
  }, []);

  useEffect(() => {
    if (visible) {
      resetState();
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 1, friction: 8, tension: 65, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim, resetState]);

  const reportMutation = useMutation({
    mutationFn: () => {
      const reason = selectedSubReason || selectedCategory?.id || 'other';
      console.log('[Report] Submitting report:', { contentId, contentType, reason });
      return api.post('/reports', {
        content_id: contentId,
        content_type: contentType,
        reason,
        category: selectedCategory?.id ?? 'other',
        sub_reason: selectedSubReason ?? undefined,
      });
    },
    onSuccess: () => {
      console.log('[Report] Report submitted successfully');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('submitted');
    },
    onError: (error) => {
      console.log('[Report] Report error:', error.message);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('submitted');
    },
  });

  const handleClose = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleBack = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 'sub-reason') { setStep('reason'); setSelectedSubReason(null); }
    else if (step === 'preview') { setStep(selectedCategory?.subReasons ? 'sub-reason' : 'reason'); }
    else if (step === 'submitted') { handleClose(); }
  };

  const handleSelectCategory = (category: ReportCategory) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(category);
    setStep(category.subReasons && category.subReasons.length > 0 ? 'sub-reason' : 'preview');
  };

  const handleSelectSubReason = (subReasonId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSubReason(subReasonId);
    setStep('preview');
  };

  const handleSubmit = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    reportMutation.mutate();
  };

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });
  const displayName = authorName ?? 'this user';
  const subReasonLabel = selectedCategory?.subReasons?.find((s) => s.id === selectedSubReason)?.label;

  const renderReasonStep = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Why are you reporting this {contentType}?</Text>
      <Text style={styles.stepDescription}>
        Your report is anonymous, except if you're reporting an intellectual property infringement.
        If someone is in immediate danger, call the local emergency services — don't wait.
      </Text>
      {REPORT_CATEGORIES.map((cat) => (
        <TouchableOpacity key={cat.id} style={styles.reasonRow} onPress={() => handleSelectCategory(cat)} activeOpacity={0.6}>
          <Text style={styles.reasonText}>{cat.label}</Text>
          <ChevronRight size={18} color={theme.colors.textTertiary} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderSubReasonStep = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Why are you reporting this {contentType}?</Text>
      {selectedCategory?.subReasons?.map((sub) => (
        <TouchableOpacity key={sub.id} style={styles.reasonRow} onPress={() => handleSelectSubReason(sub.id)} activeOpacity={0.6}>
          <Text style={styles.reasonText}>{sub.label}</Text>
          <ChevronRight size={18} color={theme.colors.textTertiary} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderPreviewStep = () => {
    const reasonLabel = subReasonLabel ?? selectedCategory?.label ?? '';
    const guideline = selectedCategory?.guideline;
    return (
      <View style={styles.previewContent}>
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.previewHeader}>
            <View style={styles.previewAvatarRow}>
              <View style={styles.previewAvatar}>
                <Text style={styles.previewAvatarText}>{(displayName).charAt(0).toUpperCase()}</Text>
              </View>
              <View><Text style={styles.previewMeta}>Report preview</Text></View>
            </View>
          </View>
          <Text style={styles.previewSummary}>
            You're about to submit an anonymous report about {displayName}'s {contentType} for{' '}
            <Text style={styles.previewSummaryBold}>{reasonLabel.toLowerCase()}</Text>.
          </Text>
          {guideline && (
            <Text style={styles.guidelineNote}>
              {reasonLabel} falls under the {guideline.title.replace(' guidelines', '')} guidelines.
            </Text>
          )}
          {guideline && (
            <View style={styles.guidelineSection}>
              <Text style={styles.guidelineTitle}>{guideline.title}</Text>
              <View style={styles.guidelineBulletRow}>
                <View style={styles.guidelineRedDot} />
                <Text style={styles.guidelineWeRemove}>We remove:</Text>
              </View>
              {guideline.bullets.map((bullet, idx) => (
                <View key={idx} style={styles.guidelineBulletItem}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.guidelineBulletText}>{bullet}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[styles.submitBtn, reportMutation.isPending && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={reportMutation.isPending}
            activeOpacity={0.8}
          >
            {reportMutation.isPending ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Text style={styles.submitBtnText}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSubmittedStep = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.submittedSection}>
        <View style={styles.checkIconWrap}><CheckCircle size={40} color={theme.colors.success} /></View>
        <Text style={styles.submittedTitle}>Thanks for reporting this {contentType}</Text>
        <Text style={styles.submittedDescription}>
          While you wait for our decision, we'd like you to know that there are other steps that you can take now.
        </Text>
        <TouchableOpacity onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowReportStatus(!showReportStatus); }} activeOpacity={0.7}>
          <Text style={styles.toggleStatusLink}>{showReportStatus ? 'Hide report status' : 'Show report status'}</Text>
        </TouchableOpacity>
        {showReportStatus && (
          <View style={styles.statusTimeline}>
            <View style={styles.statusStep}>
              <View style={styles.statusDotActive} />
              <View style={styles.statusStepContent}>
                <Text style={styles.statusStepTitle}>Awaiting review</Text>
                <Text style={styles.statusStepDesc}>We either use technology or a review team to remove anything that doesn't follow our standards as quickly as possible.</Text>
              </View>
            </View>
            <View style={styles.statusLine} />
            <View style={styles.statusStep}>
              <Circle size={10} color={theme.colors.textTertiary} />
              <View style={styles.statusStepContent}>
                <Text style={styles.statusStepTitleInactive}>Decision made</Text>
                <Text style={styles.statusStepDesc}>We'll send you a notification to view the outcome in your support requests as soon as possible.</Text>
              </View>
            </View>
          </View>
        )}
      </View>
      <View style={styles.otherStepsSection}>
        <Text style={styles.otherStepsTitle}>Other steps you can take</Text>
        {authorId && (
          <TouchableOpacity style={styles.otherStepRow} activeOpacity={0.6}>
            <Ban size={20} color={theme.colors.text} />
            <Text style={styles.otherStepText}>Block {displayName}</Text>
            <ChevronRight size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        )}
        {authorId && (
          <TouchableOpacity style={styles.otherStepRow} activeOpacity={0.6}>
            <Shield size={20} color={theme.colors.text} />
            <Text style={styles.otherStepText}>Restrict {displayName}</Text>
            <ChevronRight size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.otherStepRow} activeOpacity={0.6}>
          <BookOpen size={20} color={theme.colors.text} />
          <Text style={styles.otherStepText}>Learn about Community Guidelines</Text>
          <ChevronRight size={18} color={theme.colors.textTertiary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const showBack = step !== 'reason';
  const headerTitle = step === 'submitted' ? '' : 'Report';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.modalContainer}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            {showBack ? (
              <TouchableOpacity style={styles.backBtn} onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <ArrowLeft size={22} color={theme.colors.text} />
              </TouchableOpacity>
            ) : (<View style={styles.backBtnPlaceholder} />)}
            <Text style={styles.sheetTitle}>{headerTitle}</Text>
            <View style={styles.backBtnPlaceholder} />
          </View>
          <View style={styles.divider} />
          <View style={styles.stepContent}>
            {step === 'reason' && renderReasonStep()}
            {step === 'sub-reason' && renderSubReasonStep()}
            {step === 'preview' && renderPreviewStep()}
            {step === 'submitted' && renderSubmittedStep()}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', paddingBottom: 34 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.borderLight, alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backBtnPlaceholder: { width: 36, height: 36 },
  sheetTitle: { fontSize: 17, fontWeight: '600' as const, color: theme.colors.text, textAlign: 'center' },
  divider: { height: 1, backgroundColor: theme.colors.borderLight },
  stepContent: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  stepTitle: { fontSize: 18, fontWeight: '700' as const, color: theme.colors.text, marginBottom: 10 },
  stepDescription: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20, marginBottom: 20 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  reasonText: { fontSize: 16, color: theme.colors.text, flex: 1, marginRight: 12 },
  previewContent: { flex: 1 },
  previewHeader: { marginBottom: 16 },
  previewAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.accentMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  previewAvatarText: { fontSize: 13, fontWeight: '700' as const, color: theme.colors.accent },
  previewMeta: { fontSize: 13, color: theme.colors.textSecondary },
  previewSummary: { fontSize: 16, color: theme.colors.text, lineHeight: 23, marginBottom: 8 },
  previewSummaryBold: { fontWeight: '600' as const },
  guidelineNote: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20, marginBottom: 24 },
  guidelineSection: { marginBottom: 24 },
  guidelineTitle: { fontSize: 17, fontWeight: '700' as const, color: theme.colors.text, marginBottom: 14 },
  guidelineBulletRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  guidelineRedDot: { width: 18, height: 18, borderRadius: 4, backgroundColor: theme.colors.error },
  guidelineWeRemove: { fontSize: 15, fontWeight: '500' as const, color: theme.colors.text },
  guidelineBulletItem: { flexDirection: 'row', paddingLeft: 26, marginBottom: 8, gap: 8 },
  bulletDot: { fontSize: 15, color: theme.colors.textSecondary, lineHeight: 21 },
  guidelineBulletText: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 21, flex: 1 },
  submitContainer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  submitBtn: { height: 50, borderRadius: 12, backgroundColor: theme.colors.info, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '600' as const, color: theme.colors.white },
  submittedSection: { alignItems: 'center', paddingTop: 8, paddingBottom: 16 },
  checkIconWrap: { marginBottom: 16 },
  submittedTitle: { fontSize: 22, fontWeight: '700' as const, color: theme.colors.text, textAlign: 'center', marginBottom: 10 },
  submittedDescription: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 12, marginBottom: 16 },
  toggleStatusLink: { fontSize: 15, fontWeight: '600' as const, color: theme.colors.info, marginBottom: 20 },
  statusTimeline: { width: '100%', paddingHorizontal: 4, marginBottom: 8 },
  statusStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  statusDotActive: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.info, marginTop: 4 },
  statusStepContent: { flex: 1 },
  statusStepTitle: { fontSize: 15, fontWeight: '600' as const, color: theme.colors.text, marginBottom: 4 },
  statusStepTitleInactive: { fontSize: 15, fontWeight: '600' as const, color: theme.colors.textTertiary, marginBottom: 4 },
  statusStepDesc: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 19 },
  statusLine: { width: 1, height: 20, backgroundColor: theme.colors.borderLight, marginLeft: 4.5 },
  otherStepsSection: { marginTop: 16, paddingBottom: 20 },
  otherStepsTitle: { fontSize: 17, fontWeight: '700' as const, color: theme.colors.text, marginBottom: 12 },
  otherStepRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  otherStepText: { fontSize: 15, color: theme.colors.text, flex: 1 },
});
