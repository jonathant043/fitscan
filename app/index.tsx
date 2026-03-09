// app/index.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadProfile, UserProfile } from "../lib/profileStorage";
import { loadStats, loadHistory, WorkoutStats, HistoryEntry } from "../lib/workoutHistory";
import { COLORS } from "../lib/constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EQUIPMENT_MUSCLES: Record<string, string> = {
  "Dumbbell": "Biceps · Shoulders",
  "Barbell": "Back · Legs",
  "Kettlebell": "Core · Glutes",
  "Cable Machine": "Back · Shoulders",
  "Weight Bench": "Chest · Triceps",
  "Pull-Up Bar": "Back · Biceps",
  "Treadmill": "Legs · Cardio",
  "Stationary Bike": "Legs · Cardio",
  "Jump Rope": "Calves · Cardio",
  "Resistance Band": "Full Body",
  "Exercise Mat": "Core",
  "Yoga Mat": "Flexibility",
  "Smith Machine": "Quads · Glutes",
  "Medicine Ball": "Core · Shoulders",
  "Exercise / Stability Ball": "Core · Balance",
  "Foam Roller": "Recovery",
  "Bodyweight": "Full Body",
};

function getMuscles(equipment: string): string {
  return EQUIPMENT_MUSCLES[equipment] ?? "Full Body";
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [recentHistory, setRecentHistory] = useState<HistoryEntry[]>([]);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        const [p, s, h] = await Promise.all([loadProfile(), loadStats(), loadHistory()]);
        if (!active) return;
        setProfile(p);
        setStats(s);
        setRecentHistory([...h].reverse().slice(0, 3));
        setProfileLoaded(true);
      })();
      return () => { active = false; };
    }, [])
  );

  const isNewUser = profileLoaded && !profile?.name;
  const displayName = profile?.name?.trim() || "Athlete";

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeLabel}>WELCOME BACK</Text>
            <Text style={styles.nameText}>{displayName}</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>💪</Text>
          </View>
        </View>

        {/* ── Stats Row (returning users) ── */}
        {!isNewUser && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.totalScans ?? 0}</Text>
              <Text style={styles.statLabel}>SCANS</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.totalWorkouts ?? 0}</Text>
              <Text style={styles.statLabel}>WORKOUTS</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {stats?.currentStreak ?? 0}
                <Text style={styles.statUnit}>d</Text>
              </Text>
              <Text style={styles.statLabel}>STREAK</Text>
            </View>
          </View>
        )}

        {/* ── Onboarding card (new users) ── */}
        {isNewUser && (
          <View style={styles.onboardingCard}>
            <View style={styles.onboardingBadge}>
              <Text style={styles.onboardingBadgeText}>GET STARTED</Text>
            </View>
            <Text style={styles.onboardingTitle}>Set up your profile</Text>
            <Text style={styles.onboardingSubtitle}>
              Takes 30 seconds — your workouts will be personalised to your goals and experience level.
            </Text>
            <TouchableOpacity style={styles.onboardingCTA} onPress={() => router.push("/profile")}>
              <Ionicons name="person-add-outline" size={18} color="#020617" />
              <Text style={styles.onboardingCTAText}>Set up my profile</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Primary CTA — START SCANNING ── */}
        <TouchableOpacity
          onPress={() => router.push("/equipment-scanner")}
          activeOpacity={0.88}
          style={styles.scanCTAWrapper}
        >
          <LinearGradient
            colors={["#1d4ed8", "#38bdf8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.scanCTA}
          >
            <View style={styles.scanCTAIconBg}>
              <Ionicons name="camera" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.scanCTATitle}>START SCANNING</Text>
              <Text style={styles.scanCTASubtitle}>Point at any gym equipment</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Secondary buttons ── */}
        <View style={styles.secondaryRow}>
          <TouchableOpacity style={styles.secondaryCard} onPress={() => router.push("/exercises")}>
            <Ionicons name="barbell-outline" size={20} color="#e5e7eb" />
            <Text style={styles.secondaryCardText}>Browse Exercises</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryCard} onPress={() => router.push("/profile")}>
            <Ionicons name="person-outline" size={20} color="#e5e7eb" />
            <Text style={styles.secondaryCardText}>
              {isNewUser ? "Set up Profile" : "Edit Profile"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Recent Scans ── */}
        {recentHistory.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>RECENT WORKOUTS</Text>
            </View>

            {recentHistory.map((entry) => {
              const equipmentName = entry.equipment_used?.[0] ?? entry.workout_title;
              return (
                <View key={entry.id} style={styles.scanCard}>
                  <View style={styles.scanCardIconBox}>
                    <Ionicons name="barbell-outline" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.scanCardBody}>
                    <Text style={styles.scanCardTitle}>{equipmentName}</Text>
                    <Text style={styles.scanCardMuscles}>{getMuscles(equipmentName)}</Text>
                  </View>
                  <View style={styles.scanCardRight}>
                    <Text style={styles.scanCardTime}>{timeAgo(entry.timestamp)}</Text>
                    <View style={styles.setsBadge}>
                      <Text style={styles.setsBadgeText}>{entry.exercise_count} exercises</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
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

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  welcomeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  nameText: { fontSize: 30, fontWeight: "800", color: "#ffffff" },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: { fontSize: 24 },

  // Stats row
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  statValue: { fontSize: 26, fontWeight: "800", color: COLORS.primary },
  statUnit: { fontSize: 18, fontWeight: "700", color: COLORS.primary },
  statLabel: { fontSize: 10, fontWeight: "700", color: "#475569", letterSpacing: 1, marginTop: 4 },

  // Onboarding card
  onboardingCard: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1e3a5f",
  },
  onboardingBadge: {
    backgroundColor: COLORS.primary,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  onboardingBadgeText: { color: "#020617", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  onboardingTitle: { fontSize: 18, fontWeight: "700", color: "#ffffff", marginBottom: 6 },
  onboardingSubtitle: { fontSize: 13, color: "#9ca3af", marginBottom: 16 },
  onboardingCTA: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 13,
  },
  onboardingCTAText: { color: "#020617", fontSize: 15, fontWeight: "700" },

  // Scan CTA
  scanCTAWrapper: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 14,
  },
  scanCTA: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 22,
    paddingHorizontal: 20,
    gap: 16,
  },
  scanCTAIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanCTATitle: { fontSize: 18, fontWeight: "800", color: "#ffffff", letterSpacing: 0.5 },
  scanCTASubtitle: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2 },

  // Secondary row
  secondaryRow: { flexDirection: "row", gap: 10, marginBottom: 28 },
  secondaryCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0f172a",
    borderRadius: 16,
    paddingVertical: 16,
  },
  secondaryCardText: { fontSize: 13, fontWeight: "600", color: "#e5e7eb" },

  // Recent Scans section
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 11, fontWeight: "800", color: "#475569", letterSpacing: 1.5 },
  viewAll: { fontSize: 13, fontWeight: "600", color: COLORS.primary },

  // Scan history card
  scanCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  scanCardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  scanCardBody: { flex: 1 },
  scanCardTitle: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
  scanCardMuscles: { fontSize: 12, color: "#64748b", marginTop: 2 },
  scanCardRight: { alignItems: "flex-end", gap: 6 },
  scanCardTime: { fontSize: 12, color: "#475569" },
  setsBadge: {
    backgroundColor: "#1e293b",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  setsBadgeText: { fontSize: 12, fontWeight: "600", color: "#94a3b8" },
});
