// screens/HomeScreen.js
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { auth } from '../firebase';

export default function HomeScreen({ navigation }) {
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Get the currently logged-in user
    const user = auth.currentUser;
    if (user) {
      setUserEmail(user.email); // or user.displayName if you store a name
    } else {
      // No user? Go back to Login
      navigation.replace('Login');
    }
  }, []);

  const logout = () => {
    signOut(auth).then(() => navigation.replace('Login'));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Welcome, {userEmail ? userEmail : 'user'}!
      </Text>
      <Text style={styles.subtitle}>You are now logged in.</Text>
      <Button title="Logout" onPress={logout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, justifyContent:'center', alignItems:'center', padding:20 },
  title: { fontSize:24, fontWeight:'bold', marginBottom:10, textAlign:'center' },
  subtitle: { fontSize:16, marginBottom:20, textAlign:'center' }
});