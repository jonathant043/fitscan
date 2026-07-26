// app/equipment-scanner.tsx
import React, { useRef, useState, useEffect, useCallback } from "react";
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
  Image,
  TextInput,
  AppState,
} from "react-native";
import { GestureHandlerRootView, ScrollView as GHScrollView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused, useFocusEffect } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

import {
  recognizeEquipment,
  generateWorkout,
  withRetry,
  trackEvent,
  ApiError,
  type RecognitionResponse,
  type ScannedItem,
  type WorkoutPlan,
  type WorkoutExercise,
  type Exercise,
} from "../lib/api";
import { COLORS, IMAGE_CONFIG, SCAN_LIMIT, STORAGE_KEYS } from "../lib/constants";
import { saveWorkoutToHistory, getLastSetLogs, type SetLog } from "../lib/workoutHistory";
import { consumeScan, getSubscriptionStatus } from "../lib/scanLimit";
import { loadProfile, type UserProfile } from "../lib/profileStorage";
import { getWeightUnit, setWeightUnit, toDisplay, toLbs, type WeightUnit } from "../lib/weightUnit";
import { checkProEntitlement } from "../lib/purchases";
import { scheduleRestTimerNotification, cancelRestTimerNotification, vibrateOnTimerComplete } from "../lib/restTimer";
import { isMonetizationEnabled } from "../lib/monetization";
import Paywall from "./paywall";
import { schedulePostWorkoutNotifications } from "../lib/notifications";
import * as StoreReview from "expo-store-review";

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

