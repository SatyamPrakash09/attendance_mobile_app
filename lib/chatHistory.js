/**
 * Simple in-memory singleton to store chat history during an active app session.
 * This will be lost when the app process is killed.
 */

let messages = [
  {
    id: "1",
    text: "Hello! I'm Onix, your AI attendance assistant. How can I help you today?",
    isAi: true,
  },
];

export const chatHistory = {
  getMessages: () => messages,
  setMessages: (newMessages) => {
    messages = newMessages;
  },
  addMessage: (message) => {
    messages.push(message);
  },
  clear: () => {
    messages = [
      {
        id: "1",
        text: "Hello! I'm Onix, your AI attendance assistant. How can I help you today?",
        isAi: true,
      },
    ];
  },
};
