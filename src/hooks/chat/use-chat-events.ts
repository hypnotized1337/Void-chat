import { ChatState, ChatMessage, RoomUser } from '@/types/chat';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  ChatMessageSchema,
  TypingSchema,
  ReadSchema,
  BulkReadSchema,
  FreezeSchema,
  EditSchema,
  UnsendSchema,
  KickSchema,
  safeParse
} from '@/lib/chat-schemas';

const TEN_MINUTES = 10 * 60 * 1000;
const generateId = () => Math.random().toString(36).substring(2, 12);

export interface ChatEventContext {
  setState: React.Dispatch<React.SetStateAction<ChatState>>;
  channelRef: React.MutableRefObject<RealtimeChannel | null>;
  usernameRef: React.MutableRefObject<string>;
  roomCodeRef: React.MutableRefObject<string>;
  remoteTypingTimeouts: React.MutableRefObject<Record<string, ReturnType<typeof setTimeout>>>;
  notificationsRef: React.MutableRefObject<boolean>;
  notifCooldownRef: React.MutableRefObject<number | null>;
  pendingNotifCount: React.MutableRefObject<number>;
  DEFAULT_ROOM_STATE: Omit<ChatState, 'notificationsEnabled'>;
}

export function setupChatEvents(channel: RealtimeChannel, ctx: ChatEventContext) {
  const {
    setState,
    channelRef,
    usernameRef,
    roomCodeRef,
    remoteTypingTimeouts,
    notificationsRef,
    notifCooldownRef,
    pendingNotifCount,
    DEFAULT_ROOM_STATE,
  } = ctx;

  channel.on('broadcast', { event: 'message' }, (payload) => {
    const msg = safeParse(ChatMessageSchema, payload.payload);
    if (!msg) return;
    if (msg.username === usernameRef.current) return;

    const isFocused = document.hasFocus();
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, { ...msg, status: isFocused ? 'read' : 'delivered' } as ChatMessage],
    }));

    if (isFocused && channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'read', payload: { messageId: msg.id, reader: usernameRef.current } });
    }

    if (notificationsRef.current && document.hidden) {
      if (notifCooldownRef.current) {
        pendingNotifCount.current++;
      } else {
        let body: string;
        if (msg.isGif) {
          body = `${msg.username} sent a GIF`;
        } else if (msg.imageUrl) {
          body = `${msg.username} sent a photo 📷`;
        } else if (msg.fileUrl) {
          body = `${msg.username} sent a file: ${msg.fileName || 'attachment'}`;
        } else if (msg.replyTo) {
          const replyText = msg.text ? `"${msg.text.slice(0, 80)}"` : '';
          body = `${msg.username} replied to ${msg.replyTo.username}: ${replyText}`;
        } else if (msg.text && /https?:\/\/[^\s]/.test(msg.text)) {
          body = `${msg.username} sent a link 🔗`;
        } else if (msg.text) {
          const truncated = msg.text.length > 100 ? msg.text.slice(0, 100) + '…' : msg.text;
          body = `${msg.username} said: "${truncated}"`;
        } else {
          body = `${msg.username} sent a message`;
        }
        new Notification(roomCodeRef.current, { body, icon: '/favicon.ico' });

        notifCooldownRef.current = window.setTimeout(() => {
          if (pendingNotifCount.current > 0) {
            new Notification(roomCodeRef.current, {
              body: `+ ${pendingNotifCount.current} more message${pendingNotifCount.current > 1 ? 's' : ''}`,
              icon: '/favicon.ico',
            });
            pendingNotifCount.current = 0;
          }
          notifCooldownRef.current = null;
        }, 3000);
      }
    }
  });

  const handleSystemOrAnnouncement = (payload: { payload: unknown }) => {
    const msg = safeParse(ChatMessageSchema, payload.payload);
    if (!msg) return;
    setState(prev => ({ ...prev, messages: [...prev.messages, msg as ChatMessage] }));
  };

  channel.on('broadcast', { event: 'system' }, handleSystemOrAnnouncement);
  channel.on('broadcast', { event: 'announcement' }, handleSystemOrAnnouncement);

  channel.on('broadcast', { event: 'typing' }, (payload) => {
    const parsed = safeParse(TypingSchema, payload.payload);
    if (!parsed) return;
    const typingUser = parsed.username;
    if (typingUser === usernameRef.current) return;

    setState(prev => ({
      ...prev,
      typingUsers: prev.typingUsers.includes(typingUser) ? prev.typingUsers : [...prev.typingUsers, typingUser],
    }));

    if (remoteTypingTimeouts.current[typingUser]) clearTimeout(remoteTypingTimeouts.current[typingUser]);
    remoteTypingTimeouts.current[typingUser] = setTimeout(() => {
      setState(prev => ({ ...prev, typingUsers: prev.typingUsers.filter(u => u !== typingUser) }));
      delete remoteTypingTimeouts.current[typingUser];
    }, 3000);
  });

  channel.on('broadcast', { event: 'read' }, (payload) => {
    const parsed = safeParse(ReadSchema, payload.payload);
    if (!parsed) return;
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(m => m.id === parsed.messageId ? { ...m, status: 'read' } : m),
    }));
  });

  channel.on('broadcast', { event: 'bulk-read' }, (payload) => {
    const parsed = safeParse(BulkReadSchema, payload.payload);
    if (!parsed) return;
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(m =>
        parsed.messageIds.includes(m.id) ? { ...m, status: 'read' } : m
      ),
    }));
  });

  channel.on('broadcast', { event: 'nuke' }, () => {
    setState(prev => ({
      ...prev,
      messages: [{
        id: generateId(),
        username: 'system',
        text: 'Session purged.',
        timestamp: Date.now(),
        type: 'system',
      }],
    }));
  });

  channel.on('broadcast', { event: 'freeze' }, (payload) => {
    const parsed = safeParse(FreezeSchema, payload.payload);
    if (!parsed) return;
    setState(prev => ({ ...prev, frozen: parsed.frozen, frozenBy: parsed.frozen ? parsed.by : null }));
  });

  channel.on('broadcast', { event: 'edit' }, (payload) => {
    const parsed = safeParse(EditSchema, payload.payload);
    if (!parsed) return;
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(m => m.id === parsed.messageId ? { ...m, text: parsed.newText, edited: true } : m),
    }));
  });

  channel.on('broadcast', { event: 'unsend' }, (payload) => {
    const parsed = safeParse(UnsendSchema, payload.payload);
    if (!parsed) return;
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(m => m.id === parsed.messageId ? { ...m, text: '', deleted: true } : m),
    }));
  });

  channel.on('broadcast', { event: 'kick' }, (payload) => {
    const parsed = safeParse(KickSchema, payload.payload);
    if (!parsed) return;
    if (parsed.username === usernameRef.current) {
      if (channelRef.current) {
        channelRef.current.untrack().then(() => {
          if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
          }
        });
      }
      setState(prev => ({ ...prev, ...DEFAULT_ROOM_STATE }));
      setTimeout(() => {
        toast.error('YOU HAVE BEEN REMOVED', {
          description: 'An admin removed you from the void.',
          duration: 5000,
        });
      }, 100);
    } else {
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, {
          id: generateId(),
          username: 'system',
          text: `${parsed.username} was removed.`,
          timestamp: Date.now(),
          type: 'system',
        }],
      }));
    }
  });

  // History sync: respond to requests from rejoining users
  channel.on('broadcast', { event: 'request-history' }, () => {
    const presenceState = channel.presenceState();
    const activeUsers = Object.keys(presenceState).sort();
    if (activeUsers[0] !== usernameRef.current) return;

    const now = Date.now();
    setState(prev => {
      const validMessages = prev.messages.filter(m => now - m.timestamp < TEN_MINUTES);
      if (validMessages.length > 0) {
        channel.send({
          type: 'broadcast',
          event: 'history-sync',
          payload: { messages: validMessages },
        });
      }
      return prev;
    });
  });

  // History sync: receive history when rejoining
  channel.on('broadcast', { event: 'history-sync' }, (payload) => {
    const parsed = payload.payload as { messages?: unknown[] };
    if (!parsed?.messages || !Array.isArray(parsed.messages)) return;
    const now = Date.now();
    const validMessages: ChatMessage[] = [];
    for (const raw of parsed.messages) {
      const msg = safeParse(ChatMessageSchema, raw);
      if (msg && now - msg.timestamp < TEN_MINUTES) {
        validMessages.push(msg as ChatMessage);
      }
    }
    if (validMessages.length === 0) return;
    setState(prev => {
      const existingIds = new Set(prev.messages.map(m => m.id));
      const newMessages = validMessages.filter(m => !existingIds.has(m.id));
      if (newMessages.length === 0) return prev;
      const merged = [...newMessages, ...prev.messages].sort((a, b) => a.timestamp - b.timestamp);
      return { ...prev, messages: merged };
    });
  });
}
