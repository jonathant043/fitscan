// app/profile.tsx

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  loadProfile,
  saveProfile,
  clearProfile,
  UserProfile,
} from "../lib/profileStorage";
import { getSubscriptionStatus } from "../lib/scanLimit";
import { restorePurchases, checkProEntitlement } from "../lib/purchases";
import { deleteMyData } from "../lib/api";
import { clearHistory } from "../lib/workoutHistory";
import { STORAGE_KEYS } from "../lib/constants";
import { isMonetizationEnabled } from "../lib/monetization";
import Paywall from "./paywall";

const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

const GOALS = [
  "Lose fat",
  "Build muscle",
  "Get stronger",
  "Improve endurance",
  "Stay active & healthy",
] as const;

const DAYS_PER_WEEK = [2, 3, 4, 5, 6] as const;

const TRAINING_LOCATIONS = ["Commercial gym", "Home", "Both"] as const;

const INJURY_AREAS = ["Knees", "Shoulders", "Lower back"] as const;

const EQUIPMENT_OPTIONS = [
  "Dumbbells",
  "Barbell & Rack",
  "Weight Bench",
  "Kettlebell",
  "Resistance Bands",
  "Pull-Up Bar",
  "Cable Machine",
  "Functional Trainer / FTS",
  "Smith Machine",
  "Leg Press Machine",
  "Lat Pulldown Machine",
  "Pec Deck / Chest Fly",
  "Machine Chest Press",
  "Seated Row Machine",
  "Leg Extension Machine",
  "Leg Curl Machine",
  "Shoulder Press Machine",
  "Hip Abductor Machine",
  "Hack Squat Machine",
  "Assisted Pull-Up Machine",
  "Elliptical Trainer",
  "Treadmill",
  "Stationary Bike / Spin",
  "Rowing Machine",
  "Medicine Ball",
  "Foam Roller",
  "Bodyweight Only",
] as const;

