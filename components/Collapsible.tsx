import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function Collapsible({ title, children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <View>
      <TouchableOpacity onPress={() => setIsCollapsed(!isCollapsed)}>
        <Text style={styles.title}>{title}</Text>
      </TouchableOpacity>
      {!isCollapsed && <View>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10,
  },
});
