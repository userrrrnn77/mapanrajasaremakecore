/**
 * Role yang tersedia dalam percakapan AI
 */
export type MessageRole = "system" | "user" | "assistant" | "tool";

/**
 * Format satu pesan dalam chat (Standard OpenAI/Groq format)
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
  name?: string;

  // 🔥 tambahan overkill
  id?: string;
  createdAt?: Date;

  metadata?: {
    model?: string;
    provider?: string;

    latencyMs?: number;
    finishReason?: string;
  };

  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };

  toolCalls?: {
    name: string;
    args: Record<string, any>;
    result?: any;
  }[];

  embedding?: number[];
}
/**
 * Struktur mentah response dari API AI (Groq/OpenAI)
 * Berguna kalau lu butuh data meta seperti usage/token
 */
export interface AIResponse {
  id: string;
  object: string;
  created: number;
  model: string;

  choices: {
    index: number;
    message: ChatMessage;
    logprobs: any;
    finish_reason: "stop" | "length" | "tool_calls";
  }[];

  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
/**
 * Response yang sudah dibersihkan (Unified)
 * Ini yang bakal dikirim ke Frontend atau disimpan ke DB
 */
export interface UnifiedResponse {
  success: boolean;

  content: string;
  model: string;
  provider: string;

  usage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens: number;
  };

  finishReason?: string;

  toolCalls?: {
    name: string;
    args: Record<string, any>;
    result?: any;
  }[];

  latency?: number;

  error?: string;
}

export interface ChatHistory {
  userId: string;
  threadId: string;

  title?: string;

  // 🔥 config AI per thread
  config?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };

  // 🔥 memory system
  memory?: {
    summary?: string;
    lastUpdated?: Date;
  };

  // 🔥 statistik
  stats?: {
    totalMessages: number;
    totalTokens: number;
  };

  // ⚠️ OPTIONAL (deprecated nanti)
  messages?: ChatMessage[];

  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessageDocument {
  threadId: string;
  userId: string;

  role: MessageRole;
  content: string;

  metadata?: {
    model?: string;
    provider?: string;
    latencyMs?: number;
  };

  usage?: {
    totalTokens?: number;
  };

  embedding?: number[];

  createdAt: Date;
}

export interface MemoryDocument {
  userId: string;

  content: string;
  embedding: number[];

  importance: number; // 1 - 10

  createdAt: Date;
}

export interface ChatRequest {
  userId: string;
  threadId: string;

  message: string;
}