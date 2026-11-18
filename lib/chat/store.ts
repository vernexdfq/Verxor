/**
 * Live chat storage — chat_conversations / chat_messages in Supabase.
 * Server-side only, service-role access (both tables have RLS enabled with
 * zero policies; the public never touches them directly).
 */

export type ChatRole = 'user' | 'ai' | 'admin' | 'system';

export type ChatButton = { label: string; payload: string };

export type ChatMessageRow = {
  id: string;
  conversation_id: string;
  role: ChatRole;
  agent: 'gemini' | 'mistral' | null;
  content: string;
  actions: { buttons?: ChatButton[] } | null;
  created_at: string;
};

export type ChatConversationRow = {
  id: string;
  user_id: string | null;
  visitor_key: string | null;
  status: 'ai' | 'waiting_admin' | 'admin' | 'closed';
  last_agent: 'gemini' | 'mistral' | 'admin' | null;
  subject: string | null;
  ticket_id?: string | null;
  unread_admin: number;
  state: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

function db() {
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) return null;
  return {
    base,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  };
}

/** Last PostgREST error from a chat write (for diagnostics / admin alerts). */
export let lastDbError: string | null = null;

export function chatDbConfigured(): boolean {
  return db() !== null;
}

export async function createConversation(input: {
  userId?: string | null;
  visitorKey?: string | null;
  subject?: string | null;
}): Promise<ChatConversationRow | null> {
  const d = db();
  if (!d) return null;
  const insert = async (body: Record<string, unknown>): Promise<ChatConversationRow | null> => {
    const res = await fetch(`${d.base}/rest/v1/chat_conversations`, {
      method: 'POST',
      headers: { ...d.headers, Prefer: 'return=representation' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      lastDbError = `chat_conversations POST ${res.status}: ${text.slice(0, 300)}`;
      return null;
    }
    const rows = (await res.json()) as ChatConversationRow[];
    lastDbError = null;
    return rows?.[0] || null;
  };
  // Full row first; fall back to a minimal insert in case a column is
  // missing/renamed in the live table, and surface whatever PostgREST says.
  return (
    (await insert({
      user_id: input.userId || null,
      visitor_key: input.visitorKey || null,
      subject: input.subject || null,
      status: 'ai',
    })) ||
    (await insert({
      user_id: input.userId || null,
      status: 'ai',
    }))
  );
}

export async function getConversation(id: string): Promise<ChatConversationRow | null> {
  const d = db();
  if (!d) return null;
  const res = await fetch(
    `${d.base}/rest/v1/chat_conversations?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
    { headers: d.headers, cache: 'no-store' },
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as ChatConversationRow[];
  return rows?.[0] || null;
}

export async function getLatestConversationForUser(
  userId: string,
): Promise<ChatConversationRow | null> {
  const d = db();
  if (!d) return null;
  const res = await fetch(
    `${d.base}/rest/v1/chat_conversations?user_id=eq.${encodeURIComponent(userId)}&status=neq.closed&order=updated_at.desc&select=*&limit=1`,
    { headers: d.headers, cache: 'no-store' },
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as ChatConversationRow[];
  return rows?.[0] || null;
}

/** Latest open conversations regardless of user (admin bot / inbox). */
export async function listLatestOpenConversations(
  limit: number,
): Promise<ChatConversationRow[]> {
  const d = db();
  if (!d) return [];
  const res = await fetch(
    `${d.base}/rest/v1/chat_conversations?status=neq.closed&order=updated_at.desc&select=*&limit=${limit}`,
    { headers: d.headers, cache: 'no-store' },
  );
  if (!res.ok) return [];
  const rows = (await res.json()) as ChatConversationRow[];
  return Array.isArray(rows) ? rows : [];
}

export async function updateConversation(
  id: string,
  patch: Partial<Pick<ChatConversationRow, 'status' | 'state' | 'subject' | 'ticket_id' | 'last_agent' | 'unread_admin'>>,
): Promise<void> {
  const d = db();
  if (!d) return;
  await fetch(`${d.base}/rest/v1/chat_conversations?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: d.headers,
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    cache: 'no-store',
  });
}

/* ---------- ticket IDs (VX-XXXX) ---------- */

/** Random human-friendly ticket reference, e.g. VX-4821. */
export function generateTicketId(): string {
  return `VX-${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * Attach a ticket ID to a conversation. Prefers a dedicated ticket_id
 * column; if the column is missing on the live table (PostgREST rejects the
 * PATCH), falls back to a "[VX-1234] subject" prefix so lookups still work
 * with zero schema changes.
 */
export async function assignTicketId(
  conversationId: string,
  ticketId: string,
  subject: string,
): Promise<void> {
  const d = db();
  if (!d) return;
  const patch = async (body: Record<string, unknown>): Promise<boolean> => {
    const res = await fetch(`${d.base}/rest/v1/chat_conversations?id=eq.${encodeURIComponent(conversationId)}`, {
      method: 'PATCH',
      headers: { ...d.headers, Prefer: 'return=representation' },
      body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const rows = (await res.json().catch(() => [])) as ChatConversationRow[];
    return Boolean(rows?.[0]);
  };
  if (await patch({ ticket_id: ticketId, subject })) return;
  await patch({ subject: `[${ticketId}] ${subject}` });
}

/** Find a conversation by its VX-XXXX ticket reference (column or subject prefix). */
export async function findConversationByTicket(
  ticketId: string,
): Promise<ChatConversationRow | null> {
  const d = db();
  if (!d) return null;
  const t = (ticketId || '').trim().toUpperCase().replace(/^VX[-\s]?/, '');
  if (!/^\d{3,6}$/.test(t)) return null;
  const ref = `VX-${t}`;
  const res = await fetch(
    `${d.base}/rest/v1/chat_conversations?or=(ticket_id.eq.${ref},subject.like.*${ref}*)&order=updated_at.desc&select=*&limit=1`,
    { headers: d.headers, cache: 'no-store' },
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as ChatConversationRow[];
  return rows?.[0] || null;
}

export async function appendMessage(input: {
  conversationId: string;
  role: ChatRole;
  agent?: 'gemini' | 'mistral' | null;
  content: string;
  buttons?: ChatButton[];
}): Promise<ChatMessageRow | null> {
  const d = db();
  if (!d) return null;
  const res = await fetch(`${d.base}/rest/v1/chat_messages`, {
    method: 'POST',
    headers: { ...d.headers, Prefer: 'return=representation' },
    body: JSON.stringify({
      conversation_id: input.conversationId,
      role: input.role,
      agent: input.agent || null,
      content: input.content,
      actions: input.buttons && input.buttons.length > 0 ? { buttons: input.buttons } : null,
    }),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as ChatMessageRow[];
  const msg = rows?.[0] || null;
  // Keep the conversation ordered.
  await fetch(
    `${d.base}/rest/v1/chat_conversations?id=eq.${encodeURIComponent(input.conversationId)}`,
    {
      method: 'PATCH',
      headers: d.headers,
      body: JSON.stringify({ updated_at: new Date().toISOString() }),
      cache: 'no-store',
    },
  );
  return msg;
}

export async function listMessages(conversationId: string): Promise<ChatMessageRow[]> {
  const d = db();
  if (!d) return [];
  const res = await fetch(
    `${d.base}/rest/v1/chat_messages?conversation_id=eq.${encodeURIComponent(conversationId)}&order=created_at.asc&select=*`,
    { headers: d.headers, cache: 'no-store' },
  );
  if (!res.ok) return [];
  const rows = (await res.json()) as ChatMessageRow[];
  return Array.isArray(rows) ? rows : [];
}
