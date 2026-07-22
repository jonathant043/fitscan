// app/quiz.tsx
// Onboarding quiz — one question per screen, progress bar, ~60s.
// Every answer has a real effect on workout generation or app behavior.
// Ships ACTIVE regardless of MONETIZATION_ENABLED flag.

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, STORAGE_KEYS } from "../lib/constants";
import {
  loadProfile,
  saveProfile,
  UserProfile,
  TrainingLocation,
} from "../lib/profileStorage";
import { setWeightUnit, WeightUnit } from "../lib/weightUnit";
import { trackEvent } from "../lib/api";

// ---------------------------------------------------------------------------
// Question definitions — each has a real, testable effect
// ---------------------------------------------------------------------------

type QuizQuestion = {
  id: string;
  title: string;
  subtitle?: string;
  answers: { label: string; value: string }[];
  multiSelect?: boolean;
};

const QUESTIONS: QuizQuestion[] = [
  {
    id: "goal",
    title: "What's your\nprimary goal?",
    subtitle: "This shapes your rep ranges, rest periods, and exercise selection.",
    answers: [
      { label: "Build muscle", value: "Build muscle" },
      { label: "Lose fat", value: "Lose fat" },
      { label: "Get stronger", value: "Get stronger" },
      { label: "General fitness", value: "Stay active & healthy" },
    ],
  },
  {
    id: "experience",
    title: "How would you\ndescribe your experience?",
    subtitle: "We'll adjust exercise complexity and coaching detail.",
    answers: [
      { label: "New to lifting", value: "Beginner" },
      { label: "Coming back after a break", value: "Intermediate" },
      { label: "Regular gym-goer", value: "Intermediate" },
      { label: "Advanced / competitive", value: "Advanced" },
    ],
  },
  {
    id: "days",
    title: "How many days\ncan you train?",
    subtitle: "Fewer days = fuller-body sessions. More days = focused splits.",
    answers: [
      { label: "2 days", value: "2" },
      { label: "3 days", value: "3" },
      { label: "4 days", value: "4" },
      { label: "5+ days", value: "5" },
    ],
  },
  {
    id: "location",
    title: "Where do you\nusually train?",
    subtitle: "Helps us recommend the right equipment and exercises.",
    answers: [
      { label: "Commercial gym", value: "Commercial gym" },
      { label: "At home", value: "Home" },
      { label: "Both", value: "Both" },
    ],
  },
  {
    id: "injuries",
    title: "Any areas to\nbe careful with?",
    subtitle: "We'll avoid exercises that stress these areas.",
    multiSelect: true,
    answers: [
      { label: "None — all good!", value: "none" },
      { label: "Knees", value: "Knees" },
      { label: "Shoulders", value: "Shoulders" },
      { label: "Lower back", value: "Lower back" },
    ],
  },
  {
    id: "units",
    title: "Weight units",
    subtitle: "How should we display weights?",
    answers: [
      { label: "Pounds (lbs)", value: "lbs" },
      { label: "Kilograms (kg)", value: "kg" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuizScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [progressAnim] = useState(() => new Animated.Value(0));

  const question = QUESTIONS[step];
  const total = QUESTIONS.length;
  const progress = (step + 1) / total;

  useEffect(() => {
    trackEvent("quiz_started").catch(() => {});
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [step]);

  function handleSelect(value: string) {
    const q = QUESTIONS[step];

    if (q.multiSelect) {
      const current = (answers[q.id] as string[]) || [];
      // "none" is exclusive — clears all others
      if (value === "none") {
        setAnswers({ ...answers, [q.id]: ["none"] });
      } else {
        const filtered = current.filter((v) => v !== "none");
        const exists = filtered.includes(value);
        const next = exists
          ? filtered.filter((v) => v !== value)
          : [...filtered, value];
        setAnswers({ ...answers, [q.id]: next.length ? next : [] });
      }
      return;
    }

    // Single-select: answer and auto-advance
    const updated = { ...answers, [q.id]: value };
    setAnswers(updated);

    // Small delay for visual feedback
    setTimeout(() => advanceOrFinish(updated), 250);
  }

  function handleNext() {
    advanceOrFinish(answers);
  }

  function handleSkip() {
    advanceOrFinish(answers);
  }

  async function advanceOrFinish(
    currentAnswers: Record<string, string | string[]>
  ) {
    if (step < total - 1) {
      setStep(step + 1);
    } else {
      await finishQuiz(currentAnswers);
    }
  }

  async function finishQuiz(
    finalAnswers: Record<string, string | string[]>
  ) {
    try {
      // Build profile from answers, merging with any existing profile
      const existing = (await loadProfile()) ?? {
        name: "",
        experienceLevel: "Beginner" as const,
        primaryGoal: "Stay active & healthy",
        daysPerWeek: 3,
        equipmentAccess: [],
      };

      const profile: UserProfile = {
        ...existing,
        primaryGoal:
          (finalAnswers.goal as string) || existing.primaryGoal,
        experienceLevel:
          ((finalAnswers.experience as string) as UserProfile["experienceLevel"]) ||
          existing.experienceLevel,
        daysPerWeek:
          parseInt(finalAnswers.days as string, 10) || existing.daysPerWeek,
        trainingLocation:
          (finalAnswers.location as TrainingLocation) ||
          existing.trainingLocation,
        avoidAreas: (() => {
          const raw = finalAnswers.injuries;
          if (!raw) return existing.avoidAreas;
          const arr = Array.isArray(raw) ? raw : [raw];
          const filtered = arr.filter((v) => v !== "none");
          return filtered.length ? filtered : [];
        })(),
      };

      await saveProfile(profile);

      // Write weight unit preference
      if (finalAnswers.units) {
        await setWeightUnit(finalAnswers.units as WeightUnit);
      }

      // Mark quiz as completed
      await AsyncStorage.setItem(STORAGE_KEYS.quizCompleted, "true");

      // Log only non-sensitive dimensions — never send injury/health data to analytics
      const { injuries: _injuries, ...safeAnswers } = finalAnswers;
      await trackEvent("quiz_completed", undefined, {
        goal: safeAnswers.goal,
        experience: safeAnswers.experience,
        days: safeAnswers.days,
      }).catch(() => {});
    } catch (e) {
      console.warn("Quiz save error", e);
    }

    router.replace("/");
  }

  // Check if current multi-select question has selections for the "Next" button
  const multiSelections = question.multiSelect
    ? (answers[question.id] as string[]) || []
    : [];
  const isMultiSelected = question.multiSelect && multiSelections.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {step + 1} of {total}
        </Text>
      </View>

      {/* Question */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionTitle}>{question.title}</Text>
        {question.subtitle && (
          <Text style={styles.questionSubtitle}>{question.subtitle}</Text>
        )}
      </View>

      {/* Answers */}
      <View style={styles.answersContainer}>
        {question.answers.map((ans) => {
          const isActive = question.multiSelect
            ? multiSelections.includes(ans.value)
            : answers[question.id] === ans.value;

          return (
            <TouchableOpacity
              key={ans.value}
              style={[styles.answerCard, isActive && styles.answerCardActive]}
              onPress={() => handleSelect(ans.value)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.answerText,
                  isActive && styles.answerTextActive,
                ]}
              >
                {ans.label}
              </Text>
              {isActive && (
                <View style={styles.checkCircle}>
                  <Text style={styles.checkMark}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bottom actions */}
      <View style={styles.bottomRow}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        {question.multiSelect && (
          <TouchableOpacity
            onPress={handleNext}
            disabled={!isMultiSelected}
            style={[
              styles.nextBtn,
              !isMultiSelected && styles.nextBtnDisabled,
            ]}
          >
            <Text style={styles.nextBtnText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#060d1a",
    paddingHorizontal: 24,
  },
  progressContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "#1e293b",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "right",
  },
  questionContainer: {
    marginTop: 32,
    marginBottom: 32,
  },
  questionTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 38,
    marginBottom: 12,
  },
  questionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  answersContainer: {
    gap: 10,
  },
  answerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0f172a",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#1e293b",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  answerCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(56,189,248,0.08)",
  },
  answerText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  answerTextActive: {
    color: "#fff",
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    color: "#020617",
    fontSize: 14,
    fontWeight: "800",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
    paddingBottom: 24,
  },
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 15,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  nextBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  nextBtnDisabled: {
    opacity: 0.4,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#020617",
  },
});
