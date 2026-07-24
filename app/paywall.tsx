// app/paywall.tsx
// Paywall modal — rebuilt on RevenueCat + Google Play Billing.
// Prices from RevenueCat offerings (single source of truth).
// All user-visible behavior gated behind MONETIZATION_ENABLED server flag.

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PurchasesPackage } from "react-native-purchases";
import { COLORS, SCAN_LIMIT } from "../lib/constants";
import { activatePro } from "../lib/scanLimit";
import {
  getCurrentOffering,
  purchasePackage,
  restorePurchases,
  isTrialEligible,
} from "../lib/purchases";
import { trackEvent } from "../lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PaywallEntryContext =
  | "scan_limit"
  | "voluntary"
  | "post_first_scan"
  | "multiscan_gate";

export type PaywallProps = {
  visible: boolean;
  scansUsed?: number;
  daysUntilReset?: number;
  entryContext?: PaywallEntryContext;
  quizSummary?: string;
  onClose: () => void;
  onProActivated: () => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getHeadline(context: PaywallEntryContext): string {
  switch (context) {
    case "scan_limit":
      return "You've used all 10\nfree scans this month";
    case "post_first_scan":
      return "Unlock unlimited\nscans";
    case "multiscan_gate":
      return "Combine machines\ninto one workout";
    default:
      return "Unlock unlimited\nscans";
  }
}

function getSubline(context: PaywallEntryContext): string {
  switch (context) {
    case "scan_limit":
      return "Upgrade to keep scanning, or wait for your free scans to reset.";
    case "post_first_scan":
      return "Your first scan is free. Go Pro for unlimited scans and custom workouts.";
    case "multiscan_gate":
      return "Combine multiple machines into one complete workout plan with Pro.";
    default:
      return "Unlimited scans. Custom workout plans.";
  }
}

const PRO_FEATURES = [
  { icon: "infinite-outline" as const, label: "Unlimited equipment scans" },
  { icon: "barbell-outline" as const, label: "Unlimited AI workouts" },
  { icon: "heart-outline" as const, label: "Support a solo developer" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Paywall({
  visible,
  scansUsed = SCAN_LIMIT.free,
  daysUntilReset = 0,
  entryContext = "voluntary",
  quizSummary,
  onClose,
  onProActivated,
}: PaywallProps) {
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [trialEligible, setTrialEligible] = useState(true);
  const [loadingOfferings, setLoadingOfferings] = useState(true);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    (async () => {
      setLoadingOfferings(true);
      try {
        const [offering, eligible] = await Promise.all([
          getCurrentOffering(),
          isTrialEligible(),
        ]);
        if (cancelled) return;

        if (offering?.availablePackages) {
          // Sort: annual first
          const sorted = [...offering.availablePackages].sort((a, b) => {
            if (a.packageType === "ANNUAL") return -1;
            if (b.packageType === "ANNUAL") return 1;
            return 0;
          });
          setPackages(sorted);
          setSelectedIdx(0); // Annual preselected
        }
        setTrialEligible(eligible);
      } catch {
        // Fail open — show paywall with no packages
      } finally {
        if (!cancelled) setLoadingOfferings(false);
      }

      trackEvent("paywall_viewed", undefined, { context: entryContext }).catch(() => {});
    })();

    return () => { cancelled = true; };
  }, [visible]);

  async function handlePurchase() {
    if (packages.length === 0) return;
    setLoading(true);
    try {
      const pkg = packages[selectedIdx];
      const success = await purchasePackage(pkg);
      if (success) {
        await activatePro();
        trackEvent(
          trialEligible ? "trial_started" : "subscription_activated",
          undefined,
          { plan: pkg.identifier }
        ).catch(() => {});
        onProActivated();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      Alert.alert("Could not complete purchase", msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        await activatePro();
        Alert.alert("Restored!", "Your Pro subscription has been restored.");
        onProActivated();
      } else {
        Alert.alert("No purchases found", "We couldn't find any previous purchases.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Please check your connection and try again.";
      Alert.alert("Restore failed", msg);
    } finally {
      setRestoring(false);
    }
  }

  function handleDismiss() {
    trackEvent("paywall_dismissed_to_free", undefined, { context: entryContext }).catch(() => {});
    onClose();
  }

  if (!visible) return null;

  // Format price from RevenueCat package
  function formatPrice(pkg: PurchasesPackage): string {
    return pkg.product.priceString || pkg.product.price.toString();
  }

  function formatPeriod(pkg: PurchasesPackage): string {
    if (pkg.packageType === "ANNUAL") return "/ year";
    return "/ month";
  }

  function getMonthlyEquiv(pkg: PurchasesPackage): string | null {
    if (pkg.packageType !== "ANNUAL") return null;
    const monthly = pkg.product.price / 12;
    return `$${monthly.toFixed(2)}`;
  }

  function getCtaText(): string {
    if (trialEligible) return "START 7-DAY FREE TRIAL";
    if (packages[selectedIdx]?.packageType === "ANNUAL") return "GET ANNUAL PRO";
    return "GET PRO";
  }

  function getSubLineText(): string {
    const pkg = packages[selectedIdx];
    if (!pkg) return "";
    const price = formatPrice(pkg);
    const period = pkg.packageType === "ANNUAL" ? "year" : "month";
    const monthlyNote = pkg.packageType === "ANNUAL" ? ` (${getMonthlyEquiv(pkg)}/mo)` : "";
    if (trialEligible) {
      return `7 days free, then ${price}/${period}${monthlyNote}. Cancel anytime.`;
    }
    return `${price}/${period}${monthlyNote}. Cancel anytime.`;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleDismiss}
    >
      <View style={styles.modalRoot}>
        <SafeAreaView style={styles.screen}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Close */}
            <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>

            {/* Logo */}
            <View style={styles.logoRow}>
              <Text style={styles.logoLabel}>FITSCAN</Text>
              <Text style={styles.logoSlogan}>FITNESS MADE SIMPLE</Text>
            </View>

            {/* Headline */}
            <Text style={styles.headline}>{getHeadline(entryContext)}</Text>
            <Text style={styles.subheadline}>{getSubline(entryContext)}</Text>

            {/* Quiz personalization line */}
            {quizSummary && entryContext === "post_first_scan" && (
              <View style={styles.quizLine}>
                <Ionicons name="sparkles" size={16} color={COLORS.primary} />
                <Text style={styles.quizLineText}>{quizSummary}</Text>
              </View>
            )}

            {/* Scan progress — only on scan_limit context */}
            {entryContext === "scan_limit" && (
              <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: "100%" }]} />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLeft}>
                    {scansUsed} / {SCAN_LIMIT.free} scans used
                  </Text>
                  <Text style={styles.progressRight}>
                    Resets in {daysUntilReset} days
                  </Text>
                </View>
              </View>
            )}

            {/* Features */}
            <View style={styles.featuresCard}>
              <Text style={styles.featuresLabel}>WITH PRO YOU GET</Text>
              {PRO_FEATURES.map((f) => (
                <View key={f.label} style={styles.featureRow}>
                  <Ionicons name={f.icon} size={20} color={COLORS.primary} />
                  <Text style={styles.featureText}>{f.label}</Text>
                </View>
              ))}
            </View>

            {/* Plan cards */}
            {loadingOfferings ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
            ) : (
              packages.map((pkg, idx) => {
                const isSelected = idx === selectedIdx;
                const isAnnual = pkg.packageType === "ANNUAL";
                const monthlyEquiv = getMonthlyEquiv(pkg);
                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[styles.planCard, isSelected && styles.planCardSelected]}
                    onPress={() => setSelectedIdx(idx)}
                    activeOpacity={0.85}
                    disabled={loading}
                  >
                    {isAnnual && !trialEligible && (
                      <View style={styles.planBadge}>
                        <Text style={styles.planBadgeText}>BEST VALUE {"\u00B7"} SAVE 33%</Text>
                      </View>
                    )}
                    {trialEligible && !isAnnual && (
                      <View style={[styles.planBadge, { backgroundColor: COLORS.primary }]}>
                        <Text style={styles.planBadgeText}>7-DAY FREE TRIAL</Text>
                      </View>
                    )}
                    {trialEligible && isAnnual && (
                      <View style={[styles.planBadge, { backgroundColor: "#22c55e" }]}>
                        <Text style={styles.planBadgeText}>BEST VALUE {"\u00B7"} 7-DAY FREE TRIAL</Text>
                      </View>
                    )}
                    <View style={styles.planCardInner}>
                      <View style={styles.planCardLeft}>
                        <View style={[styles.planRadio, isSelected && styles.planRadioSelected]}>
                          {isSelected && <View style={styles.planRadioDot} />}
                        </View>
                        <View>
                          <Text style={[styles.planName, isSelected && styles.planNameSelected]}>
                            {isAnnual ? "Annual Pro" : "Pro"}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.planCardRight}>
                        <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
                          {monthlyEquiv ?? formatPrice(pkg)}
                        </Text>
                        <Text style={styles.planPeriod}>
                          {monthlyEquiv ? "/ month" : formatPeriod(pkg)}
                        </Text>
                        {monthlyEquiv && (
                          <Text style={styles.planBilledAs}>
                            billed {formatPrice(pkg)}/yr
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {/* CTA */}
            <TouchableOpacity
              onPress={handlePurchase}
              activeOpacity={0.88}
              disabled={loading || packages.length === 0}
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
                  <Text style={styles.ctaButtonText}>{getCtaText()}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.finePrint}>{getSubLineText()}</Text>

            {/* Dismiss link — always visible */}
            <TouchableOpacity onPress={handleDismiss} style={styles.dismissBtn}>
              <Text style={styles.dismissText}>
                Continue with free ({SCAN_LIMIT.free} scans/month)
              </Text>
            </TouchableOpacity>

            {/* Restore purchases */}
            <TouchableOpacity
              onPress={handleRestore}
              disabled={restoring}
              style={styles.restoreBtn}
            >
              <Text style={styles.restoreText}>
                {restoring ? "Restoring..." : "Restore purchases"}
              </Text>
            </TouchableOpacity>

            {/* Terms + Privacy */}
            <View style={styles.legalRow}>
              <TouchableOpacity onPress={() => Linking.openURL("https://fitscanfitness.com/terms")}>
                <Text style={styles.legalText}>Terms</Text>
              </TouchableOpacity>
              <Text style={styles.legalDot}>{"\u00B7"}</Text>
              <TouchableOpacity onPress={() => Linking.openURL("https://fitscanfitness.com/privacy")}>
                <Text style={styles.legalText}>Privacy</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
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

  closeBtn: {
    alignSelf: "flex-end",
    padding: 8,
    marginBottom: 12,
  },

  logoRow: { alignSelf: "center", marginBottom: 20 },
  logoLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 3,
    textAlign: "center",
  },
  logoSlogan: {
    fontSize: 9,
    fontWeight: "600",
    color: COLORS.primary,
    letterSpacing: 2.5,
    textAlign: "center",
    marginTop: 2,
    opacity: 0.8,
  },

  headline: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    lineHeight: 34,
    marginBottom: 12,
  },
  subheadline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },

  quizLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(56,189,248,0.08)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    alignSelf: "center",
  },
  quizLineText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "600",
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
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  featuresLabel: {
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
  featureText: { fontSize: 14, color: "#e2e8f0", fontWeight: "500", flex: 1 },

  // Plan cards
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
    backgroundColor: "#22c55e",
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#020617",
    letterSpacing: 0.5,
  },
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
  planCardRight: { alignItems: "flex-end" },
  planPrice: { fontSize: 20, fontWeight: "800", color: COLORS.textSecondary },
  planPriceSelected: { color: COLORS.primary },
  planPeriod: { fontSize: 11, color: COLORS.textMuted },
  planBilledAs: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },

  // CTA
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

  finePrint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 16,
  },

  dismissBtn: {
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 8,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
    textDecorationLine: "underline",
  },

  restoreBtn: {
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 8,
  },
  restoreText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },

  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  legalText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textDecorationLine: "underline",
  },
  legalDot: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
