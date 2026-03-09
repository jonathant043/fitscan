import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>This screen doesn't exist.</Text>
      <Link href="/" style={styles.link}>
        Go to home screen!
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020817",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    color: "#F9FAFB",
    marginBottom: 8,
  },
  link: {
    color: "#0EA5E9",
    fontSize: 16,
    fontWeight: "600",
  },
});