/** Read-only ExerciseCard — used in single-result sheet */
function ExerciseCard({ ex }: { ex: Exercise | WorkoutExercise }) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => setExpanded((prev) => !prev);

  const intensityColor =
    ex.intensity === "Beginner"
      ? COLORS.success
      : ex.intensity === "Advanced"
      ? COLORS.error
      : COLORS.warning;

  return (
    <TouchableOpacity
      onPress={handleToggle}
      activeOpacity={0.75}
      style={styles.exerciseCard}
    >
      <View style={styles.exerciseCardHeader}>
        <Text style={styles.exerciseName}>{ex.name}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {ex.intensity ? (
            <Text style={[styles.exerciseTag, { color: intensityColor }]}>
              {ex.intensity}
            </Text>
          ) : null}
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={14}
            color="#4b5563"
          />
        </View>
      </View>

      {"equipment" in ex && ex.equipment ? (
        <Text style={styles.exerciseEquipmentLabel}>{ex.equipment}</Text>
      ) : null}

      {!expanded && (
        <View style={styles.exerciseMetaRow}>
          {ex.muscleGroups?.length > 0 && (
            <Text style={styles.exerciseMeta}>
              {ex.muscleGroups.join(" · ")}
            </Text>
          )}
          {(ex.sets || ex.reps) && (
            <Text style={styles.exerciseMeta}>
              {ex.sets ? `${ex.sets} sets` : ""}
              {ex.sets && ex.reps ? " × " : ""}
              {ex.reps ? `${ex.reps} reps` : ""}
            </Text>
          )}
        </View>
      )}

      {expanded && (
        <>
          {ex.description ? (
            <Text style={styles.exerciseDescription}>{ex.description}</Text>
          ) : null}
          <View style={styles.exerciseMetaRow}>
            {ex.muscleGroups?.length > 0 && (
              <Text style={styles.exerciseMeta}>
                {ex.muscleGroups.join(" · ")}
              </Text>
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
        </>
      )}
    </TouchableOpacity>
  );
}

/** Interactive ExerciseCard — used in full-workout view for per-set logging */
function WorkoutExerciseCard({
  ex,
  exerciseIndex,
  setLogs,
  lastTimeLogs,
  weightUnit,
  onSetLogChange,
  onStartRest,
}: {
  ex: WorkoutExercise;
  exerciseIndex: number;
  setLogs: SetLog[];
  lastTimeLogs: SetLog[] | undefined;
  weightUnit: WeightUnit;
  onSetLogChange: (exerciseIndex: number, setNumber: number, field: 'weightLbs' | 'reps', value: number) => void;
  onStartRest: (seconds: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const numSets = parseInt(ex.sets, 10) || 3;
  const suggestedReps = parseInt(ex.reps, 10) || 10;

  return (
    <View style={styles.exerciseCard}>
      <TouchableOpacity onPress={() => setExpanded((p) => !p)} activeOpacity={0.75}>
        <View style={styles.exerciseCardHeader}>
          <Text style={styles.exerciseName}>{ex.name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {ex.equipment ? (
              <Text style={[styles.exerciseTag, { color: COLORS.primary }]}>
                {ex.equipment}
              </Text>
            ) : null}
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={14}
              color="#4b5563"
            />
          </View>
        </View>
        <View style={styles.exerciseMetaRow}>
          <Text style={styles.exerciseMeta}>
            {ex.sets} sets × {ex.reps} reps
          </Text>
          {ex.rest_seconds ? (
            <Text style={styles.exerciseMeta}>{ex.rest_seconds}s rest</Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ marginTop: 8 }}>
          {/* Last time banner */}
          {lastTimeLogs && lastTimeLogs.length > 0 && (
            <View style={styles.lastTimeBanner}>
              <Ionicons name="time-outline" size={12} color="#64748b" />
              <Text style={styles.lastTimeText}>
                Last: {lastTimeLogs.map((l) =>
                  `${toDisplay(l.weightLbs, weightUnit)}${weightUnit} × ${l.reps}`
                ).join(', ')}
              </Text>
            </View>
          )}

          {/* Set header */}
          <View style={styles.setHeaderRow}>
            <Text style={[styles.setHeaderLabel, { flex: 0.5 }]}>Set</Text>
            <Text style={[styles.setHeaderLabel, { flex: 1 }]}>Weight ({weightUnit})</Text>
            <Text style={[styles.setHeaderLabel, { flex: 1 }]}>Reps</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Set rows */}
          {Array.from({ length: numSets }, (_, i) => {
            const log = setLogs.find((l) => l.setNumber === i + 1);
            const lastLog = lastTimeLogs?.[i];
            const displayWeight = log ? toDisplay(log.weightLbs, weightUnit) : undefined;
            const placeholderWeight = lastLog ? String(toDisplay(lastLog.weightLbs, weightUnit)) : '0';
            const placeholderReps = lastLog ? String(lastLog.reps) : String(suggestedReps);

            return (
              <View key={i} style={styles.setRow}>
                <Text style={[styles.setNumberLabel, { flex: 0.5 }]}>{i + 1}</Text>
                <TextInput
                  style={[styles.setInput, { flex: 1 }]}
                  keyboardType="numeric"
                  placeholder={placeholderWeight}
                  placeholderTextColor="#4b5563"
                  value={displayWeight !== undefined ? String(displayWeight) : ''}
                  onChangeText={(t) => {
                    const v = parseFloat(t) || 0;
                    onSetLogChange(exerciseIndex, i + 1, 'weightLbs', toLbs(v, weightUnit));
                  }}
                />
                <TextInput
                  style={[styles.setInput, { flex: 1 }]}
                  keyboardType="numeric"
                  placeholder={placeholderReps}
                  placeholderTextColor="#4b5563"
                  value={log?.reps ? String(log.reps) : ''}
                  onChangeText={(t) => {
                    const v = parseInt(t, 10) || 0;
                    onSetLogChange(exerciseIndex, i + 1, 'reps', v);
                  }}
                />
                {/* Rest button — shown after logging a set */}
                {log && ex.rest_seconds && i < numSets - 1 ? (
                  <TouchableOpacity
                    style={styles.restBtn}
                    onPress={() => onStartRest(ex.rest_seconds)}
                  >
                    <Ionicons name="timer-outline" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 36 }} />
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** Rest timer overlay shown between sets */
function RestTimerOverlay({
  seconds,
  onSkip,
}: {
  seconds: number;
  onSkip: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const startTimeRef = useRef(Date.now());
  const totalSeconds = useRef(seconds);

  // Handle app backgrounding — recalculate remaining on return
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const left = Math.max(0, totalSeconds.current - elapsed);
        setRemaining(left);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (remaining <= 0) {
      vibrateOnTimerComplete();
      cancelRestTimerNotification();
      const t = setTimeout(onSkip, 800);
      return () => clearTimeout(t);
    }
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setRemaining(Math.max(0, totalSeconds.current - elapsed));
    }, 250);
    return () => clearInterval(id);
  }, [remaining <= 0]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = 1 - remaining / totalSeconds.current;

  return (
    <View style={styles.restTimerOverlay}>
      <Text style={styles.restTimerLabel}>Rest</Text>
      <Text style={styles.restTimerTime}>
        {mins}:{secs.toString().padStart(2, '0')}
      </Text>
      {/* Simple progress bar */}
      <View style={styles.restTimerBarBg}>
        <View style={[styles.restTimerBarFill, { width: `${progress * 100}%` }]} />
      </View>
      <TouchableOpacity style={styles.restTimerSkipBtn} onPress={() => {
        cancelRestTimerNotification();
        onSkip();
      }}>
        <Ionicons name="play-skip-forward" size={16} color="#020617" />
        <Text style={styles.restTimerSkipText}>Skip Rest</Text>
      </TouchableOpacity>
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
  "Scanning equipment…",
  "Identifying…",
  "Building your workout…",
];

// Only warn on genuinely stuck requests — normal scans complete in ~3-5s
const SLOW_CONNECTION_THRESHOLD_MS = 20_000;

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

type ScreenView = "camera" | "single-result" | "full-workout";

export default function EquipmentScannerScreen() {
  const router = useRouter();
  const { restore } = useLocalSearchParams<{ restore?: string }>();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  // Scanner is a tab screen — it stays mounted when hidden. Android releases the
  // camera session on hide, leaving a frozen preview on return unless we
  // deactivate/reactivate the camera with focus.
  const isFocused = useIsFocused();

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
  const [paywallContext, setPaywallContext] = useState<"scan_limit" | "voluntary" | "post_first_scan" | "multiscan_gate">("scan_limit");

  // User profile (for AI tailoring)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Workout companion state
  const [exerciseSetLogs, setExerciseSetLogs] = useState<Record<number, SetLog[]>>({});
  const [lastTimeLogs, setLastTimeLogs] = useState<Record<number, SetLog[] | undefined>>({});
  const [weightUnit, setWeightUnitState] = useState<WeightUnit>('lbs');
  const [restTimerSeconds, setRestTimerSeconds] = useState<number | null>(null);

  // Debounced persistence of in-progress set logs — survives app-kill
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistSetLogs = useCallback((logs: Record<number, SetLog[]>) => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEYS.inProgressSetLogs, JSON.stringify(logs)).catch(() => {});
    }, 500);
  }, []);

  const persistWorkoutSession = useCallback((plan: WorkoutPlan) => {
    AsyncStorage.setItem(STORAGE_KEYS.inProgressWorkout, JSON.stringify(plan)).catch(() => {});
  }, []);

  const clearPersistedSession = useCallback(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    AsyncStorage.multiRemove([STORAGE_KEYS.inProgressSetLogs, STORAGE_KEYS.inProgressWorkout]).catch(() => {});
  }, []);

  useEffect(() => {
    loadProfile().then((p) => { if (p) setUserProfile(p); }).catch(() => {});
    getWeightUnit().then(setWeightUnitState).catch(() => {});
  }, []);

  // Restore in-progress workout session on focus (not just mount).
  // This handles both app-kill recovery AND "repeat workout" navigation from home/history,
  // where the scanner tab is already mounted and a new inProgressWorkout was written.
  useFocusEffect(
    useCallback(() => {
      const restoreSession = async () => {
        try {
          const [planRaw, logsRaw] = await AsyncStorage.multiGet([
            STORAGE_KEYS.inProgressWorkout,
            STORAGE_KEYS.inProgressSetLogs,
          ]);
          const plan = planRaw[1] ? JSON.parse(planRaw[1]) as WorkoutPlan : null;
          const logs = logsRaw[1] ? JSON.parse(logsRaw[1]) as Record<number, SetLog[]> : null;
          if (plan) {
            setWorkoutPlan(plan);
            setExerciseSetLogs(logs ?? {});
            setView("full-workout");
          }
        } catch {}
      };
      restoreSession();
    }, [])
  );

  // Backup trigger: when navigating here with ?restore=<timestamp>, read session from AsyncStorage.
  // This handles cases where useFocusEffect doesn't re-fire (e.g. tab already focused).
  useEffect(() => {
    if (!restore) return;
    let active = true;
    (async () => {
      try {
        const [planRaw, logsRaw] = await AsyncStorage.multiGet([
          STORAGE_KEYS.inProgressWorkout,
          STORAGE_KEYS.inProgressSetLogs,
        ]);
        if (!active || !isMounted.current) return;
        const plan = planRaw[1] ? JSON.parse(planRaw[1]) as WorkoutPlan : null;
        const logs = logsRaw[1] ? JSON.parse(logsRaw[1]) as Record<number, SetLog[]> : null;
        if (plan) {
          setWorkoutPlan(plan);
          setExerciseSetLogs(logs ?? {});
          setView("full-workout");
        }
      } catch {}
    })();
    return () => { active = false; };
  }, [restore]);

  // Load "last time" data when a workout plan is generated
  useEffect(() => {
    if (!workoutPlan) return;
    const loadLastTime = async () => {
      const result: Record<number, SetLog[] | undefined> = {};
      for (let i = 0; i < workoutPlan.exercises.length; i++) {
        result[i] = await getLastSetLogs(workoutPlan.exercises[i].name);
      }
      setLastTimeLogs(result);
    };
    loadLastTime().catch(() => {});
  }, [workoutPlan]);

  const handleSetLogChange = useCallback((exerciseIndex: number, setNumber: number, field: 'weightLbs' | 'reps', value: number) => {
    setExerciseSetLogs((prev) => {
      const logs = [...(prev[exerciseIndex] ?? [])];
      const existing = logs.findIndex((l) => l.setNumber === setNumber);
      if (existing >= 0) {
        logs[existing] = { ...logs[existing], [field]: value };
      } else {
        logs.push({ setNumber, weightLbs: field === 'weightLbs' ? value : 0, reps: field === 'reps' ? value : 0 });
      }
      const next = { ...prev, [exerciseIndex]: logs };
      persistSetLogs(next);
      return next;
    });
  }, [persistSetLogs]);

  const handleStartRest = useCallback((seconds: number) => {
    setRestTimerSeconds(seconds);
    scheduleRestTimerNotification(seconds).catch(() => {});
  }, []);

  // Animated values
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const slowHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Unmount guard — prevents setState calls after component is gone
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, []);

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
      }, 900);

      // Slow-connection hint after threshold
      slowHintTimer.current = setTimeout(() => {
        if (isMounted.current) setShowSlowHint(true);
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

    // Check scan limit before taking the photo (only when monetization is active)
    if (isMonetizationEnabled()) {
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
    }

    try {
      setIsAnalyzing(true);

      // Re-check camera ref after the async scan-limit checks above
      if (!cameraRef.current) throw new Error("Camera not ready. Please try again.");

      const photo = await cameraRef.current.takePictureAsync({
        skipProcessing: true,
      });

      if (!photo?.uri) throw new Error("Could not read image data from camera.");

      if (isMounted.current) setCurrentPhotoUri(photo.uri);

      // Resize to max 1024px long edge + JPEG 0.7 before upload.
      // Cuts the payload from ~1-2MB (full sensor res) to ~100-150KB.
      const isPortrait = (photo.height ?? 0) > (photo.width ?? 0);
      const ctx = ImageManipulator.manipulate(photo.uri);
      ctx.resize(
        isPortrait
          ? { height: IMAGE_CONFIG.maxDimension }
          : { width: IMAGE_CONFIG.maxDimension }
      );
      const rendered = await ctx.renderAsync();
      const resized = await rendered.saveAsync({
        format: SaveFormat.JPEG,
        compress: IMAGE_CONFIG.quality,
        base64: true,
      });

      if (!resized.base64) throw new Error("Could not process image. Please try again.");

      const result = await withRetry(() =>
        recognizeEquipment({ image_base64: resized.base64!, profile: userProfile ?? undefined })
      );

      if (!isMounted.current) return;
      setCurrentResult(result);
      setView("single-result");
      // Post-first-scan paywall trigger (soft nudge, max once per 7 days)
      const firstScanFlag = await AsyncStorage.getItem(STORAGE_KEYS.firstScanDone);
      if (!firstScanFlag) {
        await AsyncStorage.setItem(STORAGE_KEYS.firstScanDone, "true");
        trackEvent("first_scan_success", undefined, { equipment_type: result.equipment_type }).catch(() => {});
      }
      // Show paywall if monetization is on, user is not pro, and we haven't auto-shown in 7 days
      if (isMonetizationEnabled()) {
        const isPro = await checkProEntitlement();
        if (!isPro) {
          const lastShown = await AsyncStorage.getItem(STORAGE_KEYS.paywallLastShown);
          const sevenDays = 7 * 24 * 60 * 60 * 1000;
          const canShow = !lastShown || Date.now() - parseInt(lastShown, 10) > sevenDays;
          if (canShow) {
            setTimeout(() => {
              if (!isMounted.current) return;
              setPaywallContext("post_first_scan");
              setShowPaywall(true);
              AsyncStorage.setItem(STORAGE_KEYS.paywallLastShown, String(Date.now())).catch(() => {});
            }, 1500);
          }
        }
      }
    } catch (err) {
      if (!isMounted.current) return;

      // Server-side scan limit hit (only show paywall when monetization is active)
      if (err instanceof ApiError && err.message === "SCAN_LIMIT") {
        if (isMonetizationEnabled()) {
          const data = err.data as { used?: number; limit?: number } | undefined;
          setPaywallScansUsed(data?.used ?? SCAN_LIMIT.free);
          setPaywallDaysUntilReset(0);
          setPaywallContext("scan_limit");
          setShowPaywall(true);
          trackEvent("scan_limit_hit", undefined, { used: data?.used, limit: data?.limit }).catch(() => {});
        }
        return;
      }

      let msg = "Network error. Check your internet connection and try again.";
      if (err instanceof ApiError) {
        msg =
          err.statusCode === 408
            ? "Request timed out. Please try again."
            : err.statusCode === 0
            ? "Cannot connect. Please check your connection."
            : err.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      Alert.alert("Scan failed", msg);
      if (isMounted.current) setCurrentPhotoUri(null);
    } finally {
      if (isMounted.current) setIsAnalyzing(false);
    }
  };

  const handleAddToQueue = async () => {
    if (!currentResult) return;

    // Multi-scan gate: adding 2nd+ item requires Pro (only when monetization is active)
    if (isMonetizationEnabled() && scannedItems.length >= 1) {
      const isPro = await checkProEntitlement();
      if (!isPro) {
        setPaywallContext("multiscan_gate");
        setShowPaywall(true);
        trackEvent("multiscan_gate_hit").catch(() => {});
        return;
      }
    }

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
    // If there's an in-progress workout with logged sets, confirm before discarding
    const hasLoggedSets = Object.values(exerciseSetLogs).some((logs) => logs.length > 0);
    if (hasLoggedSets && workoutPlan) {
      return new Promise<void>((resolve) => {
        Alert.alert(
          "Discard current workout?",
          "You have logged sets that haven't been saved. Building a new workout will discard them.",
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve() },
            { text: "Discard", style: "destructive", onPress: () => { doBuildWorkout(); resolve(); } },
          ]
        );
      });
    }
    return doBuildWorkout();
  };

  const doBuildWorkout = async () => {
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
      const plan = await generateWorkout({ equipment_types, profile: userProfile ?? undefined });
      if (!isMounted.current) return;
      setWorkoutPlan(plan);
      setExerciseSetLogs({}); // reset set logs for new workout
      persistWorkoutSession(plan); // persist plan so session survives app-kill
      setView("full-workout");
    } catch (err) {
      if (!isMounted.current) return;
      let msg = "Could not generate workout. Please try again.";
      if (err instanceof ApiError) msg = err.message;
      Alert.alert("Workout generation failed", msg);
    } finally {
      if (isMounted.current) setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setScannedItems([]);
    setCurrentResult(null);
    setCurrentPhotoUri(null);
    setWorkoutPlan(null);
    setExerciseSetLogs({});
    setLastTimeLogs({});
    setRestTimerSeconds(null);
    clearPersistedSession();
    setView("camera");
  };

  /** Called when "Finished Workout" is tapped — saves locally with set logs, then handles review prompt */
  const handleFinishWorkout = async () => {
    if (!workoutPlan) { handleReset(); router.push("/"); return; }

    // Save workout with set logs — offline-first, never blocks UI
    try {
      await saveWorkoutToHistory(workoutPlan, exerciseSetLogs);
      clearPersistedSession(); // session complete — clear in-progress cache
    } catch {
      // Data remains in AsyncStorage (workout + set logs) — will be restored on next open
    }

    // Post-workout notifications (fire-and-forget)
    schedulePostWorkoutNotifications().catch(() => {});

    // Review prompt: 2nd or 3rd completed workout, once ever
    try {
      const alreadyShown = await AsyncStorage.getItem(STORAGE_KEYS.reviewPromptShown);
      if (!alreadyShown) {
        const { loadStats } = await import("../lib/workoutHistory");
        const stats = await loadStats();
        if (stats.totalWorkouts >= 2 && stats.totalWorkouts <= 3) {
          const isAvailable = await StoreReview.isAvailableAsync();
          if (isAvailable) {
            await AsyncStorage.setItem(STORAGE_KEYS.reviewPromptShown, 'true');
            StoreReview.requestReview();
          }
        }
      }
    } catch {}

    handleReset();
    router.push("/");
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
        <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { flexDirection: "column" }]}>
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
                <GHScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {exercises.map((ex, idx) => (
                    <ExerciseCard key={idx} ex={ex} />
                  ))}
                </GHScrollView>

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
                            : "Build Workout"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
        </GestureHandlerRootView>
      </Modal>
    );
  };

  const renderFullWorkoutSheet = () => {
    if (view !== "full-workout" || !workoutPlan) return null;

    return (
      <Modal visible animationType="slide" transparent={false} onRequestClose={handleReset}>
        <GestureHandlerRootView style={{ flex: 1 }}>
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
              {/* Weight unit toggle */}
              <TouchableOpacity
                onPress={() => {
                  const next = weightUnit === 'lbs' ? 'kg' : 'lbs';
                  setWeightUnitState(next);
                  setWeightUnit(next).catch(() => {});
                }}
                style={styles.unitToggle}
              >
                <Text style={styles.unitToggleText}>{weightUnit}</Text>
              </TouchableOpacity>
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

            <Text style={styles.sectionTitle}>Log Your Sets</Text>
            <GHScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" nestedScrollEnabled>
              {workoutPlan.exercises.map((ex, idx) => (
                <View key={idx}>
                  <View style={styles.exerciseNumber}>
                    <Text style={styles.exerciseNumberText}>{idx + 1}</Text>
                  </View>
                  <WorkoutExerciseCard
                    ex={ex}
                    exerciseIndex={idx}
                    setLogs={exerciseSetLogs[idx] ?? []}
                    lastTimeLogs={lastTimeLogs[idx]}
                    weightUnit={weightUnit}
                    onSetLogChange={handleSetLogChange}
                    onStartRest={handleStartRest}
                  />
                </View>
              ))}
              <View style={{ height: 16 }} />
            </GHScrollView>

            {/* Rest timer overlay */}
            {restTimerSeconds !== null && (
              <RestTimerOverlay
                seconds={restTimerSeconds}
                onSkip={() => setRestTimerSeconds(null)}
              />
            )}

            {/* Bottom action buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, { flex: 1 }]}
                onPress={handleReset}
              >
                <Ionicons name="scan-outline" size={18} color={COLORS.primary} />
                <Text style={styles.secondaryButtonText}>Scan More</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1, marginTop: 0 }]}
                onPress={handleFinishWorkout}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#000" />
                <Text style={styles.primaryButtonText}>Finish Workout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </GestureHandlerRootView>
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
        <Text style={styles.headerTitle}>Equipment Scanner</Text>
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
        <CameraView ref={cameraRef} style={styles.camera} facing="back" active={isFocused}>
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
            Still working — this is taking longer than usual.
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

      {/* Generating overlay — shown when building workout from queue bar */}
      {isGenerating && view === "camera" && (
        <View style={styles.generatingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.generatingTitle}>Building your workout…</Text>
          <Text style={styles.generatingSubtitle}>
            AI is crafting {scannedItems.length} equipment workout
          </Text>
        </View>
      )}

      {/* Modals */}
      {renderSingleResultSheet()}
      {renderFullWorkoutSheet()}

      <Paywall
        visible={showPaywall}
        scansUsed={paywallScansUsed}
        daysUntilReset={paywallDaysUntilReset}
        entryContext={paywallContext}
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
  scrollArea: { flex: 1 },

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

  // Generating overlay
  generatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,8,23,0.88)",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    zIndex: 50,
  },
  generatingTitle: { fontSize: 20, fontWeight: "700", color: "#ffffff" },
  generatingSubtitle: { fontSize: 14, color: "#64748b" },

  // Unknown equipment state
  unknownBox: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  unknownTitle: { fontSize: 17, fontWeight: "700", color: "#ffffff", textAlign: "center", marginBottom: 10 },
  unknownBody: { fontSize: 13, color: "#9ca3af", textAlign: "center", lineHeight: 20 },

  // Weight unit toggle
  unitToggle: {
    backgroundColor: "#1e293b",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  unitToggleText: { color: COLORS.primary, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },

  // Last-time banner
  lastTimeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#0f172a",
    borderRadius: 6,
    marginBottom: 6,
  },
  lastTimeText: { fontSize: 11, color: "#64748b" },

  // Set logging
  setHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  setHeaderLabel: { fontSize: 10, color: "#4b5563", fontWeight: "600", textTransform: "uppercase" },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    marginBottom: 6,
    gap: 8,
  },
  setNumberLabel: { fontSize: 13, color: "#64748b", fontWeight: "600", textAlign: "center" },
  setInput: {
    backgroundColor: "#0f172a",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: "center",
  },
  restBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },

  // Rest timer overlay
  restTimerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: "rgba(2,8,23,0.95)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    gap: 12,
  },
  restTimerLabel: { fontSize: 16, color: "#9ca3af", fontWeight: "600", letterSpacing: 2, textTransform: "uppercase" },
  restTimerTime: { fontSize: 64, color: "#ffffff", fontWeight: "700", fontVariant: ["tabular-nums"] },
  restTimerBarBg: {
    width: "60%",
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1e293b",
    overflow: "hidden",
  },
  restTimerBarFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  restTimerSkipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  restTimerSkipText: { color: "#020617", fontSize: 14, fontWeight: "700" },
});
