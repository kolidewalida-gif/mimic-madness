import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useDirectMessages } from "@/hooks/useDirectMessages";
import { cn } from "@/lib/utils";
import { playInkSound } from "@/hooks/useInkSoundEffects";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friend: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const DirectMessageDialog = ({ open, onOpenChange, friend }: Props) => {
  const { user } = useAuth();
  const { messages, loading, send, markRead } = useDirectMessages(friend?.user_id ?? null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) markRead();
  }, [open, markRead, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, open]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    playInkSound("brushTap", 0.35);
    await send(text);
    setText("");
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-md overflow-hidden border-primary/30 bg-background/95 p-0 backdrop-blur-xl">
        <DialogHeader className="px-5 py-4 border-b border-border/40 bg-gradient-to-r from-primary/10 via-background to-background">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-primary/40">
              <AvatarImage src={friend?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary font-bold">
                {friend?.display_name?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base truncate">{friend?.display_name || "Ami"}</DialogTitle>
              <div className="text-[11px] text-muted-foreground">Conversation privée</div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[min(420px,calc(100dvh-9rem))]">
          <div ref={scrollRef} className="px-4 py-4 space-y-2">
            {loading && messages.length === 0 ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-12">
                Aucun message. Envoie le premier !
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={cn("flex", mine ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[78%] px-3.5 py-2 rounded-2xl text-sm leading-snug break-words shadow-sm",
                          mine
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted/60 text-foreground rounded-bl-sm border border-border/40"
                        )}
                      >
                        {m.content}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border/40 p-3 flex items-center gap-2 bg-background/60">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Écris un message…"
            className="flex-1 bg-background/70"
            maxLength={1000}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="shrink-0"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
