import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { firebase } from "../../firebase/config";

export default function SignUpScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone || !password) {
      Alert.alert("Missing details", "All fields (Full Name, Email, Phone, and Password) are mandatory.");
      return;
    }

    setLoading(true);

    try {
      // Create Firebase Auth account
      const userCredential = await firebase
        .auth()
        .createUserWithEmailAndPassword(trimmedEmail, password);

      const uid = userCredential.user.uid;

      const userData = {
        uid,
        email: trimmedEmail,
        name: trimmedName,
        role: "caregiver",
        phone: trimmedPhone,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      // Main users collection
      await firebase.firestore().collection("users").doc(uid).set(userData);

      // Caregiver role collection
      await firebase
        .firestore()
        .collection("caregivers")
        .doc(uid)
        .set(userData);

      Alert.alert("Success", "Caregiver account created successfully.");
    } catch (error) {
      console.log("Signup error:", error);
      Alert.alert("Signup Error", error.message);
    }

    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.cardContainer}>
        <Text style={styles.title}>Caregiver Sign Up</Text>
        <Text style={styles.subtitle}>Create your account to manage patients and wheelchairs.</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          placeholder="e.g. John Doe"
          value={fullName}
          onChangeText={setFullName}
          style={styles.input}
          placeholderTextColor="#b5b3b3"
        />

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          placeholder="e.g. caregiver@domain.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          placeholderTextColor="#b5b3b3"
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          placeholder="e.g. +1 555-0199"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
          placeholderTextColor="#b5b3b3"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          placeholder="Minimum 6 characters"
          value={password}
          secureTextEntry
          onChangeText={setPassword}
          style={styles.input}
          placeholderTextColor="#b5b3b3"
        />

        <TouchableOpacity
          onPress={handleSignUp}
          disabled={loading}
          style={[styles.button, loading && styles.buttonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Register Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.linkText}>Already have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    backgroundColor: "#dcf1f2",
    paddingVertical: 40,
  },
  cardContainer: {
    marginHorizontal: 20,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#162033",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#687386",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3d4b63",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    color: "#1e293b",
    marginBottom: 10,
  },
  button: {
    alignItems: "center",
    backgroundColor: "#1463ff",
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
    shadowColor: "#1463ff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: "#a0bbfd",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  linkText: {
    color: "#1463ff",
    fontWeight: "600",
    marginTop: 20,
    textAlign: "center",
  },
});
