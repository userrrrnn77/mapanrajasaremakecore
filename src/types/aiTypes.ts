export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: MessageRole;
  content: string;
  name?: string;

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

  config?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };

  memory?: {
    summary?: string;
    lastUpdated?: Date;
  };

  stats?: {
    totalMessages: number;
    totalTokens: number;
  };

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

  importance: number;

  createdAt: Date;
}

export interface ChatRequest {
  userId: string;
  threadId: string;

  message: string;
}
