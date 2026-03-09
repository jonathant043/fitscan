// index.js
// Simple FitScan backend for equipment recognition via AI vision

require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Configuration
const PORT = process.env.PORT || 4000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Known equipment types used by the app
const EQUIPMENT_KEYS = [
  "dumbbell",
  "barbell",
  "bench",
  "kettlebell",
  "resistance_band",
  "yoga_mat",
  "treadmill",
  "stationary_bike",
  "cable_machine",
  "smith_machine",
  "pullup_bar",
  "medicine_ball",
];

// Maps many possible AI labels/descriptions -> your canonical keys
function mapToEquipmentKeyFromLabel(label) {
  if (!label || typeof label !== "string") return "unknown";

  const text = label.toLowerCase();

  const rules = [
    { key: "dumbbell", keywords: ["dumbbell", "dumb bell", "free weight"] },
    { key: "barbell", keywords: ["barbell", "bar bell", "olympic bar", "straight bar"] },
    { key: "bench", keywords: ["bench", "weight bench", "flat bench", "incline bench"] },
    { key: "kettlebell", keywords: ["kettlebell", "kettle bell"] },
    {
      key: "resistance_band",
      keywords: ["resistance band", "exercise band", "bands", "loop band", "pull-up band"],
    },
    {
      key: "yoga_mat",
      keywords: ["yoga mat", "exercise mat", "fitness mat", "training mat"],
    },
    { key: "treadmill", keywords: ["treadmill", "running machine", "cardio machine (treadmill)"] },
    {
      key: "stationary_bike",
      keywords: ["stationary bike", "exercise bike", "spin bike", "cycling bike"],
    },
    {
      key: "cable_machine",
      keywords: [
        "cable machine",
        "cable crossover",
        "functional trainer",
        "pulley machine",
      ],
    },
    {
      key: "smith_machine",
      keywords: ["smith machine", "guided bar", "smith rack"],
    },
    {
      key: "pullup_bar",
      keywords: ["pull-up bar", "pullup bar", "chin-up bar", "doorframe bar"],
    },
    {
      key: "medicine_ball",
      keywords: ["medicine ball", "med ball", "slam ball", "wall ball"],
    },
  ];

  for (const rule of rules) {
    for (const kw of rule.keywords) {
      if (text.includes(kw)) return rule.key;
    }
  }

  // As a last resort, match directly by key name
  for (const key of EQUIPMENT_KEYS) {
    if (text.includes(key.replace("_", " "))) return key;
  }

  return "unknown";
}

// Normalize confidence from model text -> "high" | "medium" | "low"
function normalizeConfidence(raw) {
  if (!raw || typeof raw !== "string") return "medium";
  const t = raw.toLowerCase();
  if (t.includes("high")) return "high";
  if (t.includes("medium")) return "medium";
  if (t.includes("low")) return "low";
  return "medium";
}

// Fallback recognition when no OPENAI_API_KEY is set
function fallbackRecognize(profile) {
  // Minimal but safe default
  const defaultKey = "dumbbell";

  const preferred =
    profile &&
    profile.availableEquipment &&
    Array.isArray(profile.availableEquipment) &&
    profile.availableEquipment.length > 0
      ? profile.availableEquipment[0]
      : defaultKey;

  const equipmentKey = EQUIPMENT_KEYS.includes(preferred) ? preferred : defaultKey;

  return {
    equipment_key: equipmentKey,
    equipment_label: equipmentKey.replace(/_/g, " "),
    confidence: "low",
    source: "fallback",
  };
}

// Call OpenAI Responses API with base64 image to classify equipment
async function recognizeWithOpenAI(imageBase64, profile) {
  if (!OPENAI_API_KEY) {
    // No key configured -> simple fallback
    return fallbackRecognize(profile || {});
  }

  const dataUrl = `data:image/jpeg;base64,${imageBase64}`;

  // Build a very constrained prompt so we get structured output
  const systemPrompt =
    "You are an AI that identifies gym and home workout equipment from photos. " +
    "Return ONLY a single line of JSON with the fields: " +
    '{ "equipment_label": string, "confidence": "high" | "medium" | "low" }. ' +
    "equipment_label should be short, like 'dumbbell', 'barbell', 'bench', 'kettlebell', " +
    "'resistance band', 'yoga mat', 'treadmill', 'stationary bike', 'cable machine', " +
    "'smith machine', 'pull-up bar', or 'medicine ball' when applicable.";

  const userPrompt =
    "Look at this image and identify the main piece of workout equipment in the frame. " +
    "Ignore people, background objects, and logos. " +
    "If you are unsure, pick the closest reasonable equipment_label and set confidence to 'low'.";

  // Node 18+ has global fetch
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: [
            { type: "input_text", text: userPrompt },
            {
              type: "input_image",
              image_url: dataUrl,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  const outputText = (json && json.output_text) || "";

  const match = outputText.match(/\{[\s\S]*\}/);
  let parsed;

  try {
    parsed = match ? JSON.parse(match[0]) : null;
  } catch {
    parsed = null;
  }

  const equipmentLabel =
    parsed && typeof parsed.equipment_label === "string"
      ? parsed.equipment_label
      : "unknown";
  const confidenceRaw =
    parsed && typeof parsed.confidence === "string"
      ? parsed.confidence
      : "medium";

  const equipmentKey = mapToEquipmentKeyFromLabel(equipmentLabel);
  const confidence = normalizeConfidence(confidenceRaw);

  return {
    equipment_key: equipmentKey,
    equipment_label: equipmentLabel,
    confidence,
    source: "openai",
  };
}

// Express app
const app = express();

app.use(
  cors({
    origin: "*",
  })
);
app.use(
  express.json({
    limit: "10mb",
  })
);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", openaiConfigured: !!OPENAI_API_KEY });
});

// Main recognition endpoint
app.post("/equipment/recognize", async (req, res) => {
  try {
    const { image_base64, profile } = req.body || {};

    if (!image_base64 || typeof image_base64 !== "string") {
      return res.status(400).json({
        error: "image_base64 (string) is required in request body",
      });
    }

    const result = await recognizeWithOpenAI(image_base64, profile || {});
    return res.json(result);
  } catch (err) {
    console.error("Recognition error:", err);
    return res.status(500).json({
      error: "Failed to recognize equipment",
      details: process.env.NODE_ENV === "development" ? String(err) : undefined,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`FitScan backend listening on http://localhost:${PORT}`);
  if (!OPENAI_API_KEY) {
    console.log(
      "WARNING: OPENAI_API_KEY is not set. Using fallback recognition (no real vision)."
    );
  }
});
