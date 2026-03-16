import { useState } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, Bell, BellOff, LogOut, Users, Lock } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';

interface ChatHeaderProps {
  isPasswordProtected: boolean;
  uiScale: number;
  onScaleChange: (val: number[]) => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  onLeave: () => void;
  onOpenMobileSidebar: () => void;
}

export function ChatHeader({
  isPasswordProtected,
  uiScale,
  onScaleChange,
  notificationsEnabled,
  onToggleNotifications,
  onLeave,
  onOpenMobileSidebar
}: ChatHeaderProps) {
  const [notificationJiggle, setNotificationJiggle] = useState(false);

  const handleNotificationToggle = () => {
    setNotificationJiggle(true);
    setTimeout(() => setNotificationJiggle(false), 600);
    onToggleNotifications();
  };

  return (
    <header className="h-14 flex items-center px-4 shrink-0 bg-card/60 backdrop-blur-xl border-b border-border/30 shadow-[0_1px_6px_rgba(0,0,0,0.4)] sticky top-0 z-20 relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent">
      <button
        onClick={onOpenMobileSidebar}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors md:hidden"
      >
        <Users className="w-4 h-4" />
      </button>
      {isPasswordProtected && (
        <div className="flex items-center gap-1 text-muted-foreground ml-2 md:ml-0">
          <Lock className="w-3 h-3" />
          <span className="text-[10px] font-mono">locked</span>
        </div>
      )}
      <div className="flex-1 flex justify-center">
        {/* Room code display removed per user request */}
      </div>
      <div className="flex items-center gap-1.5">
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-foreground transition-colors">
              <ZoomIn className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-3" side="bottom" align="end">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-muted-foreground">Scale</span>
                <span className="text-[11px] font-mono text-foreground">{uiScale}%</span>
              </div>
              <Slider
                value={[uiScale]}
                onValueChange={onScaleChange}
                min={100}
                max={150}
                step={5}
              />
            </div>
          </PopoverContent>
        </Popover>
        <motion.button
          onClick={handleNotificationToggle}
          animate={notificationJiggle ? {
            rotate: [0, -15, 15, -12, 12, -6, 6, -2, 2, 0],
          } : { rotate: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className={`w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors ${notificationsEnabled ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </motion.button>
        <button onClick={onLeave} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all active:scale-[0.95] md:hidden">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
