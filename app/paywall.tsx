// app/paywall.tsx
// Paywall modal — 3 screens: ScanLimitHit → PlanSelection → TrialConfirmed

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useStripe } from "@stripe/stripe-react-native";
import { COLORS, SCAN_LIMIT } from "../lib/constants";
import { activatePro } from "../lib/scanLimit";
import { createSetupIntent, activateSubscription, type PlanId } from "../lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PaywallProps = {
  visible: boolean;
  scansUsed?: number;
  daysUntilReset?: number;
  onClose: () => void;
  onProActivated: () => void;
};

type PaywallScreen = "limit" | "plans" | "confirmed";

type Plan = {
  id: "basic" | "pro" | "annual";
  name: string;
  price: string;
  period: string;
  badge?: string;
  badgeColor?: string;
  features: string[];
};

// ---------------------------------------------------------------------------
// Plan data
// ---------------------------------------------------------------------------

const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    price: "$4.99",
    period: "/ month",
    features: ["30 AI scans per month", "Custom workout plans", "Workout history"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$9.99",
    period: "/ month",
    badge: "MOST POPULAR",
    badgeColor: "#38bdf8",
    features: [
      "Unlimited AI scans",
      "Custom workout plans",
      "Full workout history",
      "Priority AI speed",
    ],
  },
  {
    id: "annual",
    name: "Annual",
    price: "$79.99",
    period: "/ year",
    badge: "SAVE 33%",
    badgeColor: "#22c55e",
    features: [
      "Unlimited AI scans",
      "Custom workout plans",
      "Full workout history",
      "Priority AI speed",
    ],
  },
];

const PRO_FEATURES = [
  { icon: "∞", label: "Unlimited AI scans every month" },
  { icon: "📋", label: "Custom workout plans from your scans" },
  { icon: "📈", label: "Full workout history & progress tracking" },
  { icon: "⚡", label: "Priority AI response speed" },
];

// ---------------------------------------------------------------------------
// Screen 1 — Scan limit hit
// ---------------------------------------------------------------------------

