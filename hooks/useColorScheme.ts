import { useColorScheme as _useColorScheme } from "react-native";
import { useMMKVString } from "react-native-mmkv";
import { storage } from "../storage/mmkv";

export default function useColorScheme() {
  const [preferredTheme] = useMMKVString("user.theme", storage); // e.g., 'light', 'dark', or undefined
  const systemScheme = _useColorScheme();
  return preferredTheme || (systemScheme === "dark" ? "dark" : "light");
}