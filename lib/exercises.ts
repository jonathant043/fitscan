// lib/exercises.ts
export type Exercise = {
  id: string;
  name: string;
  muscleGroups: string[];
  equipment: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  sets: string;
  reps: string;
};

export const EXERCISES: Exercise[] = [
  {
    id: "pushups",
    name: "Push-ups",
    muscleGroups: ["Chest", "Triceps", "Core"],
    equipment: "Bodyweight",
    level: "Beginner",
    sets: "3",
    reps: "8–12",
  },
  {
    id: "db-bench",
    name: "Dumbbell Chest Press",
    muscleGroups: ["Chest", "Triceps"],
    equipment: "Dumbbells",
    level: "Beginner",
    sets: "3–4",
    reps: "8–12",
  },
  {
    id: "row",
    name: "Bent-Over Row",
    muscleGroups: ["Back", "Biceps"],
    equipment: "Dumbbells",
    level: "Beginner",
    sets: "3–4",
    reps: "8–10",
  },
  {
    id: "squat",
    name: "Bodyweight Squats",
    muscleGroups: ["Legs", "Glutes"],
    equipment: "Bodyweight",
    level: "Beginner",
    sets: "3",
    reps: "12–15",
  },
  {
    id: "db-lunge",
    name: "Lunges",
    muscleGroups: ["Legs", "Glutes"],
    equipment: "Bodyweight",
    level: "Beginner",
    sets: "3",
    reps: "10–12 / leg",
  },
  {
    id: "db-shoulder",
    name: "Shoulder Press",
    muscleGroups: ["Shoulders"],
    equipment: "Dumbbells",
    level: "Beginner",
    sets: "3",
    reps: "8–10",
  },
  {
    id: "bb-squat",
    name: "Barbell Back Squat",
    muscleGroups: ["Legs", "Glutes"],
    equipment: "Barbell",
    level: "Intermediate",
    sets: "3–4",
    reps: "6–10",
  },
  {
    id: "bb-deadlift",
    name: "Barbell Deadlift",
    muscleGroups: ["Hamstrings", "Glutes", "Back"],
    equipment: "Barbell",
    level: "Intermediate",
    sets: "3–4",
    reps: "5–8",
  },
  {
    id: "lat-pulldown",
    name: "Lat Pulldown",
    muscleGroups: ["Back", "Biceps"],
    equipment: "Cable machine",
    level: "Intermediate",
    sets: "3–4",
    reps: "8–12",
  },
];
