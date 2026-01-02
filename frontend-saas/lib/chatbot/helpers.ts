export type ChatConversation = any;
export type ChatMessage = any;
export type FaqEmbedding = any;
export type ChatbotResponseCache = any;

export interface FAQSearchResult extends FaqEmbedding {
  similarity: number;
}

export async function createEmbedding(_text: string): Promise<number[]> {
  return [];
}

export async function searchFAQs(
  _query: string,
  _options: { limit?: number; minSimilarity?: number; category?: string } = {}
): Promise<FAQSearchResult[]> {
  return [];
}

export async function searchFAQsByKeyword(_keyword: string, _limit: number = 5): Promise<FaqEmbedding[]> {
  return [];
}

export async function createConversation(_userId: number, _pageContext?: string): Promise<ChatConversation> {
  return {} as any;
}

export async function getConversation(_conversationId: number): Promise<ChatConversation | undefined> {
  return undefined;
}

export async function getRecentConversation(_userId: number): Promise<ChatConversation | undefined> {
  return undefined;
}

export async function saveMessage(
  _conversationId: number,
  _role: 'user' | 'assistant' | 'system' | 'function',
  _content: string,
  _extras?: any
): Promise<ChatMessage> {
  return {} as any;
}

export async function getConversationHistory(_conversationId: number, _limit: number = 10): Promise<ChatMessage[]> {
  return [];
}

export function formatMessagesForOpenAI(messages: ChatMessage[]): Array<{ role: string; content: string }> {
  return (messages || []).map((msg: any) => ({ role: msg?.role || '', content: msg?.content || '' }));
}

export function createSystemPrompt(_pageContext?: string, _faqs?: FAQSearchResult[]): string {
  return '';
}

export function estimateTokens(text: string): number {
  return (text || '').length;
}

export function calculateCost(_inputTokens: number, _outputTokens: number): number {
  return 0;
}

export function generateQuestionHash(_question: string): string {
  return '';
}

export function analyzeQuestionType(_question: string): 'FAQ' | 'GENERAL' | 'CUSTOM' {
  return 'GENERAL';
}

export async function getCachedResponse(_question: string): Promise<ChatbotResponseCache | null> {
  return null;
}

export async function cacheResponse(
  _question: string,
  _answer: string,
  _options: any = {}
): Promise<void> {
  return;
}

export async function getCacheStats(): Promise<{
  totalCached: number;
  totalHits: number;
  hitRate: number;
  byType: Record<string, { count: number; hits: number }>;
}> {
  return { totalCached: 0, totalHits: 0, hitRate: 0, byType: {} };
}
