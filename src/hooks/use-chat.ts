import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, RoomUser, ChatState, ReplyTo } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { setupChatEvents } from './chat/use-chat-events';

const generateId = () => Math.random().toString(36).substring(2, 12);
const TEN_MINUTES = 10 * 60 * 1000;

// Rate limiting config
const RATE_LIMIT_COUNT = 5;
const RATE_LIMIT_WINDOW = 3000; // 3 seconds

const DEFAULT_ROOM_STATE: Omit<ChatState, 'notificationsEnabled'> = {
  username: '',
  roomCode: '',
  messages: [],
  users: [],
  isJoined: false,
  typingUsers: [],
  frozen: false,
  frozenBy: null,
  isPasswordProtected: false,
};

export function useChat() {
  const [state, setState] = useState<ChatState>(() => {
    const savedNotif = typeof window !== 'undefined'
      ? localStorage.getItem('chat_notif_pref') === 'true'
      : false;
    return { ...DEFAULT_ROOM_STATE, notificationsEnabled: savedNotif };
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const notificationsRef = useRef(state.notificationsEnabled);
  const usernameRef = useRef(state.username);
  const roomCodeRef = useRef(state.roomCode);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteTypingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const sendTimestamps = useRef<number[]>([]);
  const notifCooldownRef = useRef<number | null>(null);
  const pendingNotifCount = useRef(0);

  useEffect(() => { notificationsRef.current = state.notificationsEnabled; }, [state.notificationsEnabled]);
  useEffect(() => { usernameRef.current = state.username; }, [state.username]);
  useEffect(() => { roomCodeRef.current = state.roomCode; }, [state.roomCode]);

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Auto-delete expired messages (older than 10 minutes)
  useEffect(() => {
    if (!state.isJoined) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setState(prev => {
        const filtered = prev.messages.filter(m => now - m.timestamp < TEN_MINUTES);
        if (filtered.length === prev.messages.length) return prev;
        return { ...prev, messages: filtered };
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [state.isJoined]);

  // Rate limiter check
  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    sendTimestamps.current = sendTimestamps.current.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (sendTimestamps.current.length >= RATE_LIMIT_COUNT) {
      // Inject local system message
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, {
          id: generateId(),
          username: 'system',
          text: '[SYSTEM]: RATE LIMITED — SLOW DOWN',
          timestamp: Date.now(),
          type: 'system',
        }],
      }));
      return false;
    }
    sendTimestamps.current.push(now);
    return true;
  }, []);

  // Window focus listener: mark all unread messages as read
  useEffect(() => {
    const handleFocus = () => {
      if (!channelRef.current) return;
      setState(prev => {
        const unreadIds = prev.messages
          .filter(m => m.type === 'message' && m.username !== usernameRef.current && m.status !== 'read')
          .map(m => m.id);

        if (unreadIds.length === 0) return prev;

        channelRef.current?.send({
          type: 'broadcast',
          event: 'bulk-read',
          payload: { messageIds: unreadIds, reader: usernameRef.current },
        });

        return {
          ...prev,
          messages: prev.messages.map(m =>
            unreadIds.includes(m.id) ? { ...m, status: 'read' as const } : m
          ),
        };
      });
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const joinRoom = useCallback((username: string, roomCode: string, skipDuplicateCheck = false, isPasswordProtected = false): Promise<{ error: string | null }> => {
    return new Promise((resolveJoin) => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const systemMsg: ChatMessage = {
        id: generateId(),
        username: 'system',
        text: `${username} joined.`,
        timestamp: Date.now(),
        type: 'system',
      };

      setState(prev => ({
        ...prev,
        username,
        roomCode,
        isJoined: true,
        messages: [systemMsg],
        users: [],
        typingUsers: [],
        frozen: false,
        frozenBy: null,
        isPasswordProtected,
      }));

      const channel = supabase.channel(`room:${roomCode}`, {
        config: { presence: { key: username } },
      });

      let duplicateChecked = false;

      setupChatEvents(channel, {
        setState,
        channelRef,
        usernameRef,
        roomCodeRef,
        remoteTypingTimeouts,
        notificationsRef,
        notifCooldownRef,
        pendingNotifCount,
        DEFAULT_ROOM_STATE,
      });

      let hasHadUsers = false;

      channel.on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const users: RoomUser[] = Object.keys(presenceState).map(key => ({
          username: key,
          joinedAt: (presenceState[key]?.[0] as any)?.joinedAt ?? Date.now(),
        }));
        setState(prev => ({ ...prev, users }));

        if (users.length > 0) {
          hasHadUsers = true;
        }

        if (users.length === 0 && hasHadUsers) {
          setState(prev => ({ ...prev, messages: [] }));
          // Clean up room password and stored images when room empties
          const currentRoom = roomCode;
          supabase.functions.invoke('room-password', {
            body: { action: 'delete', roomCode: currentRoom },
          }).catch(() => {});
          // Purge room images from storage
          supabase.storage.from('chat-images').list(currentRoom).then(({ data: files }) => {
            if (files && files.length > 0) {
              const paths = files.map(f => `${currentRoom}/${f.name}`);
              supabase.storage.from('chat-images').remove(paths).catch(() => {});
            }
          }).catch(() => {});
        }

        // Post-join duplicate check: wait for presence to settle, then check
        if (!duplicateChecked && !skipDuplicateCheck) {
          const entries = presenceState[username];
          if (entries && entries.length > 1) {
            duplicateChecked = true;
            // Broadcast impersonation warning to the room before leaving
            channel.send({
              type: 'broadcast',
              event: 'system',
              payload: {
                id: generateId(),
                username: 'system',
                text: `⚠ Someone tried joining as "${username}"`,
                timestamp: Date.now(),
                type: 'system',
              },
            });
            // Leave the channel
            channel.untrack().then(() => supabase.removeChannel(channel)).catch(() => supabase.removeChannel(channel));
            channelRef.current = null;
            setState(prev => ({ ...prev, ...DEFAULT_ROOM_STATE }));
            setTimeout(() => {
              toast.error('IDENTITY CONFLICT', {
                description: `"${username}" is already active in this void. Choose another identity.`,
                duration: 5000,
              });
            }, 100);
            resolveJoin({ error: 'Username already active in this void. Please choose another identity.' });
            return;
          }
        }
      });

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ username, joinedAt: Date.now() });
          // Don't broadcast join message yet — wait for duplicate check
          // Resolve after a delay to allow presence sync with duplicate info
          if (skipDuplicateCheck) {
            channel.send({ type: 'broadcast', event: 'system', payload: systemMsg });
            // Request history from existing users after a short delay
            setTimeout(() => {
              channel.send({ type: 'broadcast', event: 'request-history', payload: {} });
            }, 500);
            resolveJoin({ error: null });
          } else {
            setTimeout(() => {
              if (!duplicateChecked) {
                duplicateChecked = true;
                // Only broadcast join after confirming no duplicate
                channel.send({ type: 'broadcast', event: 'system', payload: systemMsg });
                // Request history from existing users
                setTimeout(() => {
                  channel.send({ type: 'broadcast', event: 'request-history', payload: {} });
                }, 500);
                resolveJoin({ error: null });
              }
            }, 1500);
          }
        }
      });

      channelRef.current = channel;
    });
  }, []);

  const leaveRoom = useCallback(() => {
    if (channelRef.current) {
      const leaveMsg: ChatMessage = {
        id: generateId(),
        username: 'system',
        text: `${usernameRef.current} left.`,
        timestamp: Date.now(),
        type: 'system',
      };
      channelRef.current.send({ type: 'broadcast', event: 'system', payload: leaveMsg });
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setState(prev => ({ ...prev, ...DEFAULT_ROOM_STATE }));
  }, []);

  const sendMessage = useCallback((text: string, replyTo?: ReplyTo) => {
    if (!text.trim()) return;
    if (!checkRateLimit()) return;

    const msg: ChatMessage = {
      id: generateId(),
      username: usernameRef.current,
      text: text.trim(),
      timestamp: Date.now(),
      type: 'message',
      status: 'sent',
      ...(replyTo ? { replyTo } : {}),
    };

    setState(prev => ({ ...prev, messages: [...prev.messages, msg] }));

    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'message', payload: msg });
    }
  }, [checkRateLimit]);

  const sendTyping = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { username: usernameRef.current } });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { typingTimeoutRef.current = null; }, 2000);
  }, []);

  const sendGif = useCallback((gifUrl: string) => {
    if (!checkRateLimit()) return;

    const msg: ChatMessage = {
      id: generateId(),
      username: usernameRef.current,
      text: '',
      timestamp: Date.now(),
      type: 'message',
      status: 'sent',
      imageUrl: gifUrl,
      imageExpiry: Date.now() + TEN_MINUTES,
      isGif: true,
    };

    setState(prev => ({ ...prev, messages: [...prev.messages, msg] }));

    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'message', payload: msg });
    }
  }, [checkRateLimit]);

  const toggleNotifications = useCallback(async () => {
    setState(prev => {
      const next = !prev.notificationsEnabled;
      localStorage.setItem('chat_notif_pref', String(next));
      if (next && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      return { ...prev, notificationsEnabled: next };
    });
  }, []);

  const nukeRoom = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'nuke', payload: {} });
    }
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
  }, []);

  const freezeChat = useCallback(() => {
    setState(prev => {
      const newFrozen = !prev.frozen;
      if (channelRef.current) {
        channelRef.current.send({ type: 'broadcast', event: 'freeze', payload: { frozen: newFrozen, by: usernameRef.current } });
      }
      return { ...prev, frozen: newFrozen, frozenBy: newFrozen ? usernameRef.current : null };
    });
  }, []);

  const sendAnnouncement = useCallback((text: string) => {
    const msg: ChatMessage = {
      id: generateId(),
      username: 'system',
      text,
      timestamp: Date.now(),
      type: 'announcement',
    };
    setState(prev => ({ ...prev, messages: [...prev.messages, msg] }));
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'announcement', payload: msg });
    }
  }, []);

  const editMessage = useCallback((messageId: string, newText: string) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(m => m.id === messageId ? { ...m, text: newText, edited: true } : m),
    }));
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'edit', payload: { messageId, newText } });
    }
  }, []);

  const unsendMessage = useCallback((messageId: string) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(m => m.id === messageId ? { ...m, text: '', deleted: true } : m),
    }));
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'unsend', payload: { messageId } });
    }
  }, []);

  const sendImage = useCallback(async (file: File, onProgress?: (p: number) => void) => {
    if (!checkRateLimit()) return;

    const ext = file.name.split('.').pop() || 'png';
    const storedFileName = `${generateId()}_${Date.now()}.${ext}`;
    const expiry = Date.now() + TEN_MINUTES;
    const isImage = file.type.startsWith('image/');

    onProgress?.(10);

    const { error } = await supabase.storage
      .from('chat-images')
      .upload(storedFileName, file, { contentType: file.type });

    if (error) {
      console.error('Upload failed:', error.message);
      toast.error('Upload failed — file may be too large or unsupported.');
      return;
    }

    onProgress?.(70);

    const { data: urlData } = supabase.storage
      .from('chat-images')
      .getPublicUrl(storedFileName);

    onProgress?.(90);

    const msg: ChatMessage = {
      id: generateId(),
      username: usernameRef.current,
      text: '',
      timestamp: Date.now(),
      type: 'message',
      status: 'sent',
      ...(isImage
        ? {
            imageUrl: urlData.publicUrl,
            imageExpiry: expiry,
          }
        : {
            fileUrl: urlData.publicUrl,
            fileName: file.name,
            fileSize: file.size,
            fileMimeType: file.type,
          }),
    };

    setState(prev => ({ ...prev, messages: [...prev.messages, msg] }));

    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'message', payload: msg });
    }

    onProgress?.(100);
  }, [checkRateLimit]);

  const kickUser = useCallback((username: string) => {
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'kick', payload: { username } });
    }
    // Also add local system message
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, {
        id: generateId(),
        username: 'system',
        text: `${username} was removed.`,
        timestamp: Date.now(),
        type: 'system',
      }],
    }));
  }, []);

  return {
    state, joinRoom, leaveRoom, sendMessage, sendTyping, sendGif,
    toggleNotifications, nukeRoom, freezeChat, sendAnnouncement, editMessage, unsendMessage, sendImage,
    kickUser,
  };
}
