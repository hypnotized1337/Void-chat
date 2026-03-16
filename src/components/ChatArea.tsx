import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { motion, AnimatePresence } from 'framer-motion';
import { FullscreenImageViewer } from '@/components/FullscreenImageViewer';
import { ChatMessage, ReplyTo, RoomUser } from '@/types/chat';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { FileInspector, InspectedFile } from '@/components/chat/FileInspector';
import { VideoInspector, InspectedVideo } from '@/components/chat/VideoInspector';
import { ACCEPTED_FILE_TYPES } from '@/components/chat/FileHelpers';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatInput } from '@/components/chat/ChatInput';
import React from 'react';

interface ChatAreaProps {
  messages: ChatMessage[];
  currentUser: string;
  roomCode: string;
  users: RoomUser[];
  notificationsEnabled: boolean;
  typingUsers: string[];
  frozen: boolean;
  frozenBy: string | null;
  nuking: boolean;
  uiScale: number;
  isPasswordProtected: boolean;
  onScaleChange: (val: number[]) => void;
  onSend: (text: string, replyTo?: ReplyTo) => void;
  onTyping: () => void;
  onToggleNotifications: () => void;
  onLeave: () => void;
  onEdit: (messageId: string, newText: string) => void;
  onUnsend: (messageId: string) => void;
  onSendImage: (file: File, onProgress?: (p: number) => void) => void;
  onSendGif: (url: string) => void;
}

interface MessageListProps {
  groupedMessages: { msg: ChatMessage; groupInfo: { isFirstInGroup: boolean; isLastInGroup: boolean } }[];
  nuking: boolean;
  unreadMarkerId: string | null;
  currentUser: string;
  editingId: string | null;
  editText: string;
  setFullscreenImage: (url: string | null) => void;
  setInspectedFile: (file: InspectedFile | null) => void;
  setInspectedVideo: (video: InspectedVideo | null) => void;
  handleStartEdit: (id: string, text: string) => void;
  onUnsend: (id: string) => void;
  setReplyingTo: (reply: ReplyTo | null) => void;
  scrollToMessage: (id: string) => void;
  setEditText: (text: string) => void;
  handleEditSubmit: (id: string) => void;
  handleEditCancel: () => void;
}

// Extract MessageList to prevent re-rendering all messages on minor ChatArea state changes (e.g., input typing, scrolling)
const MessageList = React.memo(({ 
  groupedMessages, 
  nuking, 
  unreadMarkerId, 
  currentUser, 
  editingId, 
  editText, 
  setFullscreenImage, 
  setInspectedFile, 
  setInspectedVideo, 
  handleStartEdit, 
  onUnsend, 
  setReplyingTo, 
  scrollToMessage, 
  setEditText, 
  handleEditSubmit, 
  handleEditCancel 
}: MessageListProps) => {
  return (
    <AnimatePresence initial={false}>
      {!nuking && groupedMessages.map(({ msg, groupInfo }, i: number) => (
        <div key={msg.id}>
          {unreadMarkerId === msg.id && (
            <div className="flex items-center gap-3 my-2 px-2">
              <div className="flex-1 unread-marker-line" />
              <span className="text-[10px] font-mono text-foreground font-semibold shrink-0">new messages</span>
              <div className="flex-1 unread-marker-line" />
            </div>
          )}
          <MessageBubble
            msg={msg}
            isOwn={msg.username === currentUser}
            currentUser={currentUser}
            index={i}
            groupInfo={groupInfo}
            onImageClick={setFullscreenImage}
            onInspectFile={setInspectedFile}
            onInspectVideo={setInspectedVideo}
            onEdit={handleStartEdit}
            onUnsend={onUnsend}
            onReply={setReplyingTo}
            onScrollToMessage={scrollToMessage}
            editingId={editingId}
            editText={editText}
            onEditTextChange={setEditText}
            onEditSubmit={handleEditSubmit}
            onEditCancel={handleEditCancel}
          />
        </div>
      ))}
    </AnimatePresence>
  );
});

