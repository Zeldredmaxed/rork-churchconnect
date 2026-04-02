import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Calendar, Clock, ChevronUp, ChevronDown } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

interface DateTimePickerProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
}

export default function DateTimePicker({ label, value, onChange, minimumDate }: DateTimePickerProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [expanded, setExpanded] = useState(false);
  const animHeight = useRef(new Animated.Value(0)).current;

  const month = value.getMonth();
  const day = value.getDate();
  const year = value.getFullYear();
  const rawHour = value.getHours();
  const minute = value.getMinutes();
  const isPM = rawHour >= 12;
  const hour12 = rawHour === 0 ? 12 : rawHour > 12 ? rawHour - 12 : rawHour;

  useEffect(() => {
    Animated.timing(animHeight, {
      toValue: expanded ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [expanded, animHeight]);

  const updateDate = useCallback((newMonth: number, newDay: number, newYear: number, newHour24: number, newMinute: number) => {
    const maxDay = getDaysInMonth(newMonth, newYear);
    const clampedDay = Math.min(newDay, maxDay);
    const d = new Date(newYear, newMonth, clampedDay, newHour24, newMinute, 0, 0);
    if (minimumDate && d < minimumDate) return;
    onChange(d);
  }, [onChange, minimumDate]);

  const adjustMonth = (dir: number) => {
    let newMonth = month + dir;
    let newYear = year;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    if (newMonth > 11) { newMonth = 0; newYear++; }
    updateDate(newMonth, day, newYear, rawHour, minute);
  };

  const adjustDay = (dir: number) => {
    const maxDay = getDaysInMonth(month, year);
    let newDay = day + dir;
    if (newDay < 1) newDay = maxDay;
    if (newDay > maxDay) newDay = 1;
    updateDate(month, newDay, year, rawHour, minute);
  };

  const adjustYear = (dir: number) => {
    updateDate(month, day, year + dir, rawHour, minute);
  };

  const adjustHour = (dir: number) => {
    let newHour = rawHour + dir;
    if (newHour < 0) newHour = 23;
    if (newHour > 23) newHour = 0;
    updateDate(month, day, year, newHour, minute);
  };

  const adjustMinute = (dir: number) => {
    let newMinute = minute + dir * 5;
    if (newMinute < 0) newMinute = 55;
    if (newMinute > 55) newMinute = 0;
    updateDate(month, day, year, rawHour, newMinute);
  };

  const toggleAMPM = () => {
    const newHour = isPM ? rawHour - 12 : rawHour + 12;
    updateDate(month, day, year, newHour, minute);
  };

  const formattedDate = `${MONTHS_SHORT[month]} ${day}, ${year}`;
  const formattedTime = `${hour12}:${minute.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;

  const pickerHeight = animHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
        </View>
        <View style={styles.valueRow}>
          <View style={styles.valuePill}>
            <Calendar size={13} color={theme.colors.accent} />
            <Text style={styles.valueText}>{formattedDate}</Text>
          </View>
          <View style={styles.valuePill}>
            <Clock size={13} color={theme.colors.accent} />
            <Text style={styles.valueText}>{formattedTime}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <Animated.View style={[styles.pickerContainer, { maxHeight: pickerHeight, opacity: animHeight }]}>
        <View style={styles.pickersRow}>
          <View style={styles.dateSection}>
            <Text style={styles.sectionLabel}>DATE</Text>
            <View style={styles.spinnersRow}>
              <SpinnerColumn
                theme={theme}
                value={MONTHS_SHORT[month] ?? ''}
                onUp={() => adjustMonth(1)}
                onDown={() => adjustMonth(-1)}
                width={52}
              />
              <SpinnerColumn
                theme={theme}
                value={String(day)}
                onUp={() => adjustDay(1)}
                onDown={() => adjustDay(-1)}
                width={36}
              />
              <SpinnerColumn
                theme={theme}
                value={String(year)}
                onUp={() => adjustYear(1)}
                onDown={() => adjustYear(-1)}
                width={52}
              />
            </View>
          </View>

          <View style={styles.timeDivider} />

          <View style={styles.timeSection}>
            <Text style={styles.sectionLabel}>TIME</Text>
            <View style={styles.spinnersRow}>
              <SpinnerColumn
                theme={theme}
                value={String(hour12)}
                onUp={() => adjustHour(1)}
                onDown={() => adjustHour(-1)}
                width={32}
              />
              <Text style={styles.colonText}>:</Text>
              <SpinnerColumn
                theme={theme}
                value={minute.toString().padStart(2, '0')}
                onUp={() => adjustMinute(1)}
                onDown={() => adjustMinute(-1)}
                width={32}
              />
              <TouchableOpacity style={styles.ampmButton} onPress={toggleAMPM} activeOpacity={0.7}>
                <Text style={styles.ampmText}>{isPM ? 'PM' : 'AM'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

interface SpinnerColumnProps {
  theme: AppTheme;
  value: string;
  onUp: () => void;
  onDown: () => void;
  width: number;
}

function SpinnerColumn({ theme, value, onUp, onDown, width }: SpinnerColumnProps) {
  const styles = createSpinnerStyles(theme);
  return (
    <View style={[styles.column, { width }]}>
      <TouchableOpacity onPress={onUp} style={styles.arrowBtn} activeOpacity={0.6}>
        <ChevronUp size={14} color={theme.colors.textTertiary} />
      </TouchableOpacity>
      <View style={styles.valueBox}>
        <Text style={styles.valueText}>{value}</Text>
      </View>
      <TouchableOpacity onPress={onDown} style={styles.arrowBtn} activeOpacity={0.6}>
        <ChevronDown size={14} color={theme.colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

const createSpinnerStyles = (theme: AppTheme) => StyleSheet.create({
  column: {
    alignItems: 'center',
  },
  arrowBtn: {
    padding: 4,
    borderRadius: 6,
  },
  valueBox: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 6,
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
});

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    marginBottom: 10,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    gap: 8,
  },
  valuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.accentMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  valueText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: theme.colors.text,
  },
  pickerContainer: {
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  pickersRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  dateSection: {
    flex: 1,
  },
  timeSection: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  spinnersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  timeDivider: {
    width: 1,
    height: 80,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: 10,
    alignSelf: 'center' as const,
    marginTop: 18,
  },
  colonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.colors.textSecondary,
    marginHorizontal: 1,
  },
  ampmButton: {
    backgroundColor: theme.colors.accentMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginLeft: 4,
  },
  ampmText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
});
