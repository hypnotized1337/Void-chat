import { useState, useRef } from 'react';
import { ArrowRight, Upload } from 'lucide-react';
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
      } catch { /* invalid */ }
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleJoin} className="w-full max-w-sm space-y-5">
        <div className="text-center mb-6">
          <h1 className="text-lg font-medium text-foreground tracking-tight">Join a room</h1>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your name"
            className="w-full bg-input rounded-md py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-foreground transition-colors"
            maxLength={20}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Room code</label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Enter room code"
            className="w-full bg-input rounded-md py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-foreground transition-colors"
            maxLength={30}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Import history (optional)</label>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full bg-input rounded-md py-2.5 px-3 text-sm text-left flex items-center gap-2 border border-border hover:border-foreground transition-colors"
          >
            <Upload className="w-4 h-4 text-muted-foreground" />
            <span className={importFileName ? 'text-foreground' : 'text-muted-foreground'}>
              {importFileName || 'Upload .json'}
            </span>
          </button>
        </div>

        <button
          type="submit"
          disabled={!username.trim() || !roomCode.trim()}
          className="w-full bg-primary text-primary-foreground font-medium py-2.5 rounded-md flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Join
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