export function ChatArea({
  messages,
  currentUser,
  roomCode,
  users,
  notificationsEnabled,
  typingUsers,
  frozen,
  frozenBy,
  nuking,
  isPasswordProtected,
  uiScale,
  onScaleChange,
  onSend,
  onTyping,
  onToggleNotifications,
  onLeave,
  onEdit,
  onUnsend,
  onSendImage,
  onSendGif,
}: ChatAreaProps) {
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMarkerId, setUnreadMarkerId] = useState<string | null>(null);
  const [inspectedFile, setInspectedFile] = useState<InspectedFile | null>(null);
  const [inspectedVideo, setInspectedVideo] = useState<InspectedVideo | null>(null);
  const [replyingTo, setReplyingTo] = useState<ReplyTo | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);
  const lastMessageIdRef = useRef<string | null>(null);
  const userScrolledRef = useRef(false);

  const checkIfScrolledUp = useCallback(() => {
    if (!scrollContainerRef.current) return false;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    return scrollHeight - scrollTop - clientHeight >= 100;
  }, []);

  const handleScroll = useCallback(() => {
    const scrolledUp = checkIfScrolledUp();
    setIsScrolledUp(scrolledUp);
    if (!scrolledUp) {
      setUnreadCount(0);
      setUnreadMarkerId(null);
      userScrolledRef.current = false;
    } else {
      userScrolledRef.current = true;
    }
  }, [checkIfScrolledUp]);

  const scrollToBottom = useCallback((smooth = true) => {
    endRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    setUnreadCount(0);
    setUnreadMarkerId(null);
    setIsScrolledUp(false);
    userScrolledRef.current = false;
  }, []);

  const scrollToMessage = useCallback((id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-muted/30');
      setTimeout(() => el.classList.remove('bg-muted/30'), 1500);
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (messages.length === 0) {
      lastMessageIdRef.current = null;
      return;
    }
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.id !== lastMessageIdRef.current) {
      const oldIdx = lastMessageIdRef.current
        ? messages.findIndex(m => m.id === lastMessageIdRef.current)
        : -1;
      
      if (checkIfScrolledUp() && userScrolledRef.current) {
        if (!unreadMarkerId) {
          const firstNewMsg = messages[oldIdx + 1];
          if (firstNewMsg) setUnreadMarkerId(firstNewMsg.id);
        }
        const newMsgCount = messages.length - (oldIdx + 1);
        if (newMsgCount > 0) setUnreadCount(prev => prev + newMsgCount);
      } else {
        scrollToBottom(false);
      }
      lastMessageIdRef.current = lastMsg.id;
    }
  }, [messages, checkIfScrolledUp, scrollToBottom, unreadMarkerId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input, replyingTo || undefined);
      setInput('');
      setReplyingTo(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    onTyping();
  };

  const handleEditSubmit = useCallback((messageId: string) => {
    if (editText.trim()) onEdit(messageId, editText.trim());
    setEditingId(null);
    setEditText('');
  }, [editText, onEdit]);

  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditText('');
  }, []);

  const handleStartEdit = useCallback((id: string, text: string) => {
    setEditingId(id);
    setEditText(text);
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadComplete(false);
    await onSendImage(file, (p) => setUploadProgress(p));
    setUploadComplete(true);
    setTimeout(() => {
      setUploading(false);
      setUploadProgress(0);
      setUploadComplete(false);
    }, 400);
  }, [onSendImage]);

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current++; setDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current--; if (dragCounter.current === 0) setDragging(false); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current = 0; setDragging(false); const file = e.dataTransfer.files[0]; if (file) handleFileUpload(file); };

  const isInputDisabled = frozen && frozenBy !== currentUser;

  const groupedMessages = useMemo(() => {
    return messages.map((msg, i) => {
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const isGroupable = msg.type === 'message' && !msg.deleted;
      const isFirstInGroup = !isGroupable || !prev || prev.type !== 'message' || prev.deleted || prev.username !== msg.username;
      const isLastInGroup = !isGroupable || !next || next.type !== 'message' || next.deleted || next.username !== msg.username;
      return { msg, groupInfo: { isFirstInGroup, isLastInGroup } };
    });
  }, [messages]);

  return (
    <div
      className="flex-1 flex flex-col h-screen min-w-0 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {dragging && (
        <div className="absolute inset-0 z-40 bg-background/90 flex items-center justify-center pointer-events-none">
          <span className="text-foreground text-sm font-mono">Drop file to share</span>
        </div>
      )}

      <ChatHeader
        isPasswordProtected={isPasswordProtected}
        uiScale={uiScale}
        onScaleChange={onScaleChange}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={onToggleNotifications}
        onLeave={onLeave}
        onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
      />

      {frozen && (
        <div className="px-4 py-1.5 bg-secondary text-center">
          <span className="text-[11px] text-muted-foreground">Chat frozen{frozenBy ? ` by ${frozenBy}` : ''}</span>
        </div>
      )}

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 relative">
        {!nuking && messages.length === 0 && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-mono text-muted-foreground/30 select-none void-pulse">
                say something into the void
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/15 select-none">
                messages are ephemeral
              </span>
            </div>
          </motion.div>
        )}

        <MessageList 
          groupedMessages={groupedMessages}
          nuking={nuking}
          unreadMarkerId={unreadMarkerId}
          currentUser={currentUser}
          editingId={editingId}
          editText={editText}
          setFullscreenImage={setFullscreenImage}
          setInspectedFile={setInspectedFile}
          setInspectedVideo={setInspectedVideo}
          handleStartEdit={handleStartEdit}
          onUnsend={onUnsend}
          setReplyingTo={setReplyingTo}
          scrollToMessage={scrollToMessage}
          setEditText={setEditText}
          handleEditSubmit={handleEditSubmit}
          handleEditCancel={handleEditCancel}
        />

        {/* Nuke dissolve overlay */}
        <AnimatePresence>
          {nuking && (
            <>
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeIn' }}
                className="absolute inset-0 z-10"
              >
                {Array.from({ length: 40 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{
                      opacity: 1,
                      x: `${Math.random() * 100}%`,
                      y: `${(i / 40) * 100}%`,
                      scale: 1,
                    }}
                    animate={{
                      opacity: 0,
                      y: `${(i / 40) * 100 + 30 + Math.random() * 40}%`,
                      x: `${Math.random() * 100}%`,
                      scale: 0,
                      rotate: Math.random() * 360,
                    }}
                    transition={{
                      duration: 0.6 + Math.random() * 0.4,
                      delay: (i / 40) * 0.4,
                      ease: 'easeIn',
                    }}
                    className="absolute w-1 h-1 bg-foreground"
                  />
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.0, delay: 0.9 }}
                className="absolute inset-0 flex items-center justify-center z-20"
              >
                <span className="text-xs font-mono text-muted-foreground tracking-widest">
                  [SYSTEM]: ROOM NEUTRALIZED
                </span>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div ref={endRef} />
      </div>

      <AnimatePresence>
        {isScrolledUp && (
          <motion.button
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 20 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-12 h-12 rounded-full bg-background border border-foreground flex items-center justify-center text-foreground hover:bg-foreground hover:text-background transition-colors active:scale-[0.95] shadow-lg backdrop-blur-sm"
            aria-label="Scroll to bottom"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
          >
            <ChevronDown className="w-5 h-5" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 600, damping: 15 }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-mono font-bold flex items-center justify-center border border-background"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            className="px-4 pb-1 flex items-center gap-2"
          >
            <div className="bg-message-other rounded-2xl rounded-bl-sm px-2.5 py-1.5 flex items-center gap-1">
              <span className="typing-dot w-1 h-1 rounded-full bg-muted-foreground inline-block" />
              <span className="typing-dot w-1 h-1 rounded-full bg-muted-foreground inline-block" />
              <span className="typing-dot w-1 h-1 rounded-full bg-muted-foreground inline-block" />
            </div>
            <span className="text-[10px] text-muted-foreground">{typingUsers.join(', ')}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <ChatInput
        input={input}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        isInputDisabled={isInputDisabled}
        onSendGif={onSendGif}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        uploading={uploading}
        uploadProgress={uploadProgress}
        uploadComplete={uploadComplete}
        onFileUpload={handleFileUpload}
      />

      {fullscreenImage && (
        <FullscreenImageViewer
          imageUrl={fullscreenImage}
          onClose={() => setFullscreenImage(null)}
        />
      )}

      <AnimatePresence>
        {inspectedFile && (
          <FileInspector
            file={inspectedFile}
            onClose={() => setInspectedFile(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {inspectedVideo && (
          <VideoInspector
            video={inspectedVideo}
            onClose={() => setInspectedVideo(null)}
          />
        )}
      </AnimatePresence>

      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-56">
          <SheetTitle className="sr-only">Users</SheetTitle>
          <div className="h-full">
            <ChatSidebar
              roomCode={roomCode}
              users={users}
              currentUser={currentUser}
              onLeave={() => { setMobileSidebarOpen(false); onLeave(); }}
              className="flex"
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
