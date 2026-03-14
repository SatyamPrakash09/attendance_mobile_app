import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
import {
    registerBackgroundFetch,
    requestNotificationPermission,
    scheduleDailyReminder,
    unregisterBackgroundFetch,
} from "../../lib/notifications";
import {
    clearSession,
    getBackendUrl,
    getUid,
    getUser,
    saveBackendUrl,
} from "../../lib/storage";

// Height of the floating tab bar + its bottom offset
const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 84 : 64;
const TAB_BAR_BOTTOM = 30; // matches bottom:30 in _layout.jsx
const SCROLL_BOTTOM_PADDING = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM + 16;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [uid, setUid] = useState(null);
  const [backendUrl, setBackendUrl] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [urlSaving, setUrlSaving] = useState(false);
  const [urlSaved, setUrlSaved] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const storedUser = await getUser();
      const storedUid = await getUid();
      const storedUrl = await getBackendUrl();
      setUser(storedUser);
      setUid(storedUid);
      setBackendUrl(storedUrl);
      setUrlInput(storedUrl);
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      setNotifEnabled(scheduled.length > 0);
    }
    load();
  }, []);

  async function handleSaveUrl() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setUrlSaving(true);
    try {
      await saveBackendUrl(trimmed);
      setBackendUrl(trimmed);
      setUrlSaved(true);
      setTimeout(() => setUrlSaved(false), 2000);
    } finally {
      setUrlSaving(false);
    }
  }

  async function handleToggleNotifications(value) {
    setNotifLoading(true);
    try {
      if (value) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          Alert.alert(
            "Permission Required",
            "Enable notifications in device settings.",
          );
          return;
        }
        await scheduleDailyReminder();
        await registerBackgroundFetch();
        setNotifEnabled(true);
      } else {
        await unregisterBackgroundFetch();
        setNotifEnabled(false);
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setNotifLoading(false);
    }
  }

  async function handleLogout() {
    Alert.alert(
      "Logout",
      "You'll need to paste your dashboard URL again to sign in.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await clearSession();
            router.replace("/(auth)/login");
          },
        },
      ],
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: SCROLL_BOTTOM_PADDING + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Gradient header + avatar */}
        <LinearGradient
          colors={["#2d1250", "#1a0a2e", COLORS.bg]}
          style={styles.headerGrad}
        >
          <View style={styles.avatarRow}>
            <LinearGradient
              colors={[COLORS.primaryDark, COLORS.primary]}
              style={styles.avatarCircle}
            >
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || "?"}
              </Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.avatarName}>{user?.name || "Unknown"}</Text>
              <View style={styles.sectionRow}>
                <Ionicons
                  name="book-outline"
                  size={13}
                  color={COLORS.primaryLight}
                />
                <Text style={styles.avatarSection}>
                  {" "}
                  {user?.Section || "No section"}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Account Details */}
        <Card title="Account Details" icon="person-circle-outline">
          <InfoRow icon="person-outline" label="Name" value={user?.name} />
          <InfoRow icon="book-outline" label="Section" value={user?.Section} />
          <InfoRow icon="mail-outline" label="Email" value={user?.email} />
          <InfoRow
            icon="key-outline"
            label="User ID"
            value={uid ? `${uid.slice(0, 4)}••••${uid.slice(-4)}` : null}
            mono
            last
          />
        </Card>

        {/* Server Config */}
        <Card title="Server Configuration" icon="server-outline">
          <Text style={styles.urlHint}>Backend URL (no trailing slash)</Text>
          <TextInput
            style={styles.urlInput}
            value={urlInput}
            onChangeText={(t) => {
              setUrlInput(t);
              setUrlSaved(false);
            }}
            placeholder="https://your-backend.onrender.com"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={handleSaveUrl}
            disabled={urlSaving}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={
                urlSaved
                  ? [COLORS.present, "#16a34a"]
                  : [COLORS.primaryDark, COLORS.primary]
              }
              style={styles.saveBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {urlSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={styles.saveBtnContent}>
                  <Ionicons
                    name={urlSaved ? "checkmark-circle" : "save-outline"}
                    size={16}
                    color="#fff"
                  />
                  <Text style={styles.saveBtnText}>
                    {" "}
                    {urlSaved ? "Saved!" : "Save URL"}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.currentUrl} numberOfLines={1}>
            {backendUrl}
          </Text>
        </Card>

        {/* Notifications */}
        <Card title="Notifications" icon="notifications-outline">
          <View style={styles.notifRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.notifLabel}>Daily Reminder (9:30 AM)</Text>
              <Text style={styles.notifSub}>
                Alerts you to mark attendance every morning
              </Text>
            </View>
            {notifLoading ? (
              <ActivityIndicator color={COLORS.primary} size="small" />
            ) : (
              <Switch
                value={notifEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={notifEnabled ? COLORS.primaryLight : COLORS.neutral}
              />
            )}
          </View>
          <View
            style={[
              styles.notifRow,
              { borderBottomWidth: 0, paddingBottom: 0 },
            ]}
          >
            <Ionicons
              name="flash-outline"
              size={20}
              color={COLORS.holiday}
              style={{ width: 26 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.notifLabel}>Keep-Alive Ping (9:29 AM)</Text>
              <Text style={styles.notifSub}>
                Pings server 1 min early so it is ready
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: notifEnabled ? "#052e16" : COLORS.surface },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: notifEnabled ? COLORS.present : COLORS.textMuted },
                ]}
              >
                {notifEnabled ? "ON" : "OFF"}
              </Text>
            </View>
          </View>
        </Card>

        {/* App Info */}
        <Card title="App Info" icon="information-circle-outline">
          <InfoRow
            icon="phone-portrait-outline"
            label="Version"
            value="1.0.0"
          />
          <InfoRow
            icon="server-outline"
            label="Backend"
            value="MongoDB + Express"
          />
          <Pressable>
            <InfoRow
              icon="logo-android"
              label="Bot"
              value="@Attendance009bot"
              last
            />
          </Pressable>
        </Card>

        {/* Logout */}
        <TouchableOpacity onPress={handleLogout} activeOpacity={0.85}>
          <LinearGradient
            colors={["#200000", "#450a0a"]}
            style={styles.logoutBtn}
          >
            <Ionicons name="log-out-outline" size={20} color={COLORS.absent} />
            <Text style={styles.logoutText}> Logout</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Card({ title, icon, children }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <Ionicons name={icon} size={14} color={COLORS.textMuted} />
        <Text style={styles.cardTitle}> {title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoRow({ icon, label, value, mono, last }) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Ionicons
        name={icon}
        size={18}
        color={COLORS.textMuted}
        style={{ width: 24 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, mono && styles.infoMono]}>
          {value || "—"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingBottom: SCROLL_BOTTOM_PADDING },
  headerGrad: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  avatarText: { fontSize: 30, fontWeight: "900", color: "#fff" },
  avatarName: { fontSize: 22, fontWeight: "800", color: COLORS.textPrimary },
  sectionRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  avatarSection: { fontSize: 13, color: COLORS.primaryLight },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: { fontSize: 11, color: COLORS.textMuted },
  infoValue: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: "500",
    marginTop: 1,
  },
  infoMono: { fontFamily: "monospace", fontSize: 13, letterSpacing: 1 },
  urlHint: { fontSize: 12, color: COLORS.textMuted, marginBottom: 10 },
  urlInput: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 12,
    padding: 12,
    color: COLORS.textPrimary,
    backgroundColor: "rgba(255,255,255,0.03)",
    fontSize: 13,
    marginBottom: 10,
  },
  saveBtn: {
    borderRadius: 12,
    padding: 13,
    alignItems: "center",
    marginBottom: 8,
  },
  saveBtnContent: { flexDirection: "row", alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "700" },
  currentUrl: { fontSize: 11, color: COLORS.textMuted },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 4,
  },
  notifLabel: { fontSize: 14, color: COLORS.textPrimary, fontWeight: "500" },
  notifSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  logoutBtn: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.absent,
  },
  logoutText: { color: COLORS.absent, fontWeight: "700", fontSize: 16 },
});
