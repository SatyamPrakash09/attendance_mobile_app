import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Animated,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { queryAI } from "../lib/api";
import { getUid } from "../lib/storage";
import { chatHistory } from "../lib/chatHistory";
import { COLORS } from "../constants/colors";

const SUGGESTIONS = [
  "What is my attendance today?",
  "Summarize my monthly stats",
  "How many holidays this month?",
  "Am I meeting the threshold?",
];

const AiChat = () => {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState(chatHistory.getMessages());
  const scrollViewRef = useRef(null);

  // Typing dot animations
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!loading) {
      dot1.setValue(0.3);
      dot2.setValue(0.3);
      dot3.setValue(0.3);
      return;
    }
    const makeAnim = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    const a1 = makeAnim(dot1, 0);
    const a2 = makeAnim(dot2, 150);
    const a3 = makeAnim(dot3, 300);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [loading, dot1, dot2, dot3]);

  const handleAskAi = async (textOverride) => {
    const textToSend = typeof textOverride === 'string' ? textOverride : query;
    if (!textToSend.trim()) return;

    const userMsg = { id: Date.now().toString(), text: textToSend, isAi: false };
    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setLoading(true);

    try {
      const uid = await getUid();
      const response = await queryAI(uid, textToSend);
      let responseText = "";
      if (typeof response === "string") {
        responseText = response;
      } else if (response) {
        responseText =
          response.answer ||
          response.response ||
          response.message ||
          response.reply ||
          response.data ||
          JSON.stringify(response);
      } else {
        responseText = "I received an empty response from the server.";
      }
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), text: responseText, isAi: true },
      ]);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "An unknown error occurred.";
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: `Sorry, I encountered an error: ${errorMessage}`,
          isAi: true,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chatHistory.setMessages(messages);
  }, [messages]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  const renderMessage = useCallback((msg) => {
    const isAi = msg.isAi;
    return (
      <View key={msg.id} style={isAi ? styles.aiWrapper : styles.userWrapper}>
        {isAi && (
          <View style={styles.botLabelContainer}>
             <Text style={styles.botLabel}>Onix Assistant</Text>
          </View>
        )}
        <View style={styles.messageContentRow}>
          {isAi && (
            <Image 
              source={require("../assets/images/onix_avatar.png")} 
              style={styles.messageAvatar} 
            />
          )}
          <View
            style={[
              styles.messageBubble,
              isAi ? styles.aiBubble : styles.userBubble,
              msg.isError && styles.errorBubble,
            ]}
          >
            <Text style={[styles.messageText, isAi ? styles.aiText : styles.userText]}>
              {msg.text}
            </Text>
          </View>
        </View>
      </View>
    );
  }, []);

  const showIntro = messages.length === 1 && !loading;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Support Assistant</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "padding"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatArea}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {showIntro && (
              <View style={styles.introContainer}>
                <Image 
                  source={require("../assets/images/onix_avatar.png")} 
                  style={styles.largeAvatar} 
                />
                <Text style={styles.introTitle}>Hi, I&apos;m Onix.</Text>
                <Text style={styles.introSubtitle}>How can I help you today?</Text>
              </View>
            )}

            {messages.length > 1 && messages.map(renderMessage)}
            
            {loading && (
              <View style={styles.aiWrapper}>
                <View style={styles.botLabelContainer}>
                   <Text style={styles.botLabel}>Onix is typing...</Text>
                </View>
                <View style={styles.messageContentRow}>
                  <Image 
                    source={require("../assets/images/onix_avatar.png")} 
                    style={styles.messageAvatar} 
                  />
                  <View style={[styles.messageBubble, styles.aiBubble, styles.loadingBubble]}>
                    <View style={styles.typingContainer}>
                      {[dot1, dot2, dot3].map((dot, i) => (
                        <Animated.View
                          key={i}
                          style={[
                            styles.typingDot,
                            i === 1 && { marginHorizontal: 4 },
                            { opacity: dot },
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Suggestions */}
          {showIntro && (
            <View style={styles.suggestionsContainer}>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
                  {SUGGESTIONS.map((s, idx) => (
                    <Pressable key={idx} style={styles.suggestionChip} onPress={() => handleAskAi(s)}>
                      <Text style={styles.suggestionText}>{s}</Text>
                    </Pressable>
                  ))}
               </ScrollView>
            </View>
          )}

          {/* Input Area */}
          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Ask a question..."
                placeholderTextColor={COLORS.textMuted}
                value={query}
                onChangeText={setQuery}
                multiline
                textAlignVertical="top"
                maxLength={1000}
              />
              <Pressable
                onPress={() => handleAskAi()}
                disabled={loading || !query.trim()}
                style={[styles.sendButton, (loading || !query.trim()) && styles.sendButtonDisabled]}
              >
                <Ionicons name="arrow-up" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 20,
    flexGrow: 1,
  },
  introContainer: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  largeAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 17,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  aiWrapper: {
    alignSelf: "flex-start",
    marginBottom: 20,
    maxWidth: "85%",
  },
  userWrapper: {
    alignSelf: "flex-end",
    marginBottom: 20,
    maxWidth: "85%",
  },
  botLabelContainer: {
    marginLeft: 40,
    marginBottom: 4,
  },
  botLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  messageContentRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageBubble: {
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  aiBubble: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userBubble: {
    backgroundColor: COLORS.cardAlt,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  errorBubble: {
    borderColor: "#FF3B30",
    backgroundColor: "#FFF5F5",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.textPrimary,
  },
  aiText: {
    color: COLORS.textPrimary,
  },
  userText: {
    color: COLORS.textPrimary,
  },
  loadingBubble: {
    minWidth: 60,
    alignItems: "center",
    justifyContent: "center",
    height: 40,
  },
  typingContainer: {
    flexDirection: "row",
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#7C3AED",
  },
  suggestionsContainer: {
    paddingVertical: 12,
  },
  suggestionsScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  suggestionChip: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  attachButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    maxHeight: 120,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 10,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#E5E5EA",
  },
});

export default AiChat;