// app/profile.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  loadProfile,
  saveProfile,
  clearProfile,
  UserProfile,
} from "../lib/profileStorage";

const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

const GOALS = [
  "Lose fat",
  "Build muscle",
  "Get stronger",
  "Improve endurance",
  "Stay active & healthy",
] as const;

const DAYS_PER_WEEK = [2, 3, 4, 5, 6] as const;

const EQUIPMENT_OPTIONS = [
  "Dumbbells",
  "Barbell",
  "Bench",
  "Resistance bands",
  "Pull-up bar",
  "Kettlebell",
  "Cable machine",
  "Bodyweight only",
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

  useEffect(() => {
    const init = async () => {
      try {
        const stored = await loadProfile();
        if (stored) {
          setProfile(stored);
        }
      } catch (e) {
        console.warn("Failed to load profile", e);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

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
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set up your profile</Text>
      </View>

      <Text style={styles.headerSubtitle}>
        Tell us about your goals so we can tailor your workouts.
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
      </View>
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
    marginBottom: 12,
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
});
