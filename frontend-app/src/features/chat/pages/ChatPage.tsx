import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  MessageSquare, Send, Loader2, Search, ChevronLeft,
} from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import { chatApi } from "@/api/chat.api";
import { studentsApi } from "@/api/students.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChatMessage, ConversationItem } from "@/types";

// ─── Utils ────────────────────────────────────────────────────────────────────

function msgTime(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Ayer";
  return format(d, "d MMM", { locale: es });
}

function msgFullTime(iso: string) {
  return format(new Date(iso), "d MMM, HH:mm", { locale: es });
}

// ─── ConversationListItem ─────────────────────────────────────────────────────

const ConversationListItem = ({
  conv,
  active,
  onClick,
}: {
  conv: ConversationItem;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "w-full flex items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 border-b border-border last:border-0",
      active && "bg-muted/60"
    )}
  >
    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center shrink-0">
      {conv.student.firstName[0]}{conv.student.lastName[0]}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-1">
        <p className="text-sm font-medium truncate">
          {conv.student.firstName} {conv.student.lastName}
        </p>
        {conv.lastMessage && (
          <span className="text-[10px] text-muted-foreground shrink-0">
            {msgTime(conv.lastMessage.createdAt)}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-1 mt-0.5">
        <p className="text-xs text-muted-foreground truncate flex-1">
          {conv.lastMessage
            ? `${conv.lastMessage.senderRole === "TRAINER" ? "Vos: " : ""}${conv.lastMessage.body}`
            : "Sin mensajes"}
        </p>
        {conv.unreadCount > 0 && (
          <Badge className="h-4 min-w-[1rem] px-1 text-[10px] leading-none shrink-0">
            {conv.unreadCount}
          </Badge>
        )}
      </div>
    </div>
  </button>
);

// ─── MessageBubble ────────────────────────────────────────────────────────────

const MessageBubble = ({
  msg,
  isMine,
}: {
  msg: ChatMessage;
  isMine: boolean;
}) => (
  <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
    <div
      className={cn(
        "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm break-words",
        isMine
          ? "bg-primary text-primary-foreground rounded-br-sm"
          : "bg-muted text-foreground rounded-bl-sm"
      )}
      title={msgFullTime(msg.createdAt)}
    >
      <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
      <p className={cn("text-[10px] mt-1 text-right", isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
        {format(new Date(msg.createdAt), "HH:mm")}
        {isMine && msg.readAt && <span className="ml-1">✓</span>}
      </p>
    </div>
  </div>
);

// ─── MessageThread ────────────────────────────────────────────────────────────

const POLL_INTERVAL = 3000;

const MessageThread = ({
  conversationId,
  myRole = "TRAINER",
}: {
  conversationId: string;
  myRole?: "TRAINER" | "STUDENT";
}) => {
  const qc = useQueryClient();
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [since, setSince] = useState<string | undefined>(undefined);
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);

  // Initial load (no since)
  const { data: initialData, isLoading } = useQuery({
    queryKey: ["chat-messages-initial", conversationId],
    queryFn: () => chatApi.getMessages(conversationId).then((r) => r.data.data),
    enabled: !!conversationId,
    staleTime: Infinity,
  });

  // Polling (with since)
  const { data: pollData } = useQuery({
    queryKey: ["chat-messages-poll", conversationId, since],
    queryFn: () =>
      chatApi.getMessages(conversationId, { since }).then((r) => r.data.data),
    enabled: !!conversationId && !!since,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });

  // Init messages from first load
  useEffect(() => {
    if (!initialData || initialized.current) return;
    initialized.current = true;
    setAllMessages(initialData.messages);
    if (initialData.messages.length > 0) {
      setSince(initialData.messages.at(-1)!.createdAt);
    } else {
      setSince(new Date(0).toISOString());
    }
  }, [initialData]);

  // Merge poll results
  useEffect(() => {
    if (!pollData?.messages.length) return;
    setAllMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const fresh = pollData.messages.filter((m) => !existingIds.has(m.id));
      if (!fresh.length) return prev;
      const updated = [...prev, ...fresh];
      setSince(updated.at(-1)!.createdAt);
      return updated;
    });
  }, [pollData]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length]);

  // Mark read automatically
  const markRead = useMutation({
    mutationFn: (readBefore: string) => chatApi.markRead(conversationId, readBefore),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-conversations"] }),
  });

  useEffect(() => {
    if (allMessages.length > 0) {
      markRead.mutate(new Date().toISOString());
    }
  }, [allMessages.length]);

  // Send message
  const sendMut = useMutation({
    mutationFn: (text: string) => chatApi.sendMessage(conversationId, text),
    onSuccess: (r) => {
      const msg = r.data.data;
      setAllMessages((prev) => {
        const exists = prev.some((m) => m.id === msg.id);
        return exists ? prev : [...prev, msg];
      });
      setSince(msg.createdAt);
      setBody("");
      setTimeout(() => inputRef.current?.focus(), 50);
    },
  });

  const handleSend = useCallback(() => {
    const text = body.trim();
    if (!text || sendMut.isPending) return;
    sendMut.mutate(text);
  }, [body, sendMut]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <MessageSquare className="w-8 h-8 opacity-30" />
            <p className="text-sm">Todavía no hay mensajes. ¡Empezá la conversación!</p>
          </div>
        ) : (
          allMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isMine={msg.senderRole === myRole}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-3 py-2.5 flex gap-2 items-end bg-background">
        <textarea
          ref={inputRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribí un mensaje… (Enter para enviar)"
          className="flex-1 resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 max-h-32 min-h-[2.5rem] overflow-y-auto"
          rows={1}
        />
        <Button
          size="icon"
          className="rounded-xl shrink-0"
          disabled={!body.trim() || sendMut.isPending}
          onClick={handleSend}
        >
          {sendMut.isPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const ChatPage = () => {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [activeConvId, setActiveConvId] = useState<string | null>(
    searchParams.get("conv")
  );
  const [activeStudent, setActiveStudent] = useState<{ firstName: string; lastName: string } | null>(null);
  const [mobileShowThread, setMobileShowThread] = useState(!!searchParams.get("conv"));

  const { data: convData, isLoading } = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: () => chatApi.getConversations().then((r) => r.data.data),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-list-all"],
    queryFn: () => studentsApi.list({ limit: 200 }).then((r) => r.data.data.items),
  });

  const openConvMut = useMutation({
    mutationFn: (studentId: string) => chatApi.getOrCreateConversation(studentId),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      setActiveConvId(r.data.data.conversationId);
      setSearchParams({ conv: r.data.data.conversationId });
      setMobileShowThread(true);
    },
  });

  const handleSelectConv = (conv: ConversationItem) => {
    setActiveConvId(conv.id);
    setActiveStudent(conv.student);
    setSearchParams({ conv: conv.id });
    setMobileShowThread(true);
  };

  const handleSelectStudent = (studentId: string, firstName: string, lastName: string) => {
    setActiveStudent({ firstName, lastName });
    openConvMut.mutate(studentId);
  };

  const conversations = convData?.conversations ?? [];
  const convStudentIds = new Set(conversations.map((c) => c.student.id));
  const studentsWithoutConv = students.filter((s) => !convStudentIds.has(s.id));

  const filteredConvs = conversations.filter((c) => {
    const name = `${c.student.firstName} ${c.student.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });
  const filteredStudents = studentsWithoutConv.filter((s) => {
    const name = `${s.firstName} ${s.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  // Sync activeStudent name from conv list
  useEffect(() => {
    if (activeConvId && !activeStudent) {
      const found = conversations.find((c) => c.id === activeConvId);
      if (found) setActiveStudent(found.student);
    }
  }, [conversations, activeConvId]);

  return (
    <div className="flex h-[calc(100dvh-4rem)] border border-border rounded-xl overflow-hidden bg-background">
      {/* Left: conversation list */}
      <div
        className={cn(
          "w-full md:w-72 lg:w-80 flex flex-col border-r border-border shrink-0",
          mobileShowThread && "hidden md:flex"
        )}
      >
        {/* Header */}
        <div className="px-3 pt-3 pb-2 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="font-semibold text-sm flex-1">Chat</h2>
            {(convData?.totalUnread ?? 0) > 0 && (
              <Badge className="h-5 px-1.5 text-xs">{convData!.totalUnread}</Badge>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              className="pl-7 h-8 text-xs"
              placeholder="Buscar alumno…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : (
            <>
              {filteredConvs.map((conv) => (
                <ConversationListItem
                  key={conv.id}
                  conv={conv}
                  active={activeConvId === conv.id}
                  onClick={() => handleSelectConv(conv)}
                />
              ))}
              {filteredStudents.length > 0 && (
                <>
                  {filteredConvs.length > 0 && (
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 pt-3 pb-1">
                      Otros alumnos
                    </p>
                  )}
                  {filteredStudents.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={openConvMut.isPending}
                      onClick={() => handleSelectStudent(s.id, s.firstName, s.lastName)}
                      className="w-full flex items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 border-b border-border last:border-0"
                    >
                      <div className="w-9 h-9 rounded-full bg-muted text-muted-foreground text-sm font-semibold flex items-center justify-center shrink-0">
                        {s.firstName[0]}{s.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.firstName} {s.lastName}</p>
                        <p className="text-xs text-muted-foreground">Iniciar conversación</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {filteredConvs.length === 0 && filteredStudents.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  Sin resultados para "{search}"
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right: message thread */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0",
          !mobileShowThread && "hidden md:flex"
        )}
      >
        {activeConvId && activeStudent ? (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Button
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                onClick={() => setMobileShowThread(false)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center">
                {activeStudent.firstName[0]}{activeStudent.lastName[0]}
              </div>
              <p className="text-sm font-semibold">
                {activeStudent.firstName} {activeStudent.lastName}
              </p>
            </div>
            <MessageThread conversationId={activeConvId} myRole="TRAINER" />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <MessageSquare className="w-10 h-10 opacity-20" />
            <p className="text-sm">Seleccioná un alumno para chatear</p>
          </div>
        )}
      </div>
    </div>
  );
};
