// app/equipment-scanner.tsx
import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  recognizeEquipment,
  generateWorkout,
  withRetry,
  ApiError,
  type RecognitionResponse,
  type ScannedItem,
  type WorkoutPlan,
  type WorkoutExercise,
  type Exercise,
} from "../lib/api";
import { COLORS, IMAGE_CONFIG, SCAN_LIMIT } from "../lib/constants";
import { saveWorkoutToHistory } from "../lib/workoutHistory";
import { consumeScan, getSubscriptionStatus } from "../lib/scanLimit";
import Paywall from "./paywall";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function confidenceColor(c: string) {
  if (c === "high") return COLORS.success;
  if (c === "medium") return COLORS.warning;
  return COLORS.error;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ExerciseCard({ ex }: { ex: Exercise | WorkoutExercise }) {
  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseCardHeader}>
        <Text style={styles.exerciseName}>{ex.name}</Text>
        {ex.intensity ? (
          <Text
            style={[
              styles.exerciseTag,
              {
                color:
                  ex.intensity === "Beginner"
                    ? COLORS.success
                    : ex.intensity === "Advanced"
                    ? COLORS.error
                    : COLORS.warning,
              },
            ]}
          >
            {ex.intensity}
          </Text>
        ) : null}
      </View>
      {"equipment" in ex && ex.equipment ? (
        <Text style={styles.exerciseEquipmentLabel}>{ex.equipment}</Text>
      ) : null}
      {ex.description ? (
        <Text style={styles.exerciseDescription}>{ex.description}</Text>
      ) : null}
      <View style={styles.exerciseMetaRow}>
        {ex.muscleGroups?.length > 0 && (
          <Text style={styles.exerciseMeta}>{ex.muscleGroups.join(" · ")}</Text>
        )}
        {(ex.sets || ex.reps) && (
          <Text style={styles.exerciseMeta}>
            {ex.sets ? `${ex.sets} sets` : ""}
            {ex.sets && ex.reps ? " × " : ""}
            {ex.reps ? `${ex.reps} reps` : ""}
          </Text>
        )}
        {"rest_seconds" in ex && ex.rest_seconds ? (
          <Text style={styles.exerciseMeta}>{ex.rest_seconds}s rest</Text>
        ) : null}
      </View>
    </View>
  );
}

function ScannedItemBadge({
  item,
  onRemove,
}: {
  item: ScannedItem;
  onRemove: () => void;
}) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText} numberOfLines={1}>
        {item.equipment_type}
      </Text>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Ionicons name="close-circle" size={16} color="#9ca3af" />
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const LOADING_STEPS = [
  "Capturing photo…",
  "Sending to AI…",
  "Analysing equipment…",
  "Building exercises…",
];

const SLOW_CONNECTION_THRESHOLD_MS = 8_000;

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

type ScreenView = "camera" | "single-result" | "full-workout";

