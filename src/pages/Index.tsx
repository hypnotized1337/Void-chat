import { useState } from 'react';
import { useChat } from '@/hooks/use-chat';
import { JoinScreen } from '@/components/JoinScreen';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ChatArea } from '@/components/ChatArea';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminAuthOverlay } from '@/components/AdminAuthOverlay';

const Index = () => {
  const {
    state, joinRoom, leaveRoom, sendMessage, sendTyping,
    toggleNotifications, nukeRoom, freezeChat, sendAnnouncement, editMessage, unsendMessage, sendImage, sendGif,
    checkUsernameAvailable,
  } = useChat();
  const [adminOpen, setAdminOpen] = useState(false);
  const [authOverlay, setAuthOverlay] = useState(false);

  const handleSend = (text: string) => {
    if (text.trim() === '/admin') {
      if (sessionStorage.getItem('is_admin') === 'true') {
        setAdminOpen(true);
      } else {
        setAuthOverlay(true);
      }
      return;
    }
    sendMessage(text);
  };

  const handleJoin = async (username: string, roomCode: string) => {
    // Admin bypass: skip duplicate check
    const isAdmin = sessionStorage.getItem('is_admin') === 'true';
    if (!isAdmin) {
      const available = await checkUsernameAvailable(username, roomCode);
      if (!available) {
        return { error: 'Identity Conflict: This name is currently occupied in this room.' };
      }
    }
    joinRoom(username, roomCode);
    return { error: null };
  };

  if (!state.isJoined) {
    return <JoinScreen onJoin={handleJoin} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <ChatSidebar
        roomCode={state.roomCode}
        users={state.users}
        onLeave={leaveRoom}
      />
      <ChatArea
        messages={state.messages}
        currentUser={state.username}
        roomCode={state.roomCode}
        notificationsEnabled={state.notificationsEnabled}
        typingUsers={state.typingUsers}
        frozen={state.frozen}
        frozenBy={state.frozenBy}
        onSend={handleSend}
        onTyping={sendTyping}
        onToggleNotifications={toggleNotifications}
        onLeave={leaveRoom}
        onEdit={editMessage}
        onUnsend={unsendMessage}
        onSendImage={sendImage}
        onSendGif={sendGif}
      />
      {authOverlay && (
        <AdminAuthOverlay
          onSuccess={() => { setAuthOverlay(false); setAdminOpen(true); }}
          onCancel={() => setAuthOverlay(false)}
        />
      )}
      {adminOpen && (
        <AdminPanel
          messages={state.messages}
          userCount={state.users.length}
          frozen={state.frozen}
          onNuke={() => { nukeRoom(); setAdminOpen(false); }}
          onFreeze={freezeChat}
          onAnnounce={sendAnnouncement}
          onClose={() => setAdminOpen(false)}
        />
      )}
    </div>
  );
};

export default Index;