// Fallback shape; cast so we don't fight TypeScript if the type changes
const defaultProfile = {
  name: "",
  experienceLevel: "Beginner",
  primaryGoal: "Stay active & healthy",
  daysPerWeek: 3,
  equipmentAccess: [] as string[],
} as UserProfile;

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExistingProfile, setIsExistingProfile] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const init = async () => {
        try {
          const stored = await loadProfile();
          if (!active) return;
          if (stored) {
            setProfile(stored);
            setIsExistingProfile(!!stored.name?.trim());
          } else {
            // Profile was cleared (e.g. after data deletion) — reset to defaults
            setProfile(defaultProfile);
            setIsExistingProfile(false);
          }
          const status = await getSubscriptionStatus();
          if (active) setIsPro(status.isPro);
        } catch (e) {
          console.warn("Failed to load profile", e);
        } finally {
          if (active) setIsLoading(false);
        }
      };
      init();
      return () => { active = false; };
    }, [])
  );

  const toggleEquipment = (item: string) => {
    setProfile((prev) => {
      const list = prev.equipmentAccess ?? [];
      const exists = list.includes(item);
      const nextList = exists
        ? list.filter((x) => x !== item)
        : [...list, item];

      return {
        ...prev,
        equipmentAccess: nextList,
      };
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveProfile(profile);
      Alert.alert("Profile saved", "Your workout preferences are updated.");
      // After saving, go back to home
      router.replace("/");
    } catch (e) {
      console.error("Save profile error", e);
      Alert.alert("Error", "Could not save your profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await clearProfile();
      setProfile(defaultProfile);
    } catch (e) {
      console.error("Clear profile error", e);
      Alert.alert("Error", "Could not reset your profile.");
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.push("/")}>
          <Text style={styles.backText}>← Home</Text>
        </TouchableOpacity>
        <Image source={require("../assets/logo.png")} style={styles.headerLogo} resizeMode="contain" />
      </View>
      <Text style={styles.headerTitle}>{isExistingProfile ? "Edit profile" : "Set up your profile"}</Text>

      <Text style={styles.headerSubtitle}>
        {isExistingProfile
          ? "Update your goals and preferences anytime."
          : "Takes 30 seconds — workouts will be tailored to you."}
      </Text>

      {/* Name */}
      <View style={styles.section}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          value={profile.name}
          onChangeText={(text) => setProfile({ ...profile, name: text })}
          placeholder="Your name"
          placeholderTextColor="#6B7280"
          style={styles.input}
        />
      </View>

      {/* Experience */}
      <View style={styles.section}>
        <Text style={styles.label}>Experience level</Text>
        <View style={styles.chipRow}>
          {EXPERIENCE_LEVELS.map((level) => {
            const isActive = profile.experienceLevel === level;
            return (
              <TouchableOpacity
                key={level}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() =>
                  setProfile({ ...profile, experienceLevel: level })
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    isActive && styles.chipTextActive,
                  ]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Goal */}
      <View style={styles.section}>
        <Text style={styles.label}>Primary goal</Text>
        <View style={styles.chipColumn}>
          {GOALS.map((goal) => {
            const isActive = profile.primaryGoal === goal;
            return (
              <TouchableOpacity
                key={goal}
                style={[styles.chipFull, isActive && styles.chipActiveFull]}
                onPress={() => setProfile({ ...profile, primaryGoal: goal })}
              >
                <Text
                  style={[
                    styles.chipText,
                    isActive && styles.chipTextActive,
                  ]}
                >
                  {goal}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Days per week */}
      <View style={styles.section}>
        <Text style={styles.label}>Days per week you can train</Text>
        <View style={styles.chipRow}>
          {DAYS_PER_WEEK.map((d) => {
            const isActive = profile.daysPerWeek === d;
            return (
              <TouchableOpacity
                key={d}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setProfile({ ...profile, daysPerWeek: d })}
              >
                <Text
                  style={[
                    styles.chipText,
                    isActive && styles.chipTextActive,
                  ]}
                >
                  {d} days
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Equipment */}
      <View style={styles.section}>
        <Text style={styles.label}>Equipment you have access to</Text>
        <View style={styles.chipWrapRow}>
          {EQUIPMENT_OPTIONS.map((item) => {
            const list = profile.equipmentAccess ?? [];
            const isActive = list.includes(item);
            return (
              <TouchableOpacity
                key={item}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => toggleEquipment(item)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isActive && styles.chipTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Training location */}
      <View style={styles.section}>
        <Text style={styles.label}>Where do you train?</Text>
        <View style={styles.chipRow}>
          {TRAINING_LOCATIONS.map((loc) => {
            const isActive = profile.trainingLocation === loc;
            return (
              <TouchableOpacity
                key={loc}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setProfile({ ...profile, trainingLocation: loc })}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {loc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Injury areas */}
      <View style={styles.section}>
        <Text style={styles.label}>Areas to be careful with</Text>
        <View style={styles.chipRow}>
          {INJURY_AREAS.map((area) => {
            const list = profile.avoidAreas ?? [];
            const isActive = list.includes(area);
            return (
              <TouchableOpacity
                key={area}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => {
                  const current = profile.avoidAreas ?? [];
                  const next = isActive
                    ? current.filter((a) => a !== area)
                    : [...current, area];
                  setProfile({ ...profile, avoidAreas: next });
                }}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {area}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Upgrade to Pro — hidden when monetization flag is off */}
      {!isPro && isMonetizationEnabled() && (
        <TouchableOpacity
          style={styles.upgradeRow}
          onPress={() => setShowPaywall(true)}
          activeOpacity={0.8}
        >
          <View style={styles.upgradeRowLeft}>
            <Ionicons name="star" size={20} color="#f59e0b" />
            <View>
              <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
              <Text style={styles.upgradeSubtitle}>Unlimited scans & custom workouts</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#64748b" />
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.primaryButton, isSaving && styles.disabledButton]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.primaryButtonText}>
            {isSaving ? "Saving…" : "Save profile"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleReset}>
          <Text style={styles.secondaryButtonText}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={async () => {
            const restored = await restorePurchases();
            if (restored) {
              setIsPro(true);
              Alert.alert("Restored", "Your Pro subscription has been restored.");
            } else {
              Alert.alert("No purchases found", "We couldn't find any previous purchases to restore.");
            }
          }}
        >
          <Text style={styles.secondaryButtonText}>Restore purchases</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { marginTop: 12, borderColor: "#ef4444" }]}
          onPress={() => {
            Alert.alert(
              "Delete my data",
              "This will permanently delete all your data — server-side records AND local workout history, profile, and settings.\n\nPurchase and subscription records are retained by Google Play and RevenueCat as required by law.\n\nThis cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete everything",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      // 1. Delete server-side data
                      const result = await deleteMyData();
                      const total = Object.values(result.deleted).reduce((a, b) => a + b, 0);

                      // 2. Preserve Pro status before wiping local data
                      const stillPro = await checkProEntitlement();

                      // 3. Clear all local data EXCEPT deviceId and Pro entitlement
                      await clearProfile();
                      await clearHistory();
                      await AsyncStorage.multiRemove([
                        STORAGE_KEYS.quizCompleted,
                        STORAGE_KEYS.scanLimit,
                        STORAGE_KEYS.weightUnit,
                        STORAGE_KEYS.inProgressSetLogs,
                        STORAGE_KEYS.inProgressWorkout,
                        STORAGE_KEYS.favorites,
                        STORAGE_KEYS.reviewPromptShown,
                        STORAGE_KEYS.paywallLastShown,
                        STORAGE_KEYS.paywallAutoShown,
                        STORAGE_KEYS.firstScanDone,
                      ]);

                      // 4. Restore Pro cache if subscriber (purchases are retained)
                      if (stillPro) {
                        await AsyncStorage.setItem(
                          STORAGE_KEYS.scanLimit,
                          JSON.stringify({ scansUsed: 0, periodStart: new Date().toISOString().slice(0, 7), isPro: true, proActivatedAt: Date.now() })
                        );
                      }

                      Alert.alert(
                        "Data deleted",
                        `${total} server record${total !== 1 ? "s" : ""} removed. Local data cleared.\n\nYou'll be taken through setup again.`,
                        [{ text: "OK", onPress: () => router.replace("/quiz") }]
                      );
                    } catch {
                      Alert.alert("Error", "Could not delete data. Please check your connection and try again.");
                    }
                  },
                },
              ]
            );
          }}
        >
          <Text style={[styles.secondaryButtonText, { color: "#ef4444" }]}>Delete my data</Text>
        </TouchableOpacity>
      </View>

      <Paywall
        visible={showPaywall}
        entryContext="voluntary"
        onClose={() => setShowPaywall(false)}
        onProActivated={() => {
          setShowPaywall(false);
          setIsPro(true);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020817",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#020817",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#E5E7EB",
    fontSize: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLogo: {
    width: 36,
    height: 36,
    opacity: 0.85,
  },
  backText: {
    color: "#60A5FA",
    fontSize: 14,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 16,
  },
  section: {
    marginTop: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E5E7EB",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#020617",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F2933",
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#F9FAFB",
    fontSize: 15,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipWrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipColumn: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1F2933",
    backgroundColor: "#020617",
  },
  chipFull: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1F2933",
    backgroundColor: "#020617",
  },
  chipActive: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },
  chipActiveFull: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },
  chipText: {
    color: "#E5E7EB",
    fontSize: 14,
  },
  chipTextActive: {
    color: "#022C22",
    fontWeight: "600",
  },
  buttonRow: {
    marginTop: 28,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4B5563",
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#9CA3AF",
    fontSize: 15,
  },

  // Upgrade row
  upgradeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0f172a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 16,
    marginTop: 24,
  },
  upgradeRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  upgradeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  upgradeSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 1,
  },
});