export default function EquipmentScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  // Scan queue
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);

  // Per-scan state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showSlowHint, setShowSlowHint] = useState(false);
  const [currentResult, setCurrentResult] = useState<RecognitionResponse | null>(null);
  const [currentPhotoUri, setCurrentPhotoUri] = useState<string | null>(null);

  // Full workout state
  const [isGenerating, setIsGenerating] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);

  const [view, setView] = useState<ScreenView>("camera");

  // Paywall
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallScansUsed, setPaywallScansUsed] = useState<number>(SCAN_LIMIT.free);
  const [paywallDaysUntilReset, setPaywallDaysUntilReset] = useState<number>(0);

  // Animated values
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const slowHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // -------------------------------------------------------------------------
  // Animation effect — start / stop when isAnalyzing changes
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (isAnalyzing) {
      // Reset state
      setLoadingStep(0);
      setShowSlowHint(false);

      // Cycle through loading messages
      stepTimer.current = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 1_200);

      // Slow-connection hint after threshold
      slowHintTimer.current = setTimeout(() => {
        setShowSlowHint(true);
      }, SLOW_CONNECTION_THRESHOLD_MS);

      // Pulse animation on scan frame border
      pulseAnim.setValue(0);
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
        ])
      );
      pulseLoop.current.start();
    } else {
      // Cleanup
      if (stepTimer.current) clearInterval(stepTimer.current);
      if (slowHintTimer.current) clearTimeout(slowHintTimer.current);
      if (pulseLoop.current) pulseLoop.current.stop();
      pulseAnim.setValue(0);
      setLoadingStep(0);
      setShowSlowHint(false);
    }

    return () => {
      if (stepTimer.current) clearInterval(stepTimer.current);
      if (slowHintTimer.current) clearTimeout(slowHintTimer.current);
      if (pulseLoop.current) pulseLoop.current.stop();
    };
  }, [isAnalyzing]);

  // Interpolated border color for scan frame pulse
  const borderColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.5)", COLORS.primary],
  });

  // -------------------------------------------------------------------------
  // Permissions
  // -------------------------------------------------------------------------
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} />
        <Text style={styles.helperText}>Checking camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <View style={styles.permissionIconCircle}>
          <Ionicons name="camera-outline" size={40} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Camera access required</Text>
        <Text style={styles.helperText}>
          FitScan uses your camera <Text style={styles.helperBold}>only</Text> to photograph gym
          equipment. The photo is sent to our AI to identify the equipment and
          suggest a personalised workout — it is never stored or shared.
        </Text>
        <View style={styles.permissionBullets}>
          <View style={styles.permissionBulletRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.success} />
            <Text style={styles.permissionBulletText}>Photos are used only for equipment detection</Text>
          </View>
          <View style={styles.permissionBulletRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.success} />
            <Text style={styles.permissionBulletText}>No images are saved to your camera roll</Text>
          </View>
          <View style={styles.permissionBulletRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.success} />
            <Text style={styles.permissionBulletText}>No facial recognition or personal data collected</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Ionicons name="camera-outline" size={18} color="#020617" />
          <Text style={styles.permissionButtonText}>Allow camera access</Text>
        </TouchableOpacity>
        <Text style={styles.permissionFooter}>
          You can revoke this permission at any time in your device Settings.
        </Text>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleCaptureAndAnalyze = async () => {
    if (!cameraRef.current || isAnalyzing) return;

    // Check scan limit before taking the photo
    const status = await getSubscriptionStatus();
    if (!status.isPro && status.scansUsed >= SCAN_LIMIT.free) {
      setPaywallScansUsed(status.scansUsed);
      setPaywallDaysUntilReset(status.daysUntilReset);
      setShowPaywall(true);
      return;
    }

    // Consume one scan (increments counter)
    const { allowed, scansUsed: consumedScansUsed } = await consumeScan();
    if (!allowed) {
      setPaywallScansUsed(consumedScansUsed);
      setPaywallDaysUntilReset(status.daysUntilReset);
      setShowPaywall(true);
      return;
    }

    try {
      setIsAnalyzing(true);

      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: IMAGE_CONFIG.quality,
        skipProcessing: true,
      });

      if (!photo?.base64) throw new Error("Could not read image data from camera.");

      setCurrentPhotoUri(photo.uri ?? null);

      const result = await withRetry(() =>
        recognizeEquipment({ image_base64: photo.base64 })
      );

      setCurrentResult(result);
      setView("single-result");
    } catch (err) {
      let msg = "Network error. Check your internet connection and ensure the backend is running.";
      if (err instanceof ApiError) {
        msg =
          err.statusCode === 408
            ? "Request timed out. Please try again."
            : err.statusCode === 0
            ? "Cannot connect to backend. Please ensure it's running."
            : err.message;
      }
      Alert.alert("Scan failed", msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddToQueue = () => {
    if (!currentResult) return;
    const item: ScannedItem = {
      id: makeId(),
      equipment_type: currentResult.equipment_type,
      exercises: currentResult.exercises || [],
      photoUri: currentPhotoUri ?? undefined,
      confidence: currentResult.confidence,
    };
    setScannedItems((prev) => [...prev, item]);
    setCurrentResult(null);
    setCurrentPhotoUri(null);
    setView("camera");
  };

  const handleRemoveFromQueue = (id: string) => {
    setScannedItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleBuildWorkout = async () => {
    const items =
      view === "single-result" && currentResult
        ? [
            ...scannedItems,
            {
              id: makeId(),
              equipment_type: currentResult.equipment_type,
              exercises: currentResult.exercises || [],
              confidence: currentResult.confidence,
            } as ScannedItem,
          ]
        : scannedItems;

    if (items.length === 0) return;

    const equipment_types = items.map((i) => i.equipment_type);

    try {
      setIsGenerating(true);
      const plan = await generateWorkout({ equipment_types });
      setWorkoutPlan(plan);
      // Persist to history (fire-and-forget)
      saveWorkoutToHistory(plan).catch(() => {});
      setView("full-workout");
    } catch (err) {
      let msg = "Could not generate workout. Please try again.";
      if (err instanceof ApiError) msg = err.message;
      Alert.alert("Workout generation failed", msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setScannedItems([]);
    setCurrentResult(null);
    setCurrentPhotoUri(null);
    setWorkoutPlan(null);
    setView("camera");
  };

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------
  const renderSingleResultSheet = () => {
    if (view !== "single-result" || !currentResult) return null;

    const isUnknown =
      !currentResult.equipment_type ||
      currentResult.equipment_type.toLowerCase() === "unknown" ||
      currentResult.equipment_type.toLowerCase() === "unknown equipment";

    const exercises = currentResult.exercises || currentResult.recommended_exercises || [];
    const confidenceLabel =
      typeof currentResult.confidence === "number"
        ? `${Math.round(currentResult.confidence * 100)}%`
        : currentResult.confidence || "unknown";

    return (
      <Modal visible animationType="slide" transparent onRequestClose={() => setView("camera")}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            {/* Equipment header */}
            <View style={styles.sheetHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>
                  {isUnknown ? "Not identified" : currentResult.equipment_type}
                </Text>
                {!isUnknown && (
                  <Text style={[styles.sheetSubtitle, { color: confidenceColor(currentResult.confidence) }]}>
                    Confidence: {confidenceLabel}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setView("camera")} style={styles.sheetCloseBtn}>
                <Ionicons name="close" size={22} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Unknown equipment — friendly message + retry */}
            {isUnknown ? (
              <View style={styles.unknownBox}>
                <Ionicons name="help-circle-outline" size={36} color="#9ca3af" style={{ marginBottom: 10 }} />
                <Text style={styles.unknownTitle}>Couldn't identify gym equipment</Text>
                <Text style={styles.unknownBody}>
                  Try pointing the camera directly at a specific piece of gym equipment — like a dumbbell rack, barbell, cable machine, or treadmill — and ensure it's well lit.
                </Text>
                <TouchableOpacity
                  style={[styles.primaryButton, { marginTop: 16 }]}
                  onPress={() => setView("camera")}
                >
                  <Ionicons name="refresh-outline" size={18} color="#000" />
                  <Text style={styles.primaryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {currentResult.note ? (
                  <Text style={styles.noteText}>{currentResult.note}</Text>
                ) : null}

                {/* Exercises */}
                <Text style={styles.sectionTitle}>
                  {exercises.length} exercises available
                </Text>
                <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
                  {exercises.map((ex, idx) => (
                    <ExerciseCard key={idx} ex={ex} />
                  ))}
                </ScrollView>

                {/* Action buttons */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { flex: 1, marginRight: 8 }]}
                    onPress={handleAddToQueue}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.secondaryButtonText}>Add & Scan More</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryButton, { flex: 1 }]}
                    onPress={handleBuildWorkout}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <>
                        <Ionicons name="barbell-outline" size={18} color="#000" />
                        <Text style={styles.primaryButtonText}>
                          {scannedItems.length > 0
                            ? `Build Workout (${scannedItems.length + 1})`
                            : "Use This Workout"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const renderFullWorkoutSheet = () => {
    if (view !== "full-workout" || !workoutPlan) return null;

    return (
      <Modal visible animationType="slide" transparent={false} onRequestClose={handleReset}>
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
          <View style={[styles.sheet, { flex: 1, maxHeight: "100%", borderRadius: 0, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{workoutPlan.workout_title}</Text>
                <Text style={styles.sheetSubtitle}>
                  ~{workoutPlan.estimated_duration_minutes} min ·{" "}
                  {workoutPlan.exercises.length} exercises
                </Text>
              </View>
              <TouchableOpacity onPress={handleReset} style={styles.sheetCloseBtn}>
                <Ionicons name="close" size={22} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {workoutPlan.workout_description ? (
              <Text style={styles.workoutDesc}>{workoutPlan.workout_description}</Text>
            ) : null}

            {/* Equipment tags */}
            <View style={styles.equipmentTagRow}>
              {workoutPlan.equipment_used.map((e, i) => (
                <View key={i} style={styles.equipmentTag}>
                  <Text style={styles.equipmentTagText}>{e}</Text>
                </View>
              ))}
            </View>

            {workoutPlan.note ? (
              <Text style={styles.noteText}>{workoutPlan.note}</Text>
            ) : null}

            <Text style={styles.sectionTitle}>Exercises</Text>
            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
              {workoutPlan.exercises.map((ex, idx) => (
                <View key={idx}>
                  <View style={styles.exerciseNumber}>
                    <Text style={styles.exerciseNumberText}>{idx + 1}</Text>
                  </View>
                  <ExerciseCard ex={ex} />
                </View>
              ))}
              <View style={{ height: 24 }} />
            </ScrollView>

            <TouchableOpacity style={styles.primaryButton} onPress={handleReset}>
              <Ionicons name="scan-outline" size={18} color="#000" />
              <Text style={styles.primaryButtonText}>Scan New Equipment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };



  // -------------------------------------------------------------------------
  // Main camera view
  // -------------------------------------------------------------------------
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.push("/")}>
          <Ionicons name="chevron-back" size={24} color="#e5e7eb" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Equipment scanner</Text>
        {/* Queue count badge */}
        <View style={styles.queueBadgeContainer}>
          {scannedItems.length > 0 ? (
            <View style={styles.queueBadge}>
              <Text style={styles.queueBadgeText}>{scannedItems.length}</Text>
            </View>
          ) : (
            <View style={{ width: 28 }} />
          )}
        </View>
      </View>

      {/* Scanned equipment queue (visible when items queued) */}
      {scannedItems.length > 0 && (
        <View style={styles.queueBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: "center" }}>
            {scannedItems.map((item) => (
              <ScannedItemBadge
                key={item.id}
                item={item}
                onRemove={() => handleRemoveFromQueue(item.id)}
              />
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.buildButton}
            onPress={handleBuildWorkout}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.buildButtonText}>
                Build Workout ({scannedItems.length})
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Camera */}
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" ratio="16:9">
          <View style={styles.cameraOverlay}>
            <Animated.View style={[styles.scanFrame, { borderColor }]} />
            {isAnalyzing && (
              <View style={styles.scanLabelRow}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.scanLabelText}>{LOADING_STEPS[loadingStep]}</Text>
              </View>
            )}
          </View>
        </CameraView>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.captureButton, isAnalyzing && styles.captureButtonDisabled]}
          onPress={handleCaptureAndAnalyze}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <ActivityIndicator color="#000" />
              <Text style={styles.captureButtonText}>{LOADING_STEPS[loadingStep]}</Text>
            </>
          ) : (
            <>
              <Ionicons name="scan-outline" size={22} color="#000" />
              <Text style={styles.captureButtonText}>Analyze equipment</Text>
            </>
          )}
        </TouchableOpacity>

        {showSlowHint && (
          <Text style={styles.slowHintText}>
            Taking longer than usual — check your connection.
          </Text>
        )}

        <Text style={styles.tipText}>
          {isAnalyzing
            ? ""
            : scannedItems.length === 0
            ? "Scan one piece of equipment, then add more to build a full workout."
            : `${scannedItems.length} piece${scannedItems.length > 1 ? "s" : ""} queued — scan more or tap Build Workout.`}
        </Text>
      </View>

      {/* Modals */}
      {renderSingleResultSheet()}
      {renderFullWorkoutSheet()}

      <Paywall
        visible={showPaywall}
        scansUsed={paywallScansUsed}
        daysUntilReset={paywallDaysUntilReset}
        onClose={() => setShowPaywall(false)}
        onProActivated={() => {
          setShowPaywall(false);
          // Trigger scan immediately after upgrade
          handleCaptureAndAnalyze();
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  helperText: { fontSize: 14, color: "#9ca3af", textAlign: "center", marginTop: 4 },
  title: { fontSize: 20, fontWeight: "700", color: "#ffffff", textAlign: "center" },
  permissionIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  helperBold: { fontWeight: "700", color: "#e2e8f0" },
  permissionBullets: { alignSelf: "stretch", marginTop: 12, marginBottom: 4, gap: 8 },
  permissionBulletRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  permissionBulletText: { fontSize: 13, color: "#9ca3af", flex: 1 },
  permissionFooter: { fontSize: 11, color: "#4b5563", textAlign: "center", marginTop: 10 },
  permissionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  permissionButtonText: { color: "#020617", fontSize: 15, fontWeight: "700" },

  // Header
  header: {
    paddingBottom: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#f9fafb" },
  queueBadgeContainer: { width: 28, alignItems: "center" },
  queueBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  queueBadgeText: { color: "#020617", fontSize: 12, fontWeight: "700" },

  // Queue bar
  queueBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#0f172a",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1e293b",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    gap: 5,
    maxWidth: 140,
  },
  badgeText: { color: "#e2e8f0", fontSize: 12, fontWeight: "600", flexShrink: 1 },
  buildButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  buildButtonText: { color: "#020617", fontSize: 13, fontWeight: "700" },

  // Camera
  cameraContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 24,
    overflow: "hidden",
  },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  scanFrame: {
    width: "70%",
    height: "45%",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.7)",
    backgroundColor: "rgba(0,0,0,0.1)",
  },

  // Controls
  controls: { paddingHorizontal: 20, paddingBottom: 28 },
  captureButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    gap: 8,
  },
  captureButtonDisabled: { opacity: 0.6 },
  captureButtonText: { fontSize: 16, fontWeight: "600", color: "#000000" },
  tipText: { marginTop: 10, fontSize: 12, color: "#9ca3af", textAlign: "center" },
  slowHintText: { marginTop: 8, fontSize: 12, color: "#fbbf24", textAlign: "center" },
  scanLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(2,8,23,0.75)",
  },
  scanLabelText: { fontSize: 13, color: "#e2e8f0", fontWeight: "600" },

  // Shared sheet styles
  sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    backgroundColor: "#020617",
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#4b5563",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeaderRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  sheetTitle: { fontSize: 20, fontWeight: "700", color: "#ffffff" },
  sheetSubtitle: { marginTop: 2, fontSize: 13, color: "#9ca3af" },
  sheetCloseBtn: { padding: 4, marginLeft: 8 },
  noteText: { fontSize: 13, color: "#fbbf24", marginVertical: 6 },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: "#9ca3af", marginTop: 12, marginBottom: 6 },
  scrollArea: { flexGrow: 0, maxHeight: 380 },

  // Exercise card
  exerciseCard: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#111827",
  },
  exerciseCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  exerciseName: { fontSize: 15, fontWeight: "600", color: "#ffffff", flex: 1, marginRight: 8 },
  exerciseEquipmentLabel: { fontSize: 11, color: COLORS.primary, marginTop: 1, marginBottom: 2 },
  exerciseDescription: { fontSize: 13, color: "#9ca3af", marginTop: 2 },
  exerciseMetaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 4, gap: 8 },
  exerciseMeta: { fontSize: 12, color: "#64748b" },
  exerciseTag: { fontSize: 12, fontWeight: "600" },

  // Full workout extras
  workoutDesc: { fontSize: 14, color: "#9ca3af", marginBottom: 8 },
  equipmentTagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  equipmentTag: { backgroundColor: "#1e293b", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  equipmentTagText: { color: COLORS.primary, fontSize: 12, fontWeight: "600" },
  exerciseNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: -4,
  },
  exerciseNumberText: { color: "#9ca3af", fontSize: 11, fontWeight: "700" },

  // Action buttons
  buttonRow: { flexDirection: "row", marginTop: 12, gap: 8 },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    gap: 6,
    marginTop: 12,
  },
  primaryButtonText: { color: "#020617", fontSize: 15, fontWeight: "700" },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: "#1e293b",
    gap: 6,
  },
  secondaryButtonText: { color: COLORS.primary, fontSize: 14, fontWeight: "600" },

  // Unknown equipment state
  unknownBox: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  unknownTitle: { fontSize: 17, fontWeight: "700", color: "#ffffff", textAlign: "center", marginBottom: 10 },
  unknownBody: { fontSize: 13, color: "#9ca3af", textAlign: "center", lineHeight: 20 },
});
