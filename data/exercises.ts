// data/exercises.ts

export type ExerciseLevel = "Beginner" | "Intermediate" | "Advanced";

export type BodyPart =
  | "Chest"
  | "Back"
  | "Legs"
  | "Shoulders"
  | "Arms"
  | "Core"
  | "Full Body";

export type Exercise = {
  id: string;
  name: string;
  bodyPart: BodyPart;
  equipment: string;
  level: ExerciseLevel;
  primaryMuscle: string;
  secondaryMuscles: string[];
  description: string;
  cues: string[];
};

export const EXERCISES: Exercise[] = [
  {
    id: "pushups",
    name: "Push-ups",
    bodyPart: "Chest",
    equipment: "None",
    level: "Beginner",
    primaryMuscle: "Chest",
    secondaryMuscles: ["Triceps", "Shoulders", "Core"],
    description:
      "A classic bodyweight push movement that builds chest, triceps, and shoulder strength while engaging your core.",
    cues: [
      "Hands slightly wider than shoulder-width",
      "Keep a straight line from head to heels",
      "Lower chest just above the floor, then press back up",
    ],
  },
  {
    id: "db-chest-press",
    name: "Dumbbell Chest Press",
    bodyPart: "Chest",
    equipment: "Dumbbells, Bench",
    level: "Beginner",
    primaryMuscle: "Chest",
    secondaryMuscles: ["Triceps", "Front Delts"],
    description:
      "Press dumbbells away from your chest while lying on a bench to build pressing strength and chest size.",
    cues: [
      "Feet flat, slight arch in lower back",
      "Lower weights with control to chest level",
      "Press up and bring dumbbells together over chest",
    ],
  },
  {
    id: "bent-over-row",
    name: "Bent-Over Row",
    bodyPart: "Back",
    equipment: "Dumbbells or Barbell",
    level: "Beginner",
    primaryMuscle: "Upper Back",
    secondaryMuscles: ["Lats", "Biceps", "Core"],
    description:
      "A hinge-position pull that targets the upper back and lats while your core stabilizes your spine.",
    cues: [
      "Soft knees, hinge at hips, flat back",
      "Pull elbows toward your hips, not straight up",
      "Squeeze shoulder blades together at the top",
    ],
  },
  {
    id: "bodyweight-squat",
    name: "Bodyweight Squats",
    bodyPart: "Legs",
    equipment: "None",
    level: "Beginner",
    primaryMuscle: "Quads",
    secondaryMuscles: ["Glutes", "Hamstrings", "Core"],
    description:
      "Fundamental lower-body pattern that builds strength, mobility, and control using your bodyweight.",
    cues: [
      "Feet about shoulder-width apart",
      "Sit hips back and down like a chair",
      "Knees track over toes, chest stays tall",
    ],
  },
  {
    id: "db-shoulder-press",
    name: "Dumbbell Shoulder Press",
    bodyPart: "Shoulders",
    equipment: "Dumbbells",
    level: "Beginner",
    primaryMuscle: "Shoulders",
    secondaryMuscles: ["Triceps", "Upper Chest"],
    description:
      "Overhead press to strengthen shoulders and triceps while challenging core stability.",
    cues: [
      "Start with dumbbells at shoulder height, palms forward",
      "Press up until arms are almost straight",
      "Avoid arching your lower back",
    ],
  },
  {
    id: "plank",
    name: "Plank Hold",
    bodyPart: "Core",
    equipment: "Mat",
    level: "Beginner",
    primaryMuscle: "Core",
    secondaryMuscles: ["Shoulders", "Glutes"],
    description:
      "Isometric core hold that teaches you to brace and maintain a neutral spine.",
    cues: [
      "Elbows under shoulders, forearms on floor",
      "Squeeze glutes and brace abs",
      "Keep body in a straight line, avoid sagging",
    ],
  },
];