function ScanLimitScreen({
  scansUsed,
  daysUntilReset,
  onStartTrial,
  onSeePlans,
  onClose,
}: {
  scansUsed: number;
  daysUntilReset: number;
  onStartTrial: () => void;
  onSeePlans: () => void;
  onClose: () => void;
}) {
  const pct = Math.min(1, scansUsed / SCAN_LIMIT.free);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={22} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Icon */}
        <View style={styles.limitIconWrapper}>
          <View style={styles.limitIconCircle}>
            <Text style={styles.limitIconEmoji}>📷</Text>
          </View>
          <View style={styles.limitBadge}>
            <Text style={styles.limitBadgeText}>!</Text>
          </View>
        </View>

        <View style={styles.fitscanLabel}>
          <Text style={styles.fitscanLabelText}>FITSCAN</Text>
        </View>

        <Text style={styles.limitTitle}>You've used all{"\n"}your free scans</Text>
        <Text style={styles.limitSubtitle}>
          You've used {scansUsed} of {SCAN_LIMIT.free} free scans this month.{"\n"}
          Upgrade to keep scanning and building workouts.
        </Text>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLeft}>
              {scansUsed} / {SCAN_LIMIT.free} scans used
            </Text>
            <Text style={styles.progressRight}>Resets in {daysUntilReset} days</Text>
          </View>
        </View>

        {/* Pro features card */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresCardLabel}>WITH PRO YOU GET</Text>
          {PRO_FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* CTAs */}
        <TouchableOpacity onPress={onStartTrial} activeOpacity={0.88} style={styles.ctaWrapper}>
          <LinearGradient
            colors={["#2563eb", "#38bdf8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaButton}
          >
            <Text style={styles.ctaButtonText}>START 7-DAY FREE TRIAL</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={onSeePlans} style={styles.seePlansBtn}>
          <Text style={styles.seePlansText}>See all plans</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Screen 2 — Plan selection
// ---------------------------------------------------------------------------

function PlanSelectionScreen({
  onBack,
  onConfirm,
}: {
  onBack: () => void;
  onConfirm: (plan: Plan) => void;
}) {
  const [selected, setSelected] = useState<Plan["id"]>("pro");
  const [loading, setLoading] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const selectedPlan = PLANS.find((p) => p.id === selected)!;

  async function handleSubscribe() {
    setLoading(true);
    try {
      // 1. Create Stripe Customer + SetupIntent on the backend
      const { clientSecret, customerId } = await createSetupIntent(selected as PlanId);

      // 2. Initialise the PaymentSheet with the SetupIntent client secret
      const { error: initError } = await initPaymentSheet({
        setupIntentClientSecret: clientSecret,
        merchantDisplayName: "FitScan",
        style: "alwaysDark",
        appearance: {
          colors: {
            primary: "#38bdf8",
            background: "#0f172a",
            componentBackground: "#1e293b",
            componentBorder: "#334155",
            componentDivider: "#334155",
            primaryText: "#ffffff",
            secondaryText: "#94a3b8",
            componentText: "#ffffff",
            placeholderText: "#64748b",
            icon: "#94a3b8",
          },
        },
      });
      if (initError) {
        Alert.alert("Payment error", initError.message);
        return;
      }

      // 3. Present the PaymentSheet for the user to enter card details
      const { error: presentError, paymentOption } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== "Canceled") {
          Alert.alert("Payment error", presentError.message);
        }
        return;
      }

      // 4. Card saved — activate the subscription with trial on the backend
      const paymentMethodId = paymentOption?.label ?? "";
      await activateSubscription(customerId, paymentMethodId, selected as PlanId);

      // 5. Mark pro locally and move to confirmed screen
      await activatePro();
      onConfirm(selectedPlan);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      Alert.alert("Could not start subscription", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={onBack} disabled={loading}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textMuted} />
        </TouchableOpacity>

        <Text style={styles.plansTitle}>Choose your plan</Text>
        <Text style={styles.plansSubtitle}>Start free, cancel anytime.</Text>

        {PLANS.map((plan) => {
          const isSelected = selected === plan.id;
          return (
            <TouchableOpacity
              key={plan.id}
              style={[styles.planCard, isSelected && styles.planCardSelected]}
              onPress={() => setSelected(plan.id)}
              activeOpacity={0.85}
              disabled={loading}
            >
              {plan.badge && (
                <View style={[styles.planBadge, { backgroundColor: plan.badgeColor ?? COLORS.primary }]}>
                  <Text style={styles.planBadgeText}>{plan.badge}</Text>
                </View>
              )}
              <View style={styles.planCardInner}>
                <View style={styles.planCardLeft}>
                  <View style={[styles.planRadio, isSelected && styles.planRadioSelected]}>
                    {isSelected && <View style={styles.planRadioDot} />}
                  </View>
                  <View>
                    <Text style={[styles.planName, isSelected && styles.planNameSelected]}>
                      {plan.name}
                    </Text>
                    <Text style={styles.planFeatureList}>
                      {plan.features.slice(0, 2).join(" · ")}
                    </Text>
                  </View>
                </View>
                <View style={styles.planCardRight}>
                  <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
                    {plan.price}
                  </Text>
                  <Text style={styles.planPeriod}>{plan.period}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* CTA */}
        <TouchableOpacity
          onPress={handleSubscribe}
          activeOpacity={0.88}
          disabled={loading}
          style={[styles.ctaWrapper, { marginTop: 24 }]}
        >
          <LinearGradient
            colors={["#2563eb", "#38bdf8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaButton}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaButtonText}>
                {selected === "annual"
                  ? `GET ANNUAL — ${selectedPlan.price}/yr`
                  : `START 7-DAY FREE TRIAL`}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.finePrint}>
          {selected === "annual"
            ? `Billed as ${selectedPlan.price}/year. Cancel anytime.`
            : `Free for 7 days, then ${selectedPlan.price}/month. Cancel anytime before Day 7 and you won't be charged.`}
        </Text>
        {selected !== "annual" && (
          <Text style={styles.reminderText}>
            🔔 We'll remind you before your trial ends.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Screen 3 — Trial confirmed
// ---------------------------------------------------------------------------

function TrialConfirmedScreen({
  plan,
  onStartScanning,
}: {
  plan: Plan;
  onStartScanning: () => void;
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.confirmedContent}>
        {/* Celebration icon */}
        <Text style={styles.confirmedEmoji}>🎉</Text>
        <Text style={styles.confirmedTitle}>You're all set!</Text>
        <Text style={styles.confirmedSubtitle}>
          {plan.id === "annual"
            ? `Your annual plan is active. Enjoy unlimited scans.`
            : `Your 7-day free trial has started.\nNo charge until Day 7.`}
        </Text>

        {/* Timeline */}
        <View style={styles.timeline}>
          <View style={styles.timelineStep}>
            <View style={[styles.timelineDot, styles.timelineDotActive]} />
            <View style={styles.timelineStepText}>
              <Text style={styles.timelineLabel}>Today</Text>
              <Text style={styles.timelineDesc}>Trial starts · Full Pro access</Text>
            </View>
          </View>
          <View style={styles.timelineLine} />
          <View style={styles.timelineStep}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineStepText}>
              <Text style={styles.timelineLabel}>Day 7</Text>
              <Text style={styles.timelineDesc}>
                {plan.id === "annual" ? "Annual billing begins" : `${plan.price}/month begins`}
              </Text>
            </View>
          </View>
          <View style={styles.timelineLine} />
          <View style={styles.timelineStep}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineStepText}>
              <Text style={styles.timelineLabel}>Cancel anytime</Text>
              <Text style={styles.timelineDesc}>No questions asked</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={onStartScanning} activeOpacity={0.88} style={styles.ctaWrapper}>
          <LinearGradient
            colors={["#2563eb", "#38bdf8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaButton}
          >
            <Ionicons name="camera" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.ctaButtonText}>START SCANNING</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Root export — Paywall modal
// ---------------------------------------------------------------------------

export default function Paywall({
  visible,
  scansUsed = SCAN_LIMIT.free,
  daysUntilReset = 0,
  onClose,
  onProActivated,
}: PaywallProps) {
  const [screen, setScreen] = useState<PaywallScreen>("limit");
  const [confirmedPlan, setConfirmedPlan] = useState<Plan | null>(null);

  // activatePro() is already called inside PlanSelectionScreen after payment succeeds
  function handleConfirm(plan: Plan) {
    setConfirmedPlan(plan);
    setScreen("confirmed");
  }

  function handleStartScanning() {
    onProActivated();
  }

  function handleClose() {
    // Reset to first screen for next open
    setScreen("limit");
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.modalRoot}>
        {screen === "limit" && (
          <ScanLimitScreen
            scansUsed={scansUsed}
            daysUntilReset={daysUntilReset}
            onStartTrial={() => setScreen("plans")}
            onSeePlans={() => setScreen("plans")}
            onClose={handleClose}
          />
        )}
        {screen === "plans" && (
          <PlanSelectionScreen
            onBack={() => setScreen("limit")}
            onConfirm={handleConfirm}
          />
        )}
        {screen === "confirmed" && confirmedPlan && (
          <TrialConfirmedScreen
            plan={confirmedPlan}
            onStartScanning={handleStartScanning}
          />
        )}
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  modalRoot: { flex: 1, backgroundColor: "#060d1a" },
  screen: { flex: 1, backgroundColor: "#060d1a" },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },

  // Close / back
  closeBtn: {
    alignSelf: "flex-end",
    padding: 8,
    marginBottom: 12,
  },
  backBtn: {
    alignSelf: "flex-start",
    padding: 8,
    marginBottom: 12,
  },

  // ── Screen 1 ──────────────────────────────────────────
  limitIconWrapper: {
    alignSelf: "center",
    marginBottom: 8,
  },
  limitIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(239,68,68,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  limitIconEmoji: { fontSize: 38 },
  limitBadge: {
    position: "absolute",
    top: 0,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.error,
    alignItems: "center",
    justifyContent: "center",
  },
  limitBadgeText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  fitscanLabel: { alignSelf: "center", marginTop: 8, marginBottom: 16 },
  fitscanLabelText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 3,
  },

  limitTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    lineHeight: 34,
    marginBottom: 12,
  },
  limitSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },

  progressContainer: { marginBottom: 24 },
  progressTrack: {
    height: 8,
    backgroundColor: "#1e293b",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  progressLeft: { fontSize: 12, color: COLORS.textMuted },
  progressRight: { fontSize: 12, color: COLORS.textMuted },

  featuresCard: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  featuresCardLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  featureIcon: { fontSize: 18, width: 24, textAlign: "center" },
  featureText: { fontSize: 14, color: "#e2e8f0", fontWeight: "500", flex: 1 },

  // ── CTA shared ───────────────────────────────────────
  ctaWrapper: { borderRadius: 14, overflow: "hidden", marginBottom: 12 },
  ctaButton: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.8,
  },

  seePlansBtn: { alignItems: "center", paddingVertical: 10 },
  seePlansText: { fontSize: 14, fontWeight: "600", color: COLORS.primary },

  // ── Screen 2 ──────────────────────────────────────────
  plansTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 6,
    marginTop: 8,
  },
  plansSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 28,
  },

  planCard: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#1e293b",
    marginBottom: 12,
    overflow: "hidden",
  },
  planCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(56,189,248,0.05)",
  },
  planBadge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 16,
    marginTop: 12,
  },
  planBadgeText: { fontSize: 10, fontWeight: "800", color: "#020617", letterSpacing: 0.5 },
  planCardInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  planCardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#475569",
    alignItems: "center",
    justifyContent: "center",
  },
  planRadioSelected: { borderColor: COLORS.primary },
  planRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  planName: { fontSize: 16, fontWeight: "700", color: COLORS.textSecondary },
  planNameSelected: { color: "#fff" },
  planFeatureList: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  planCardRight: { alignItems: "flex-end" },
  planPrice: { fontSize: 20, fontWeight: "800", color: COLORS.textSecondary },
  planPriceSelected: { color: COLORS.primary },
  planPeriod: { fontSize: 11, color: COLORS.textMuted },

  reminderText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 10,
  },
  finePrint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 17,
    marginTop: 4,
  },

  // ── Screen 3 ──────────────────────────────────────────
  confirmedContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  confirmedEmoji: { fontSize: 56, marginBottom: 20 },
  confirmedTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 10,
  },
  confirmedSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 36,
  },

  timeline: { width: "100%", marginBottom: 40 },
  timelineStep: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#1e293b",
    borderWidth: 2,
    borderColor: "#334155",
    marginTop: 2,
  },
  timelineDotActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: "#1e293b",
    marginLeft: 6,
  },
  timelineStepText: { flex: 1 },
  timelineLabel: { fontSize: 14, fontWeight: "700", color: "#fff" },
  timelineDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
});
