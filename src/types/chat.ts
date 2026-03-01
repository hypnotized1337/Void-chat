export interface ChatMessage {
  id: string;
  username: string;
  text: string;
  timestamp: number;
  type: 'message' | 'system';
  status?: 'sent' | 'delivered' | 'read';
}

export interface RoomUser {
  username: string;
  joinedAt: number;
}

export interface ChatState {
  username: string;
  roomCode: string;
  messages: ChatMessage[];
  users: RoomUser[];
  isJoined: boolean;
  notificationsEnabled: boolean;
  typingUsers: string[];
}
