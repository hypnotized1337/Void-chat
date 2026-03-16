import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Plus } from 'lucide-react';
import { GifPicker } from '@/components/GifPicker';
import { ReplyPreview } from '@/components/chat/ReplyPreview';
import { ReplyTo } from '@/types/chat';
import { ACCEPTED_FILE_TYPES } from '@/components/chat/FileHelpers';

interface ChatInputProps {
  input: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isInputDisabled: boolean;
  onSendGif: (url: string) => void;
  replyingTo: ReplyTo | null;
  onCancelReply: () => void;
  uploading: boolean;
  uploadProgress: number;
  uploadComplete: boolean;
  onFileUpload: (file: File) => void;
}

export function ChatInput({
  input,
  onInputChange,
  onSubmit,
  isInputDisabled,
  onSendGif,
  replyingTo,
  onCancelReply,
  uploading,
  uploadProgress,
  uploadComplete,
  onFileUpload,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileUpload(file);
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES.join(',')}
        className="hidden"
        onChange={handleFileChange}
      />

      {replyingTo && (
        <ReplyPreview replyTo={replyingTo} onCancel={onCancelReply} />
      )}

      <form onSubmit={onSubmit} className="p-3 shrink-0 relative">
        {uploading && (
          <div className="absolute top-0 left-3 right-3 h-[1px] bg-muted overflow-hidden">
            <motion.div
              className={`h-full bg-foreground ${uploadComplete ? '' : 'animate-pulse'}`}
              initial={{ width: '0%' }}
              animate={{
                width: `${uploadProgress}%`,
                opacity: uploadComplete ? [1, 1, 0] : 1,
              }}
              transition={{
                width: { duration: 0.2 },
                opacity: uploadComplete ? { duration: 0.4, times: [0, 0.5, 1] } : undefined,
              }}
            />
          </div>
        )}
        <div className="flex gap-1 items-center border border-white/10 focus-within:border-white/20 rounded-xl bg-black/60 backdrop-blur-md px-1.5 transition-colors duration-300">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isInputDisabled}
            className="p-2.5 text-muted-foreground hover:text-foreground hover:-rotate-12 transition-all active:scale-[0.95] disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
          </button>
          <GifPicker onSelect={onSendGif} disabled={isInputDisabled} />
          <input
            type="text"
            value={input}
            onChange={onInputChange}
            placeholder={isInputDisabled ? 'Chat is frozen' : 'Message'}
            disabled={isInputDisabled}
            className="flex-1 bg-transparent py-2.5 px-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            maxLength={2000}
          />
          {input.length > 1800 && (
            <span className={`text-[10px] font-mono pr-2 transition-colors ${input.length > 1950 ? 'text-destructive' : 'text-muted-foreground/60'}`}>
              {input.length}/2000
            </span>
          )}
          <motion.button
            type="submit"
            disabled={!input.trim() || isInputDisabled}
            className={`p-2.5 rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center text-foreground ${
              input.trim() ? 'bg-white/15 hover:bg-white/25' : 'bg-transparent'
            }`}
            whileTap={{ scale: 0.9, rotate: -12 }}
          >
            <Send className="w-4 h-4 ml-0.5" />
          </motion.button>
        </div>
      </form>
    </>
  );
}
