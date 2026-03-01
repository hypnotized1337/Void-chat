import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, RoomUser, ChatState } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

const generateId = () => Math.random().toString(36).substring(2, 12);

export function useChat() {
  const [state, setState] = useState<ChatState>({
    username: '',
    roomCode: '',
    messages: [],
    users: [],
    isJoined: false,
    notificationsEnabled: false,
    typingUsers: [],
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const notificationsRef = useRef(state.notificationsEnabled);
  const usernameRef = useRef(state.username);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteTypingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => { notificationsRef.current = state.notificationsEnabled; }, [state.notificationsEnabled]);
  useEffect(() => { usernameRef.current = state.username; }, [state.username]);

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const joinRoom = useCallback((username: string, roomCode: string, importedMessages?: ChatMessage[]) => {
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

    const initialMessages = importedMessages ? [...importedMessages, systemMsg] : [systemMsg];

    setState(prev => ({
      ...prev,
      username,
      roomCode,
      isJoined: true,
      messages: initialMessages,
      users: [],
      typingUsers: [],
    }));

    const channel = supabase.channel(`room:${roomCode}`, {
      config: { presence: { key: username } },
    });

    channel.on('broadcast', { event: 'message' }, (payload) => {
      const msg = payload.payload as ChatMessage;
      if (msg.username === usernameRef.current) return;
      setState(prev => ({ ...prev, messages: [...prev.messages, { ...msg, status: 'delivered' }] }));

      // Auto-mark as read if tab focused
      if (!document.hidden && channelRef.current) {
        channelRef.current.send({ type: 'broadcast', event: 'read', payload: { messageId: msg.id, reader: usernameRef.current } });
      }

      if (notificationsRef.current && document.hidden) {
        new Notification(msg.username, { body: msg.text });
      }
    });

    channel.on('broadcast', { event: 'system' }, (payload) => {
      const msg = payload.payload as ChatMessage;
      setState(prev => ({ ...prev, messages: [...prev.messages, msg] }));
    });

    channel.on('broadcast', { event: 'typing' }, (payload) => {
      const { username: typingUser } = payload.payload as { username: string };
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
      const { messageId } = payload.payload as { messageId: string; reader: string };
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(m => m.id === messageId ? { ...m, status: 'read' } : m),
      }));
    });

    // Nuke event
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

    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState();
      const users: RoomUser[] = Object.keys(presenceState).map(key => ({
        username: key,
        joinedAt: (presenceState[key]?.[0] as any)?.joinedAt ?? Date.now(),
      }));
      setState(prev => ({ ...prev, users }));

      // Auto-purge: if no users left, clear messages
      if (users.length === 0) {
        setState(prev => ({ ...prev, messages: [] }));
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ username, joinedAt: Date.now() });
        channel.send({ type: 'broadcast', event: 'system', payload: systemMsg });
      }
    });

    channelRef.current = channel;
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

    setState(prev => ({
      ...prev,
      isJoined: false,
      messages: [],
      users: [],
      username: '',
      roomCode: '',
      typingUsers: [],
    }));
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    // Secret nuke trigger
    if (text.trim().toLowerCase() === 'dingus' && channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'nuke', payload: {} });
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
      return;
    }

    const msg: ChatMessage = {
      id: generateId(),
      username: usernameRef.current,
      text: text.trim(),
      timestamp: Date.now(),
      type: 'message',
      status: 'sent',
    };

    setState(prev => ({ ...prev, messages: [...prev.messages, msg] }));

    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'message', payload: msg });
    }
  }, []);

  const sendTyping = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { username: usernameRef.current } });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { typingTimeoutRef.current = null; }, 2000);
  }, []);

  const exportHistory = useCallback(() => {
    const data = JSON.stringify(state.messages, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat_export.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [state.messages]);

  const toggleNotifications = useCallback(async () => {
    if (!state.notificationsEnabled) {
      if ('Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          setState(prev => ({ ...prev, notificationsEnabled: true }));
        }
      }
    } else {
      setState(prev => ({ ...prev, notificationsEnabled: false }));
    }
  }, [state.notificationsEnabled]);

  return { state, joinRoom, leaveRoom, sendMessage, sendTyping, exportHistory, toggleNotifications };
}
