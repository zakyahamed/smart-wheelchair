import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { firebase } from "../../firebase/config";

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("patient");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    setLoading(true);

    try {
      // Create Firebase Auth account
      const userCredential = await firebase
        .auth()
        .createUserWithEmailAndPassword(email.trim(), password);

      const uid = userCredential.user.uid;

      const userData = {
        uid,
        email: email.trim(),
        role,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      // Main users collection
      await firebase.firestore().collection("users").doc(uid).set(userData);

      // Role-specific collection
      if (role === "patient") {
        await firebase
          .firestore()
          .collection("patients")
          .doc(uid)
          .set({
            ...userData,
            activeRequest: null,
            assignedWheelchair: null,
          });
      }

      if (role === "caregiver") {
        await firebase
          .firestore()
          .collection("caregivers")
          .doc(uid)
          .set({
            ...userData,
          });
      }

      Alert.alert("Success", "Account created successfully.");
    } catch (error) {
      console.log(error);
      Alert.alert("Signup Error", error.message);
    }

    setLoading(false);
  };

  return (
    <View style={{ padding: 20, marginTop: 60 }}>
      <Text style={{ fontSize: 22, marginBottom: 20 }}>Register</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
        placeholderTextColor="#999"
      />

      <TextInput
        placeholder="Password"
        value={password}
        secureTextEntry
        onChangeText={setPassword}
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
        placeholderTextColor="#999"
      />

      {/* ROLE SELECTOR */}
      <Text style={{ marginTop: 10, marginBottom: 5 }}>Select Role:</Text>

      <TouchableOpacity onPress={() => setRole("patient")}>
        <Text style={{ padding: 10 }}>
          {role === "patient" ? "🔘" : "⚪"} Patient
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setRole("caregiver")}>
        <Text style={{ padding: 10 }}>
          {role === "caregiver" ? "🔘" : "⚪"} Caregiver
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleSignUp}
        disabled={loading}
        style={{
          backgroundColor: loading ? "gray" : "blue",
          padding: 12,
          marginTop: 20,
          alignItems: "center",
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "white" }}>Sign Up</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={{ color: "blue", marginTop: 18, textAlign: "center" }}>
          Already have an account? Login
        </Text>
      </TouchableOpacity>
    </View>
  );
}
