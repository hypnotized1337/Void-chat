import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, RoomUser, ChatState } from '@/types/chat';

const generateId = () => Math.random().toString(36).substring(2, 12);

export function useChat() {
  const [state, setState] = useState<ChatState>({
    username: '',
    roomCode: '',
    messages: [],
    users: [],
    isJoined: false,
    notificationsEnabled: false,
  });

  const notificationsRef = useRef(state.notificationsEnabled);
  useEffect(() => { notificationsRef.current = state.notificationsEnabled; }, [state.notificationsEnabled]);

  const joinRoom = useCallback((username: string, roomCode: string, importedMessages?: ChatMessage[]) => {
    const systemMsg: ChatMessage = {
      id: generateId(),
      username: 'HELIOS',
      text: `${username} has joined the room.`,
      timestamp: Date.now(),
      type: 'system',
    };

    setState(prev => ({
      ...prev,
      username,
      roomCode,
      isJoined: true,
      messages: importedMessages ? [...importedMessages, systemMsg] : [systemMsg],
      users: [{ username, joinedAt: Date.now() }],
    }));
  }, []);

  const leaveRoom = useCallback(() => {
    setState(prev => ({
      ...prev,
      isJoined: false,
      messages: [],
      users: [],
      username: '',
      roomCode: '',
    }));
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    const msg: ChatMessage = {
      id: generateId(),
      username: state.username,
      text: text.trim(),
      timestamp: Date.now(),
      type: 'message',
    };
    setState(prev => ({ ...prev, messages: [...prev.messages, msg] }));
  }, [state.username]);

  const exportHistory = useCallback(() => {
    const data = JSON.stringify(state.messages, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'helios_chat.json';
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

  return { state, joinRoom, leaveRoom, sendMessage, exportHistory, toggleNotifications };
}
