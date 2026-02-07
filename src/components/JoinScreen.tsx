import { useState, useRef } from 'react';
import { Sun, ArrowRight, Upload, Hash, User } from 'lucide-react';
import { ChatMessage } from '@/types/chat';

interface JoinScreenProps {
  onJoin: (username: string, roomCode: string, importedMessages?: ChatMessage[]) => void;
}

export function JoinScreen({ onJoin }: JoinScreenProps) {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [importedMessages, setImportedMessages] = useState<ChatMessage[] | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (Array.isArray(data)) {
          setImportedMessages(data);
          setImportFileName(file.name);
        }
      } catch {
        // invalid JSON
      }
    };
    reader.readAsText(file);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && roomCode.trim()) {
      onJoin(username.trim(), roomCode.trim(), importedMessages ?? undefined);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

      <form onSubmit={handleJoin} className="glass-panel rounded-2xl p-8 w-full max-w-md space-y-6 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-2">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center glow-primary">
            <Sun className="w-7 h-7 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">HELIOS</h1>
            <p className="text-sm text-muted-foreground mt-1">Private. Ephemeral. Instant.</p>
          </div>
        </div>

        {/* Username */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Username</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              className="w-full glass-input rounded-lg py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              maxLength={20}
              required
            />
          </div>
        </div>

        {/* Room Code */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Room Code</label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="Enter room code"
              className="w-full glass-input rounded-lg py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              maxLength={30}
              required
            />
          </div>
        </div>

        {/* Import */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Import History (optional)</label>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full glass-input rounded-lg py-2.5 px-4 text-sm text-left flex items-center gap-2 hover:border-primary/30 transition-colors"
          >
            <Upload className="w-4 h-4 text-muted-foreground" />
            <span className={importFileName ? 'text-foreground' : 'text-muted-foreground'}>
              {importFileName || 'Upload helios_chat.json'}
            </span>
          </button>
        </div>

        {/* Join Button */}
        <button
          type="submit"
          disabled={!username.trim() || !roomCode.trim()}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Join Room
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
