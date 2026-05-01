import { groq } from "../config/groq.js";

export const groqFetch = async (endpoint: string, options: RequestInit) => {
  const url = `${process.env.GROQ_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${groq}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData: any = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `HTTP Error: ${response.status}`,
    );
  }

  return response.json();
};
