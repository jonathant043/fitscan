// app/exercises.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type Exercise = {
  name: string;
  equipment: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  muscleGroup: string;
  description: string;
};

const exerciseCategories: Record<string, Exercise[]> = {
  chest: [
    { name: "Bench Press", equipment: "Barbell", difficulty: "Intermediate", muscleGroup: "Chest", description: "Classic barbell press — lower to lower chest, press explosively while keeping shoulder blades retracted." },
    { name: "Incline Dumbbell Press", equipment: "Dumbbells", difficulty: "Intermediate", muscleGroup: "Chest", description: "Bench at 30-45°, targets upper chest and front delts. Control the descent for full stretch." },
    { name: "Dumbbell Flyes", equipment: "Dumbbells", difficulty: "Beginner", muscleGroup: "Chest", description: "Arc arms wide to stretch pecs fully, bring together over chest. Slight elbow bend throughout." },
    { name: "Cable Chest Fly", equipment: "Cable Machine", difficulty: "Intermediate", muscleGroup: "Chest", description: "Set cables high, step forward and arc handles together — constant tension throughout the full range." },
    { name: "Push-Ups", equipment: "Bodyweight", difficulty: "Beginner", muscleGroup: "Chest", description: "Hands slightly wider than shoulders, body straight — lower chest to floor then press back up." },
    { name: "Decline Push-Up", equipment: "Bodyweight", difficulty: "Beginner", muscleGroup: "Chest", description: "Feet elevated on a bench or step to shift emphasis to upper chest and front delts." },
    { name: "Dips", equipment: "Parallel Bars", difficulty: "Intermediate", muscleGroup: "Chest", description: "Lean forward slightly to emphasize chest over triceps — lower until elbows reach 90°, press up." },
  ],
  back: [
    { name: "Deadlift", equipment: "Barbell", difficulty: "Advanced", muscleGroup: "Back", description: "Full posterior chain compound — drive hips forward keeping bar dragging close to legs throughout." },
    { name: "Pull-Ups", equipment: "Pull-Up Bar", difficulty: "Intermediate", muscleGroup: "Back", description: "Overhand grip, hang fully, pull chest toward bar squeezing lats. Lower with full control." },
    { name: "Bent-Over Row", equipment: "Barbell", difficulty: "Intermediate", muscleGroup: "Back", description: "Hinge 45° forward, pull bar to lower chest keeping elbows tucked, squeeze lats at the top." },
    { name: "Cable Seated Row", equipment: "Cable Machine", difficulty: "Beginner", muscleGroup: "Back", description: "Sit tall, pull handle to lower chest keeping elbows close — squeeze shoulder blades hard at the end." },
    { name: "Lat Pulldown", equipment: "Cable Machine", difficulty: "Beginner", muscleGroup: "Back", description: "Grip wide, lean slightly back, pull bar to upper chest — feel lats stretching on the way up." },
    { name: "Single-Arm Dumbbell Row", equipment: "Dumbbells", difficulty: "Beginner", muscleGroup: "Back", description: "Brace on bench, pull dumbbell to hip crease — think 'elbow to ceiling' for max lat engagement." },
    { name: "Face Pull", equipment: "Cable Machine", difficulty: "Beginner", muscleGroup: "Back", description: "Set cable at face height, pull rope to forehead with elbows high — great for rear delts and posture." },
    { name: "Chin-Ups", equipment: "Pull-Up Bar", difficulty: "Intermediate", muscleGroup: "Back", description: "Underhand grip, shoulder width — strong bicep and lat engagement pulling chin above bar." },
  ],
  legs: [
    { name: "Back Squat", equipment: "Barbell", difficulty: "Intermediate", muscleGroup: "Legs", description: "Bar on upper traps — squat below parallel, drive through full foot, stay upright through the lift." },
    { name: "Romanian Deadlift", equipment: "Barbell", difficulty: "Intermediate", muscleGroup: "Legs", description: "Hinge at hips pushing them back, bar drags down legs — feel hamstring stretch before returning." },
    { name: "Leg Press", equipment: "Machine", difficulty: "Beginner", muscleGroup: "Legs", description: "Feet shoulder width, lower sled until knees hit 90° — drive through heels to full extension." },
    { name: "Bulgarian Split Squat", equipment: "Dumbbells", difficulty: "Intermediate", muscleGroup: "Legs", description: "Rear foot elevated on bench, drop back knee toward floor, drive through front heel to stand." },
    { name: "Lunges", equipment: "Dumbbells", difficulty: "Beginner", muscleGroup: "Legs", description: "Step forward, lower back knee to floor, keep front knee over ankle — drive back to start." },
    { name: "Leg Curl", equipment: "Machine", difficulty: "Beginner", muscleGroup: "Legs", description: "Lying or seated, curl pad toward glutes — squeeze hamstrings at peak and lower with control." },
    { name: "Goblet Squat", equipment: "Kettlebell", difficulty: "Beginner", muscleGroup: "Legs", description: "Hold kettlebell at chest, squat deep with elbows inside knees — great for quad and glute development." },
    { name: "Calf Raises", equipment: "Machine", difficulty: "Beginner", muscleGroup: "Legs", description: "Full range of motion pressing through balls of feet — pause at the top for a 1-sec squeeze." },
  ],
  shoulders: [
    { name: "Overhead Press", equipment: "Barbell", difficulty: "Intermediate", muscleGroup: "Shoulders", description: "Press bar from clavicle to lockout overhead — brace core hard and avoid lower back arch." },
    { name: "Dumbbell Shoulder Press", equipment: "Dumbbells", difficulty: "Beginner", muscleGroup: "Shoulders", description: "Press from ear height to full lockout, slight inward arc at the top to peak the delts." },
    { name: "Lateral Raises", equipment: "Dumbbells", difficulty: "Beginner", muscleGroup: "Shoulders", description: "Raise arms to shoulder height leading with elbows — avoid shrugging, slow the descent." },
    { name: "Cable Lateral Raise", equipment: "Cable Machine", difficulty: "Beginner", muscleGroup: "Shoulders", description: "Stand sideways to low cable, raise arm to shoulder height — cable keeps tension at the bottom unlike dumbbells." },
    { name: "Face Pulls", equipment: "Cable Machine", difficulty: "Beginner", muscleGroup: "Shoulders", description: "Set cable at face height, pull rope to forehead elbows high — key for rear delt health and posture." },
    { name: "Arnold Press", equipment: "Dumbbells", difficulty: "Intermediate", muscleGroup: "Shoulders", description: "Start with palms facing you, rotate outward as you press up — hits all three delt heads." },
    { name: "Upright Row", equipment: "Barbell", difficulty: "Intermediate", muscleGroup: "Shoulders", description: "Pull bar up to chin with elbows leading — stops when elbows reach shoulder height." },
  ],
  arms: [
    { name: "Bicep Curls", equipment: "Dumbbells", difficulty: "Beginner", muscleGroup: "Arms", description: "Elbows pinned at sides, curl fully and lower slowly — supinate wrist at the top for peak contraction." },
    { name: "Hammer Curls", equipment: "Dumbbells", difficulty: "Beginner", muscleGroup: "Arms", description: "Neutral grip curl hits brachialis and brachioradialis — great for arm thickness and grip." },
    { name: "Cable Bicep Curl", equipment: "Cable Machine", difficulty: "Beginner", muscleGroup: "Arms", description: "Cable keeps constant tension throughout — especially at the bottom where dumbbells go slack." },
    { name: "Preacher Curl", equipment: "Machine", difficulty: "Beginner", muscleGroup: "Arms", description: "Arm rests on pad eliminating cheating — full stretch at bottom, full squeeze at top." },
    { name: "Tricep Pushdown", equipment: "Cable Machine", difficulty: "Beginner", muscleGroup: "Arms", description: "Pin elbows at sides, push rope or bar to full extension — squeeze triceps hard at the bottom." },
    { name: "Skull Crushers", equipment: "Barbell", difficulty: "Intermediate", muscleGroup: "Arms", description: "Lower bar to forehead hinging only at elbows — long head of triceps gets a deep stretch." },
    { name: "Tricep Dips", equipment: "Bench", difficulty: "Beginner", muscleGroup: "Arms", description: "Hands behind you on bench, lower until elbows reach 90° keeping them tracking backward." },
    { name: "Close-Grip Bench Press", equipment: "Barbell", difficulty: "Intermediate", muscleGroup: "Arms", description: "Hands shoulder width on bar, lower to sternum — triceps do most of the work here." },
  ],
  core: [
    { name: "Plank", equipment: "Bodyweight", difficulty: "Beginner", muscleGroup: "Core", description: "Forearms on floor, body straight from head to heels — brace everything and breathe steadily." },
    { name: "Russian Twists", equipment: "Bodyweight", difficulty: "Intermediate", muscleGroup: "Core", description: "Feet lifted, rotate torso fully side to side — add a weight plate or medicine ball to progress." },
    { name: "Hanging Leg Raises", equipment: "Pull-Up Bar", difficulty: "Intermediate", muscleGroup: "Core", description: "Dead hang, raise straight legs to parallel — control the descent and avoid swinging." },
    { name: "Cable Woodchop", equipment: "Cable Machine", difficulty: "Intermediate", muscleGroup: "Core", description: "Set cable high, pull handle diagonally across body rotating through core — excellent for obliques." },
    { name: "Ab Wheel Rollout", equipment: "Ab Wheel", difficulty: "Advanced", muscleGroup: "Core", description: "Roll forward as far as possible keeping hips level, use core to pull back — do not let hips drop." },
    { name: "Bicycle Crunches", equipment: "Bodyweight", difficulty: "Intermediate", muscleGroup: "Core", description: "Alternate elbow to opposite knee rotating fully through the torso — slow and deliberate beats fast." },
    { name: "Dead Bug", equipment: "Bodyweight", difficulty: "Beginner", muscleGroup: "Core", description: "On back, opposite arm and leg extend while pressing lower back into floor — anti-extension core work." },
    { name: "Hollow Body Hold", equipment: "Bodyweight", difficulty: "Intermediate", muscleGroup: "Core", description: "Press lower back flat, lift arms and legs into a banana shape — foundation of gymnastic strength." },
  ],
  cable: [
    { name: "Cable Chest Fly", equipment: "Cable Machine", difficulty: "Intermediate", muscleGroup: "Chest", description: "Set cables high, arc handles together in front of chest — constant tension throughout full range." },
    { name: "Lat Pulldown", equipment: "Cable Machine", difficulty: "Beginner", muscleGroup: "Back", description: "Wide overhand grip, lean slightly back, pull bar to upper chest feeling lats stretch at the top." },
    { name: "Seated Cable Row", equipment: "Cable Machine", difficulty: "Beginner", muscleGroup: "Back", description: "Pull handle to lower chest keeping elbows close — squeeze shoulder blades together at the end." },
    { name: "Cable Tricep Pushdown", equipment: "Cable Machine", difficulty: "Beginner", muscleGroup: "Arms", description: "Elbows pinned at sides, push rope or bar to full extension — squeeze triceps at the bottom." },
    { name: "Cable Bicep Curl", equipment: "Cable Machine", difficulty: "Beginner", muscleGroup: "Arms", description: "Low pulley, curl to shoulder height — cable maintains tension where dumbbells lose it." },
    { name: "Cable Lateral Raise", equipment: "Cable Machine", difficulty: "Beginner", muscleGroup: "Shoulders", description: "Stand sideways, low cable crosses in front — raise arm to shoulder height for lateral delt isolation." },
    { name: "Cable Face Pull", equipment: "Cable Machine", difficulty: "Beginner", muscleGroup: "Shoulders", description: "Rope attachment at face height, pull to forehead elbows high — essential for shoulder health." },
    { name: "Cable Woodchop", equipment: "Cable Machine", difficulty: "Intermediate", muscleGroup: "Core", description: "High-to-low diagonal pull rotating through the core — targets obliques with anti-rotation load." },
    { name: "Cable Romanian Deadlift", equipment: "Cable Machine", difficulty: "Intermediate", muscleGroup: "Legs", description: "Low attachment, hinge at hips keeping cable taut along legs — great hamstring stretch and load." },
    { name: "Cable Hip Abduction", equipment: "Cable Machine", difficulty: "Beginner", muscleGroup: "Glutes", description: "Ankle attachment, stand sideways, kick leg out to side — isolates glute medius for hip stability." },
    { name: "Cable Crunch", equipment: "Cable Machine", difficulty: "Beginner", muscleGroup: "Core", description: "Rope overhead, kneel and crunch elbows toward knees — load allows progressive overload on abs." },
    { name: "Cable Pull-Through", equipment: "Cable Machine", difficulty: "Beginner", muscleGroup: "Glutes", description: "Low cable between legs, hinge and drive hips forward squeezing glutes — great glute builder." },
  ],
  cardio: [
    { name: "HIIT Sprints", equipment: "Treadmill", difficulty: "Advanced", muscleGroup: "Cardio", description: "30 sec at 80-90% max speed, 60 sec walk recovery — repeat 8-10 rounds for maximum fat burn." },
    { name: "Incline Power Walk", equipment: "Treadmill", difficulty: "Beginner", muscleGroup: "Cardio", description: "Set incline to 8-12%, brisk walk without holding rails — activates glutes and burns more calories than flat running." },
    { name: "Tempo Run", equipment: "Treadmill", difficulty: "Intermediate", muscleGroup: "Cardio", description: "Sustain a challenging pace (7/10 effort) for 20-30 minutes — builds aerobic threshold without burning out." },
    { name: "Pyramid Intervals", equipment: "Treadmill", difficulty: "Intermediate", muscleGroup: "Cardio", description: "Build effort in a pyramid: 1 min hard, 2 min hard, 3 min hard, then descend — total ~20 min." },
    { name: "HIIT Cycling", equipment: "Stationary Bike", difficulty: "Advanced", muscleGroup: "Cardio", description: "20 sec maximum sprint, 40 sec easy — 8-10 rounds. Stay seated and drive high resistance on sprints." },
    { name: "Steady State Cycling", equipment: "Stationary Bike", difficulty: "Beginner", muscleGroup: "Cardio", description: "Moderate resistance at a conversational pace for 30-45 minutes — great for active recovery or fat burning." },
    { name: "Hill Climb Simulation", equipment: "Stationary Bike", difficulty: "Intermediate", muscleGroup: "Cardio", description: "Heavy resistance, slow cadence — simulates climbing a steep hill. Great for quads and glutes." },
    { name: "Tabata Cycling", equipment: "Stationary Bike", difficulty: "Advanced", muscleGroup: "Cardio", description: "8 rounds of 20 sec all-out effort, 10 sec rest — only 4 minutes but extremely intense." },
    { name: "Elliptical Intervals", equipment: "Elliptical", difficulty: "Intermediate", muscleGroup: "Cardio", description: "Alternate 2 min high resistance with 1 min recovery — low impact on joints, high calorie burn." },
    { name: "Elliptical Reverse Stride", equipment: "Elliptical", difficulty: "Beginner", muscleGroup: "Cardio", description: "Pedal in reverse to shift emphasis to hamstrings and glutes — great for balanced lower body cardio." },
    { name: "Cross-Trainer HIIT", equipment: "Elliptical", difficulty: "Advanced", muscleGroup: "Cardio", description: "Max resistance sprints for 30 sec, light recovery for 60 sec — engages both upper and lower body." },
    { name: "Jump Rope Basic", equipment: "Jump Rope", difficulty: "Beginner", muscleGroup: "Cardio", description: "Both feet together, land softly on balls of feet — 5 sets of 1 minute with 30 sec rest." },
    { name: "Alternating Foot Jump", equipment: "Jump Rope", difficulty: "Beginner", muscleGroup: "Cardio", description: "Jog in place skipping the rope, alternating feet each rotation — builds rhythm and coordination." },
    { name: "Double-Unders", equipment: "Jump Rope", difficulty: "Advanced", muscleGroup: "Cardio", description: "Jump higher than normal, spin rope fast enough to pass under feet twice per jump — elite conditioning." },
    { name: "Jump Rope Tabata", equipment: "Jump Rope", difficulty: "Intermediate", muscleGroup: "Cardio", description: "8 rounds of 20 sec max speed, 10 sec rest — simple, portable, incredibly effective for conditioning." },
    { name: "Rowing Machine Intervals", equipment: "Rowing Machine", difficulty: "Intermediate", muscleGroup: "Cardio", description: "500m hard effort, 2 min rest — 6-8 rounds. Drive through legs first, lean back, then pull arms." },
    { name: "Steady State Row", equipment: "Rowing Machine", difficulty: "Beginner", muscleGroup: "Cardio", description: "20-30 min at 22-24 strokes per minute — full body aerobic work with zero impact on joints." },
  ],
  glutes: [
    { name: "Hip Thrust", equipment: "Barbell", difficulty: "Beginner", muscleGroup: "Glutes", description: "Upper back on bench, bar across hips with pad — drive hips to ceiling squeezing glutes hard at the top." },
    { name: "Cable Pull-Through", equipment: "Cable Machine", difficulty: "Beginner", muscleGroup: "Glutes", description: "Low cable between legs, hinge and drive hips forward — emphasizes glutes and hamstrings." },
    { name: "Glute Kickback", equipment: "Cable Machine", difficulty: "Beginner", muscleGroup: "Glutes", description: "Ankle attachment, kick leg straight back squeezing glute at full extension — isolates glute max." },
    { name: "Sumo Deadlift", equipment: "Barbell", difficulty: "Intermediate", muscleGroup: "Glutes", description: "Wide stance, toes out — greater glute and inner thigh involvement than conventional deadlift." },
    { name: "Glute Bridge", equipment: "Bodyweight", difficulty: "Beginner", muscleGroup: "Glutes", description: "On back, feet flat — drive hips to ceiling and hold the squeeze for 1-2 seconds before lowering." },
    { name: "Lateral Band Walk", equipment: "Resistance Band", difficulty: "Beginner", muscleGroup: "Glutes", description: "Band above knees in quarter squat — step sideways maintaining tension for glute medius activation." },
    { name: "Step-Ups", equipment: "Dumbbells", difficulty: "Beginner", muscleGroup: "Glutes", description: "Step onto a bench or box, drive through the heel to stand — excellent unilateral glute builder." },
    { name: "Romanian Deadlift", equipment: "Dumbbells", difficulty: "Intermediate", muscleGroup: "Glutes", description: "Hinge pushing hips back, dumbbells dragging down legs — feel the hamstring and glute stretch fully." },
  ],
};

