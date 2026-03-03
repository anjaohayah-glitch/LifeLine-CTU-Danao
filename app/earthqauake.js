import { ScrollView, StyleSheet, Text } from "react-native";
import { COLORS } from "../constants/colors";

export default function Earthquake() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🌎 Earthquake Safety Guide</Text>

      <Text style={styles.content}>
        BEFORE:
        {"\n"}• Secure heavy furniture.
        {"\n"}• Prepare emergency kit.
        {"\n"}• Identify safe spots (under tables).
        
        {"\n\n"}DURING:
        {"\n"}• Drop, Cover, and Hold.
        {"\n"}• Stay away from windows.
        {"\n"}• Do not use elevators.

        {"\n\n"}AFTER:
        {"\n"}• Check for injuries.
        {"\n"}• Expect aftershocks.
        {"\n"}• Follow campus emergency instructions.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 20,
  },
  content: {
    fontSize: 16,
    color: COLORS.textDark,
    lineHeight: 24,
  },
});