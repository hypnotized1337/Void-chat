import { Hash, Users, LogOut, Sun } from 'lucide-react';
import { RoomUser } from '@/types/chat';

interface ChatSidebarProps {
  roomCode: string;
  users: RoomUser[];
  onLeave: () => void;
}

export function ChatSidebar({ roomCode, users, onLeave }: ChatSidebarProps) {
  return (
    <div className="w-64 h-full glass-panel border-r border-border flex flex-col shrink-0 hidden md:flex">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sun className="w-4 h-4 text-primary" />
        </div>
        <span className="font-bold text-sm tracking-tight text-foreground">HELIOS</span>
      </div>

      {/* Room */}
      <div className="p-4 border-b border-border">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Room</p>
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Hash className="w-3.5 h-3.5 text-primary" />
          <span className="font-medium truncate">{roomCode}</span>
        </div>
      </div>

      {/* Online */}
      <div className="flex-1 p-4 overflow-y-auto scrollbar-thin">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Online — {users.length}</p>
        </div>
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.username} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md">
              <div className="w-2 h-2 rounded-full bg-online" />
              <span className="text-sm text-secondary-foreground truncate">{u.username}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Leave */}
      <div className="p-4 border-t border-border">
        <button
          onClick={onLeave}
          className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors py-2 rounded-lg hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4" />
          Leave Room
        </button>
      </div>
    </div>
  );
}
