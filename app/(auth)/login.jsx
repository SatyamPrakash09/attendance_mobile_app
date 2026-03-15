import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { COLORS } from "../../constants/colors";
import { getBackendUrl, saveSession } from "../../lib/storage";

export default function LoginScreen() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function extractUID(inputUrl) {
    try {
      const parsed = new URL(inputUrl.trim());
      return parsed.searchParams.get("uid");
    } catch {
      return null;
    }
  }

  async function handleLogin() {
    setError("");
    const uid = extractUID(url);
    Keyboard.dismiss();
    if (!uid) {
      setError("Invalid URL. Make sure it contains ?uid=...");
      return;
    }
    setLoading(true);
    try {
      const baseURL = await getBackendUrl();
      const res = await axios.get(`${baseURL}/user?userId=${uid}`, {
        timeout: 10000,
      });
      await saveSession(uid, res.data);
      router.replace("/(tabs)/home");
    } catch (err) {
      if (err.response?.status === 404) {
        setError("Not registered. Please register via Telegram first.");
      } else if (err.code === "ECONNABORTED") {
        setError("Request timed out. Check your backend URL.");
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}

    >
    {/* <TouchableWithoutFeedback onPress={Keyboard.dismiss}> */}
        <LinearGradient
          colors={["#1a0a2e", "#0F0E17", "#0F0E17"]}
          style={StyleSheet.absoluteFill}
        />

        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoArea}>
            <LinearGradient
              colors={[COLORS.primaryDark, COLORS.primary]}
              style={styles.logoCircle}
            >
              <Ionicons name="clipboard" size={38} color="#fff" />
            </LinearGradient>
            <Text style={styles.appName}>Attendance</Text>
            <Text style={styles.tagline}>Track your days, effortlessly.</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardSub}>
              Paste your Telegram dashboard URL to sign in
            </Text>

            {/* Hint */}
            <View style={styles.hintBox}>
              <View style={styles.hintTitleRow}>
                <Ionicons
                  name="bulb-outline"
                  size={13}
                  color={COLORS.primaryLight}
                />
                <Text style={styles.hintTitle}> Your URL looks like:</Text>
              </View>
              <Text style={styles.hintUrl}>
                https://attendance-09.vercel.app/?uid=11••••47
              </Text>
            </View>

            {/* Input */}
            <View
              style={[styles.inputWrap, error ? styles.inputWrapError : null]}
            >
              <Ionicons
                name="link-outline"
                size={18}
                color={COLORS.textMuted}
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={styles.input}
                placeholder="Paste your dashboard URL here"
                placeholderTextColor={COLORS.textMuted}
                value={url}
                onChangeText={(t) => {
                  setUrl(t);
                  setError("");
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons
                  name="warning-outline"
                  size={14}
                  color={COLORS.absent}
                />
                <Text style={styles.errorText}> {error}</Text>
                {error.includes("Telegram") && (
                  <TouchableOpacity
                    style={styles.telegramBtn}
                    onPress={() =>
                      Linking.openURL("https://t.me/Attendance009bot")
                    }
                  >
                    <Ionicons name="paper-plane-outline" size={16} color="#fff" />
                    <Text style={styles.telegramBtnText}> Open Telegram Bot</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            {/* Button */}
            <TouchableOpacity
              style={styles.btnWrap}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={
                  loading
                    ? [COLORS.neutral, COLORS.neutral]
                    : [COLORS.primaryDark, COLORS.primaryLight]
                }
                style={styles.btn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.btnContent}>
                    <Text style={styles.btnText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <Ionicons
              name="information-circle-outline"
              size={13}
              color={COLORS.textMuted}
            />
            <Text style={styles.footer}>
              {" "}
              Registered via Telegram? Your UID is in the bot dashboard link.
            </Text>
          </View>
        </ScrollView>
      
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingVertical: 60,
  },
  logoArea: { alignItems: "center", marginBottom: 36 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  appName: {
    fontSize: 34,
    fontWeight: "900",
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  tagline: { fontSize: 14, color: COLORS.textSecondary, marginTop: 6 },
  card: {
    backgroundColor: "rgba(26,26,46,0.95)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.3)",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  hintBox: {
    backgroundColor: COLORS.overlay,
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  hintTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  hintTitle: { color: COLORS.primaryLight, fontSize: 12, fontWeight: "600" },
  hintUrl: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginBottom: 14,
  },
  inputWrapError: { borderColor: COLORS.absent },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingVertical: 10,
  },
  errorBox: { marginBottom: 14, gap: 6 },
  errorText: { color: COLORS.absent, fontSize: 13, flexShrink: 1 },
  telegramBtn: {
    backgroundColor: "#229ED9",
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  telegramBtnText: { color: "#fff", fontWeight: "bold" },
  btnWrap: { borderRadius: 14, overflow: "hidden" },
  btn: { padding: 16, alignItems: "center" },
  btnContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    paddingHorizontal: 10,
  },
  footer: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 1,
  },
});
