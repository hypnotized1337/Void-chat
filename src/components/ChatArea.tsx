import { useState, useRef, useEffect } from 'react';
import { Send, Download, Bell, BellOff, Menu, Hash, LogOut } from 'lucide-react';
import { ChatMessage } from '@/types/chat';

interface ChatAreaProps {
  messages: ChatMessage[];
  currentUser: string;
  roomCode: string;
  notificationsEnabled: boolean;
  onSend: (text: string) => void;
  onExport: () => void;
  onToggleNotifications: () => void;
  onLeave: () => void;
}

export function ChatArea({
  messages,
  currentUser,
  roomCode,
  notificationsEnabled,
  onSend,
  onExport,
  onToggleNotifications,
  onLeave,
}: ChatAreaProps) {
  const [input, setInput] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
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

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex-1 flex flex-col h-screen min-w-0">
      {/* Header */}
      <header className="h-14 glass-panel border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden text-muted-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <Hash className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">{roomCode}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleNotifications}
            className={`p-2 rounded-lg transition-colors ${notificationsEnabled ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
            title={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
          >
            {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
          <button
            onClick={onExport}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="Export chat"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onLeave}
            className="p-2 rounded-lg text-muted-foreground hover:text-destructive transition-colors md:hidden"
            title="Leave room"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile menu dropdown */}
      {mobileMenu && (
        <div className="md:hidden glass-panel border-b border-border p-3 text-sm text-muted-foreground">
          Room: <span className="text-foreground font-medium">{roomCode}</span>
          <button onClick={onLeave} className="ml-4 text-destructive text-xs">Leave</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
        {messages.map((msg) => {
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="flex justify-center">
                <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                  {msg.text}
                </span>
              </div>
            );
          }

          const isOwn = msg.username === currentUser;

          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] space-y-1`}>
                {!isOwn && (
                  <span className="text-[11px] font-medium text-muted-foreground ml-1">{msg.username}</span>
                )}
                <div
                  className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                    isOwn
                      ? 'bg-message-own text-message-own-foreground rounded-br-md'
                      : 'bg-message-other text-message-other-foreground rounded-bl-md'
                  }`}
                >
                  {msg.text}
                </div>
                <span className={`text-[10px] text-muted-foreground block ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 glass-input rounded-xl py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-primary text-primary-foreground p-2.5 rounded-xl hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