export default function ExercisesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const categories = Object.keys(exerciseCategories);

  const getDifficultyColor = (difficulty: Exercise["difficulty"]) => {
    switch (difficulty) {
      case "Beginner":
        return "#22c55e";
      case "Intermediate":
        return "#f97316";
      case "Advanced":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const allExercises = selectedCategory
    ? exerciseCategories[selectedCategory]
    : Object.values(exerciseCategories).flat();

  const filteredExercises = allExercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back arrow */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/")}>
          <Ionicons name="chevron-back" size={24} color="#e5e7eb" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exercise library</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises…"
          placeholderTextColor="#6b7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive,
              ]}
              onPress={() =>
                setSelectedCategory(
                  selectedCategory === category ? null : category
                )
              }
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category && styles.categoryChipTextActive,
                ]}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.exercisesContainer}>
          {filteredExercises.map((exercise, index) => (
            <TouchableOpacity
              key={`${exercise.name}-${index}`}
              style={styles.exerciseCard}
              onPress={() => setSelectedExercise(exercise)}
            >
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName} numberOfLines={1}>
                  {exercise.name}
                </Text>
                <View
                  style={[
                    styles.difficultyBadge,
                    { backgroundColor: getDifficultyColor(exercise.difficulty) },
                  ]}
                >
                  <Text style={styles.difficultyText}>
                    {exercise.difficulty}
                  </Text>
                </View>
              </View>
              <View style={styles.exerciseInfo}>
                <Ionicons name="fitness" size={16} color="#6b7280" />
                <Text style={styles.equipmentText}>
                  {exercise.equipment} • {exercise.muscleGroup}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Detail modal */}
      <Modal
        visible={!!selectedExercise}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedExercise(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedExercise?.name ?? ""}
              </Text>
              <TouchableOpacity onPress={() => setSelectedExercise(null)}>
                <Ionicons name="close" size={24} color="#e5e7eb" />
              </TouchableOpacity>
            </View>

            {selectedExercise && (
              <>
                <Text style={styles.modalSubtitle}>
                  {selectedExercise.equipment} • {selectedExercise.muscleGroup}
                </Text>
                <Text style={styles.modalDescription}>
                  {selectedExercise.description}
                </Text>

                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Difficulty</Text>
                  <Text
                    style={[
                      styles.modalTag,
                      {
                        backgroundColor: getDifficultyColor(
                          selectedExercise.difficulty
                        ),
                      },
                    ]}
                  >
                    {selectedExercise.difficulty}
                  </Text>
                </View>

                <View style={styles.modalFooterNote}>
                  <Text style={styles.modalFooterText}>
                    Scan this equipment in the Scan tab to get a full AI-tailored workout built around it.
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020817" },
  header: {
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f9fafb",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#020617",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#f9fafb",
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  categoryChip: {
    backgroundColor: "#020617",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  categoryChipActive: {
    backgroundColor: "#0ea5e9",
    borderColor: "#0ea5e9",
  },
  categoryChipText: {
    color: "#9ca3af",
    fontSize: 13,
    fontWeight: "500",
  },
  categoryChipTextActive: {
    color: "#ffffff",
  },
  exercisesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  exerciseCard: {
    backgroundColor: "#020617",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f9fafb",
    flex: 1,
    marginRight: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  difficultyText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  exerciseInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  equipmentText: {
    color: "#9ca3af",
    fontSize: 13,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#020617",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f9fafb",
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#9ca3af",
  },
  modalDescription: {
    marginTop: 10,
    fontSize: 14,
    color: "#e5e7eb",
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  modalLabel: {
    fontSize: 14,
    color: "#9ca3af",
  },
  modalTag: {
    color: "#020617",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
  },
  modalFooterNote: {
    marginTop: 16,
  },
  modalFooterText: {
    fontSize: 12,
    color: "#6b7280",
  },
});