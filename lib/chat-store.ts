/**
 * Live chat storage — chat_conversations + chat_messages in Supabase.
 * Server-side only (service role bypasses RLS; tables have no policies).
 */

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

function dbHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!key || !supabaseBase()) return null;
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

export type ChatRole = 'user' | 'ai' | 'admin' | 'system';

export type ChatMessage = {
  id: string;
  conversation_id: string;
  role: ChatRole;
  agent?: string | null;
  content: string;
  actions?: unknown;
  created_at: string;
};

export type ChatConversation = {
  id: string;
  user_id: string | null;
  visitor_key: string | null;
  status: string;
  last_agent: string | null;
  subject: string | null;
  unread_admin: number;
  created_at: string;
  updated_at: string;
};

async function sbFetch(path: string, init?: RequestInit): Promise<unknown | null> {
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return null;
  const res = await fetch(base + path, {
    ...init,
    headers: { ...hdr, ...(init?.headers || {}) },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** Find an open conversation for this user/visitor, or create one. */
export async function getOrCreateConversation(params: {
  userId?: string | null;
  visitorKey?: string | null;
}): Promise<ChatConversation | null> {
  const { userId, visitorKey } = params;
  let rows: unknown = null;
  if (userId) {
    rows = await sbFetch(
      `/rest/v1/chat_conversations?user_id=eq.${encodeURIComponent(userId)}&status=neq.closed&order=updated_at.desc&limit=1`,
    );
  } else if (visitorKey) {
    rows = await sbFetch(
      `/rest/v1/chat_conversations?visitor_key=eq.${encodeURIComponent(visitorKey)}&status=neq.closed&order=updated_at.desc&limit=1`,
    );
  }
  const existing = Array.isArray(rows) && rows.length > 0 ? (rows[0] as ChatConversation) : null;
  if (existing) {
    // Link a signed-in user to their earlier guest conversation on first login chat.
    if (userId && !existing.user_id) {
      const updated = await sbFetch(
        `/rest/v1/chat_conversations?id=eq.${existing.id}`,
        { method: 'PATCH', body: JSON.stringify({ user_id: userId }) },
      );
      void updated;
    }
    return existing;
  }
  const created = await sbFetch(`/rest/v1/chat_conversations`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      ...(userId ? { user_id: userId } : {}),
      ...(visitorKey ? { visitor_key: visitorKey } : {}),
      status: 'ai',
    }),
  });
  return Array.isArray(created) && created.length > 0 ? (created[0] as ChatConversation) : null;
}

export async function appendMessage(
  conversationId: string,
  msg: { role: ChatRole; content: string; agent?: string | null; actions?: unknown },
): Promise<ChatMessage | null> {
  const created = await sbFetch(`/rest/v1/chat_messages`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      conversation_id: conversationId,
      role: msg.role,
      content: msg.content,
      ...(msg.agent ? { agent: msg.agent } : {}),
      ...(msg.actions ? { actions: msg.actions } : {}),
    }),
  });
  // Keep the conversation pinned to the top of the inbox.
  const touch = await sbFetch(`/rest/v1/chat_conversations?id=eq.${conversationId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      updated_at: new Date().toISOString(),
      ...(msg.role === 'user' ? { unread_admin: 1 } : {}),
    }),
  });
  void touch;
  return Array.isArray(created) && created.length > 0 ? (created[0] as ChatMessage) : null;
}

export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  const rows = await sbFetch(
    `/rest/v1/chat_messages?conversation_id=eq.${conversationId}&order=created_at.asc&limit=200`,
  );
  return Array.isArray(rows) ? (rows as ChatMessage[]) : [];
}

export async function markAdminRead(conversationId: string): Promise<void> {
  await sbFetch(`/rest/v1/chat_conversations?id=eq.${conversationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ unread_admin: 0 }),
  });
}

export async function setConversationStatus(
  conversationId: string,
  status: string,
): Promise<void> {
  await sbFetch(`/rest/v1/chat_conversations?id=eq.${conversationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
  });
}
