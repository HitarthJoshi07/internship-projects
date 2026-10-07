export interface User { _id: string; username: string; email?: string; verified?: boolean; displayName?: string; about?: string; avatar?: string }
export const nameOf = (u?: User) => u?.displayName || u?.username || 'User';
export interface Attachment { url: string; name: string; mime: string; size: number }
export interface Message { _id: string; conversation: string; sender: User; text: string; attachments: Attachment[]; deleted?: boolean; createdAt: string }
export interface Conversation { _id: string; type: 'direct' | 'group'; name?: string; admins?: string[]; unread?: number; members: User[]; lastMessage?: { text: string; at: string } }

export const getToken = () => localStorage.getItem('token') || '';

export async function api<T>(path: string, opts: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const res = await fetch('/api' + path, {
    method: opts.method || (opts.body || opts.form ? 'POST' : 'GET'),
    headers: {
      Authorization: `Bearer ${getToken()}`,
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts.form ?? (opts.body ? JSON.stringify(opts.body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { data });
  return data;
}

export const convTitle = (c: Conversation, meId: string) =>
  c.type === 'group' ? c.name || 'Group' : nameOf(c.members.find((m) => m._id !== meId)) || 'Chat';

export interface Reel { _id: string; author: User; caption: string; video: { url: string; mime: string; size: number }; likeCount: number; commentCount?: number; shareCount: number; liked: boolean; createdAt: string }
export interface ReelComment { _id: string; reel: string; author: User; text: string; createdAt: string }