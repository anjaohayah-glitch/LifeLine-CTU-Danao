import { Button, ScrollView, StyleSheet, Text } from 'react-native';

export default function TermsScreen({ navigation }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Terms & Conditions</Text>

      <Text style={styles.text}>
        Welcome to LIFELINE. By using this application, you agree to the following terms and conditions:
        {"\n\n"}
        1. This app is for disaster preparedness and emergency notifications for students.
        {"\n\n"}
        2. Your personal data will be securely stored in Firebase and used only for emergency purposes.
        {"\n\n"}
        3. You must not misuse this application or provide false information.
        {"\n\n"}
        4. The developers are not responsible for any damages resulting from misinterpretation of alerts.
        {"\n\n"}
        5. You must agree to these terms to use the registration and login features.
      </Text>

      <Button title="Back" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow:1, padding:20, justifyContent:'flex-start' },
  title: { fontSize:24, fontWeight:'bold', marginBottom:20, textAlign:'center' },
  text: { fontSize:16, lineHeight:24, marginBottom:20 }
});