// components/EmailCaptureModal.tsx
import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { captureEmail } from "../lib/api";

const STORAGE_KEY = "fitscan:emailCaptured";

export async function shouldShowEmailCapture(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    return val === null; // show only if never captured/dismissed
  } catch {
    return false;
  }
}

export async function markEmailCaptured(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, "1");
  } catch {}
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export default function EmailCaptureModal({ visible, onDismiss }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async () => {
    if (!isValidEmail) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await captureEmail(email.trim().toLowerCase());
      await markEmailCaptured();
      setDone(true);
      setTimeout(onDismiss, 1800);
    } catch {
      await markEmailCaptured(); // don't retry — dismiss regardless
      onDismiss();
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await markEmailCaptured();
    onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSkip}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          {done ? (
            <>
              <Text style={styles.icon}>✓</Text>
              <Text style={styles.title}>You're on the list!</Text>
              <Text style={styles.subtitle}>We'll let you know when cloud sync goes live.</Text>
            </>
          ) : (
            <>
              <Text style={styles.icon}>☁</Text>
              <Text style={styles.title}>Save your workouts</Text>
              <Text style={styles.subtitle}>
                Enter your email to sync your workout history across devices when we launch cloud accounts.
              </Text>

              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                placeholder="your@email.com"
                placeholderTextColor="#6B7280"
                value={email}
                onChangeText={(t) => { setEmail(t); setError(""); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.primaryBtn, (!isValidEmail || loading) && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={!isValidEmail || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Save my spot</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                <Text style={styles.skipText}>Not now</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#0D1526",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: "#1F2937",
    alignItems: "center",
  },
  icon: {
    fontSize: 40,
    marginBottom: 12,
    color: "#2563EB",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  input: {
    width: "100%",
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#F9FAFB",
    fontSize: 15,
    marginBottom: 8,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  primaryBtn: {
    width: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 10,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipText: {
    color: "#6B7280",
    fontSize: 14,
  },
});
