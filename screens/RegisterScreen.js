// screens/RegisterScreen.js
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { Alert, Button, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { auth } from '../firebase';

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);

  const register = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in both fields');
      return;
    }
    if (!agreed) {
      Alert.alert('Terms Not Accepted', 'You must agree to the Terms & Conditions.');
      return;
    }

    createUserWithEmailAndPassword(auth, email, password)
      .then(() => {
        Alert.alert('Success', 'Account Created!');
        navigation.replace('Login');
      })
      .catch(error => Alert.alert('Registration Error', error.message));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LIFELINE Registration</Text>
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

      <View style={styles.termsContainer}>
        <Switch value={agreed} onValueChange={setAgreed} />
        <Text style={styles.termsText}>I agree to the Terms & Conditions</Text>
      </View>

      <Button title="Register" onPress={register} />
      <Button title="Back to Login" onPress={() => navigation.navigate('Login')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, justifyContent:'center', padding:20 },
  input: { borderWidth:1, marginBottom:10, padding:10, borderRadius:5 },
  title: { fontSize:24, fontWeight:'bold', marginBottom:20, textAlign:'center' },
  termsContainer: { flexDirection:'row', alignItems:'center', marginBottom:20 },
  termsText: { marginLeft:10 }
});