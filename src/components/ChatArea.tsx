import { useState, useRef, useEffect } from 'react';
import { Send, Download, Bell, BellOff, LogOut } from 'lucide-react';
import { ChatMessage } from '@/types/chat';

interface ChatAreaProps {
  messages: ChatMessage[];
  currentUser: string;
  roomCode: string;
  notificationsEnabled: boolean;
  typingUsers: string[];
  onSend: (text: string) => void;
  onTyping: () => void;
  onExport: () => void;
  onToggleNotifications: () => void;
  onLeave: () => void;
}

export function ChatArea({
  messages,
  currentUser,
  roomCode,
  notificationsEnabled,
  typingUsers,
  onSend,
  onTyping,
  onExport,
  onToggleNotifications,
  onLeave,
}: ChatAreaProps) {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input);
      setInput('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    onTyping();
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const statusLabel = (s?: string) => {
    if (s === 'read') return 'Read';
    if (s === 'delivered') return 'Delivered';
    return '';
  };

  return (
    <div className="flex-1 flex flex-col h-screen min-w-0">
      {/* Header */}
      <header className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card">
        <span className="text-sm font-medium text-foreground">{roomCode}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleNotifications}
            className={`p-2 rounded-md transition-colors ${notificationsEnabled ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
          <button onClick={onExport} className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={onLeave} className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors md:hidden">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-2">
        {messages.map((msg) => {
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="flex justify-center py-1">
                <span className="text-[11px] text-muted-foreground">{msg.text}</span>
              </div>
            );
          }

          const isOwn = msg.username === currentUser;

          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%] space-y-0.5">
                {!isOwn && (
                  <span className="text-[11px] text-muted-foreground ml-1">{msg.username}</span>
                )}
                <div
                  className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    isOwn
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}
                >
                  {msg.text}
                </div>
                <div className={`flex items-center gap-1 ${isOwn ? 'justify-end mr-1' : 'ml-1'}`}>
                  <span className="text-[10px] text-muted-foreground">{formatTime(msg.timestamp)}</span>
                  {isOwn && msg.status && (
                    <span className="text-[10px] text-muted-foreground">· {statusLabel(msg.status)}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 pb-1">
          <span className="text-[11px] text-muted-foreground">
            {typingUsers.join(', ')} typing…
          </span>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Message"
            className="flex-1 bg-input rounded-lg py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-foreground transition-colors"
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-primary text-primary-foreground p-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
