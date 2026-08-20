const MAX_MESSAGES = 20;
const TTL_MS = 2 * 60 * 60 * 1000;

export type StoredMessage = {
  role: "user" | "model";
  text: string;
};

type Conversation = {
  messages: StoredMessage[];
  updatedAt: number;
};

const conversations = new Map<string, Conversation>();

export const conversationStore = {
  get(chatId: string): StoredMessage[] {
    const conv = conversations.get(chatId);
    if (!conv) return [];
    if (Date.now() - conv.updatedAt > TTL_MS) {
      conversations.delete(chatId);
      return [];
    }
    return conv.messages;
  },

  append(chatId: string, message: StoredMessage) {
    const conv = conversations.get(chatId) ?? { messages: [], updatedAt: 0 };
    conv.messages.push(message);
    if (conv.messages.length > MAX_MESSAGES) {
      conv.messages = conv.messages.slice(-MAX_MESSAGES);
    }
    conv.updatedAt = Date.now();
    conversations.set(chatId, conv);
  },

  reset(chatId: string) {
    conversations.delete(chatId);
  },
};
