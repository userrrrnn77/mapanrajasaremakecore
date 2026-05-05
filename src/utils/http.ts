export const groqFetch = async (endpoint: string, options: RequestInit) => {
  const url = `https://api.groq.com/openai/v1${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`, // masalahnya di sini gw pake groq yang dari config bre jadinya [object object] bukan isian env gw taik
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
