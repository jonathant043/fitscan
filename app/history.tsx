// app/history.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  loadHistory,
  computeStats,
  getMuscleGroupActivity,
  getSmartNudge,
  HistoryEntry,
  CANONICAL_MUSCLES,
} from "../lib/workoutHistory";
import { COLORS } from "../lib/constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  if (dateStr === today) return "Today";
  if (dateStr === yStr) return "Yesterday";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function groupByDate(entries: HistoryEntry[]): { date: string; entries: HistoryEntry[] }[] {
  const groups: Record<string, HistoryEntry[]> = {};
  for (const e of entries) {
    if (!groups[e.date]) groups[e.date] = [];
    groups[e.date].push(e);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => (a > b ? -1 : 1))
    .map(([date, ents]) => ({ date, entries: ents }));
}

function getLast7Days(): { label: string; iso: string }[] {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push({
      label: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1),
      iso: d.toISOString().slice(0, 10),
    });
  }
  return result;
}

function recencyColor(days: number | null): string {
  if (days === null) return "#334155";
  if (days === 0) return "#22c55e";
  if (days <= 1) return "#4ade80";
  if (days <= 3) return "#eab308";
  if (days <= 5) return "#f97316";
  return "#ef4444";
}

function recencyLabel(days: number | null): string {
  if (days === null) return "Not trained";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Workout card with expandable exercise list
// ---------------------------------------------------------------------------

function WorkoutCard({ entry }: { entry: HistoryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const exercises = entry.exercises ?? [];

  return (
    <TouchableOpacity
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.85}
      style={styles.workoutCard}
    >
      {/* Card header row */}
      <View style={styles.workoutCardIcon}>
        <Ionicons name="barbell-outline" size={20} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.workoutCardTop}>
          <Text style={styles.workoutTitle}>{entry.workout_title}</Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color="#475569"
          />
        </View>
        <Text style={styles.workoutMeta}>
          {entry.exercise_count} exercises · {entry.estimated_duration_minutes} min
        </Text>

        {/* Muscle tags */}
        {(entry.muscle_groups ?? []).length > 0 && (
          <View style={styles.muscleTags}>
            {(entry.muscle_groups ?? []).slice(0, 4).map((mg) => (
              <View key={mg} style={styles.muscleTag}>
                <Text style={styles.muscleTagText}>{mg}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Expanded exercise list */}
        {expanded && exercises.length > 0 && (
          <View style={styles.exerciseList}>
            {exercises.map((ex, i) => (
              <View key={i} style={styles.exerciseRow}>
                <View style={styles.exerciseNum}>
                  <Text style={styles.exerciseNumText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  <Text style={styles.exerciseDetail}>
                    {ex.sets} sets · {ex.reps}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {expanded && exercises.length === 0 && (
          <Text style={styles.noExercises}>Exercise details not available for this entry</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [muscleActivity, setMuscleActivity] = useState<Record<string, number | null>>({});
  const [nudge, setNudge] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        const h = await loadHistory();
        if (!active) return;
        setHistory(h);
        setMuscleActivity(getMuscleGroupActivity(h));
        setNudge(getSmartNudge(h));
      })();
      return () => { active = false; };
    }, [])
  );

  const stats = computeStats(history);
  const displayHistory = [...history].reverse();
  const workoutDates = new Set(history.map((e) => e.date));
  const grouped = groupByDate(displayHistory);
  const last7Days = getLast7Days();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
          <Text style={styles.subtitle}>{stats.totalWorkouts} workouts logged</Text>
        </View>

        {/* Smart Nudge */}
        {nudge && (
          <View style={styles.nudgeCard}>
            <Ionicons name="flash-outline" size={20} color={COLORS.primary} />
            <Text style={styles.nudgeText}>{nudge}</Text>
          </View>
        )}

        {/* This Week */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>THIS WEEK</Text>
          <View style={styles.weekRow}>
            {last7Days.map(({ label, iso }) => (
              <View key={iso} style={styles.dayCol}>
                <View style={[styles.dayDot, workoutDates.has(iso) && styles.dayDotActive]} />
                <Text style={styles.dayLabel}>{label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.weekStats}>
            <View style={styles.weekStat}>
              <Text style={styles.weekStatValue}>{stats.thisWeekCount}</Text>
              <Text style={styles.weekStatLabel}>workouts</Text>
            </View>
            <View style={styles.weekStatDivider} />
            <View style={styles.weekStat}>
              <Text style={styles.weekStatValue}>{stats.currentStreak}d</Text>
              <Text style={styles.weekStatLabel}>streak</Text>
            </View>
            <View style={styles.weekStatDivider} />
            <View style={styles.weekStat}>
              <Text style={styles.weekStatValue}>{stats.totalMinutes}m</Text>
              <Text style={styles.weekStatLabel}>total time</Text>
            </View>
          </View>
        </View>

        {/* Muscle Group Heatmap */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>MUSCLE GROUPS</Text>
          {CANONICAL_MUSCLES.map((muscle) => {
            const days = muscleActivity[muscle] ?? null;
            const color = recencyColor(days);
            return (
              <View key={muscle} style={styles.muscleRow}>
                <View style={[styles.muscleDot, { backgroundColor: color }]} />
                <Text style={styles.muscleName}>{muscle}</Text>
                <Text style={[styles.muscleRecency, { color }]}>{recencyLabel(days)}</Text>
              </View>
            );
          })}
        </View>

        {/* Workout Log */}
        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={52} color="#1e293b" />
            <Text style={styles.emptyTitle}>No workouts yet</Text>
            <Text style={styles.emptySubtitle}>Complete a scan to log your first workout</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>WORKOUT LOG</Text>
            {grouped.map(({ date, entries }) => (
              <View key={date}>
                <Text style={styles.dateHeader}>{formatDate(date)}</Text>
                {entries.map((entry) => (
                  <WorkoutCard key={entry.id} entry={entry} />
                ))}
              </View>
            ))}
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060d1a" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  header: { marginBottom: 20 },
  title: { fontSize: 30, fontWeight: "800", color: "#ffffff" },
  subtitle: { fontSize: 13, color: "#475569", marginTop: 2 },

  nudgeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0f2a3f",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1e4a6e",
  },
  nudgeText: { flex: 1, fontSize: 14, color: "#93c5fd", fontWeight: "600" },

  card: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 1.5,
    marginBottom: 14,
  },

  // Week row
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dayCol: { alignItems: "center", gap: 6 },
  dayDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1e293b",
  },
  dayDotActive: { backgroundColor: COLORS.primary },
  dayLabel: { fontSize: 11, color: "#475569", fontWeight: "600" },

  weekStats: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#1e293b", paddingTop: 14 },
  weekStat: { flex: 1, alignItems: "center" },
  weekStatValue: { fontSize: 22, fontWeight: "800", color: "#ffffff" },
  weekStatLabel: { fontSize: 11, color: "#475569", marginTop: 2 },
  weekStatDivider: { width: 1, backgroundColor: "#1e293b" },

  // Muscle heatmap
  muscleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    gap: 10,
  },
  muscleDot: { width: 10, height: 10, borderRadius: 5 },
  muscleName: { flex: 1, fontSize: 14, fontWeight: "600", color: "#e2e8f0" },
  muscleRecency: { fontSize: 13, fontWeight: "600" },

  // Workout log
  sectionTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 6,
  },
  dateHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 8,
    marginTop: 4,
  },
  workoutCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#0f172a",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  workoutCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  workoutCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  workoutTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: "#ffffff" },
  workoutMeta: { fontSize: 12, color: "#64748b", marginTop: 3 },
  muscleTags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  muscleTag: {
    backgroundColor: "#1e293b",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  muscleTagText: { fontSize: 11, fontWeight: "600", color: "#94a3b8" },

  // Exercise list (expanded)
  exerciseList: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingTop: 12,
    gap: 10,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  exerciseNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  exerciseNumText: { fontSize: 11, fontWeight: "700", color: "#64748b" },
  exerciseName: { fontSize: 14, fontWeight: "600", color: "#e2e8f0" },
  exerciseDetail: { fontSize: 12, color: "#475569", marginTop: 1 },
  noExercises: { fontSize: 12, color: "#334155", marginTop: 12, fontStyle: "italic" },

  emptyState: { alignItems: "center", paddingTop: 40, paddingBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#334155", marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: "#475569", marginTop: 6, textAlign: "center" },
});
