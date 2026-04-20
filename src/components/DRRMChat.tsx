import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";
import { ChatMessage, sendDRRMChatMessage } from "@/features/common/operations";

export function DRRMChat() {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Add a welcome message if the chat is opened for the first time
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: "Hello! I am your QRelief DRRM Assistant. How can I help you with disaster preparedness or relief protocols today?",
        },
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: inputText.trim() };
    const nextMessages = [...messages, userMessage];
    
    setMessages(nextMessages);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await sendDRRMChatMessage(nextMessages);
      
      // If the function returned an error payload inside a 200 response
      if ((response as any).error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Service Error: ${(response as any).error}`,
          },
        ]);
      } else {
        setMessages((prev) => [...prev, response]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Connection failed. Please check your internet or device time.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <Pressable
        onPress={() => setIsOpen(true)}
        style={[
          styles.fab,
          { bottom: insets.bottom + 80, right: 20 },
          theme.shadow,
        ]}
      >
        <Ionicons name="chatbubble-ellipses" size={28} color="#fff" />
      </Pressable>

      {/* Chat Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <View style={styles.aiBadge}>
                <Ionicons name="shield-checkmark" size={14} color={theme.colors.primary} />
                <Text style={styles.aiBadgeText}>DRRM EXPERT</Text>
              </View>
              <Text style={styles.headerTitle}>QRelief Assistant</Text>
            </View>
            <Pressable onPress={() => setIsOpen(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </Pressable>
          </View>

          {/* Messages List */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.map((msg, index) => (
              <View
                key={index}
                style={[
                  styles.messageRow,
                  msg.role === "user" ? styles.userRow : styles.assistantRow,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    msg.role === "user" ? styles.userBubble : styles.assistantBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      msg.role === "user" ? styles.userText : styles.assistantText,
                    ]}
                  >
                    {msg.content}
                  </Text>
                </View>
              </View>
            ))}
            {isLoading && (
              <View style={styles.assistantRow}>
                <View style={[styles.messageBubble, styles.assistantBubble]}>
                  <Text style={styles.assistantText}>Thinking...</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input Area */}
          <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about emergency protocols..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              maxLength={1000}
            />
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  headerTitleContainer: {
    gap: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.text,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: "flex-start",
    gap: 4,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.successText,
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 4,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    gap: 16,
  },
  messageRow: {
    flexDirection: "row",
    width: "100%",
  },
  userRow: {
    justifyContent: "flex-end",
  },
  assistantRow: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "85%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: theme.radii.md,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: "#fff",
    fontWeight: "600",
  },
  assistantText: {
    color: theme.colors.text,
  },
  inputArea: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.radii.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.inputBorder,
  },
});
