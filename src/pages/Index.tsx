import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/api";

// ─── Types ──────────────────────────────────────────────────────────────────

interface User { id: number; username: string; display_name: string; bio: string; avatar_url: string; is_online: boolean; }
interface Chat { id: number; partner_id: number; partner_username: string; partner_name: string; partner_avatar: string; partner_online: boolean; last_msg: string; last_time: string; unread: number; }
interface Message { id: number; sender_id: number; text: string; created_at: string; is_read: boolean; }
interface Group { id: number; name: string; description: string; avatar_url: string; invite_link: string; members_count: number; role: string; }
interface GMessage { id: number; sender_id: number; sender_username: string; sender_name: string; text: string; created_at: string; }
interface Channel { id: number; name: string; username: string; description: string; avatar_url: string; subscribers_count: number; subscribed: boolean; }
interface Post { id: number; text: string; image_url: string; views: number; created_at: string; }
interface StoryUser { user_id: number; username: string; display_name: string; avatar_url: string; has_unviewed: boolean; stories: Story[]; }
interface Story { id: number; text: string; image_url: string; views: number; created_at: string; viewed: boolean; }

// ─── Shared UI ──────────────────────────────────────────────────────────────

function Av({ letter, online, size = "md" }: { letter?: string; online?: boolean; size?: "xs" | "sm" | "md" | "lg" | "xl" }) {
  const sz = { xs: "w-6 h-6 text-[9px]", sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base", xl: "w-20 h-20 text-2xl" }[size];
  return (
    <div className="relative flex-shrink-0">
      <div className={`${sz} rounded-full flex items-center justify-center font-bold select-none`}
        style={{ fontFamily: "'Orbitron',sans-serif", background: "linear-gradient(135deg,rgba(0,245,255,.25),rgba(139,92,246,.25))", border: "1px solid rgba(0,245,255,.35)", color: "#00f5ff" }}>
        {(letter || "?")[0].toUpperCase()}
      </div>
      {online !== undefined && <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${online ? "status-online" : "status-offline"}`} />}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", className = "", disabled = false }:
  { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "danger"; className?: string; disabled?: boolean }) {
  const v = {
    primary: { background: "linear-gradient(135deg,#00f5ff,#8b5cf6)", color: "#0a0f1a", border: "none" },
    ghost: { background: "rgba(255,255,255,0.05)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.1)" },
    danger: { background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[.98] disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={v}>
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder, type = "text", className = "" }:
  { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full px-4 py-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all ${className}`}
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
      onFocus={e => (e.target.style.borderColor = "rgba(0,245,255,0.4)")}
      onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-md rounded-2xl glass-strong animate-scale-in overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <span className="font-bold text-sm tracking-wider" style={{ fontFamily: "'Orbitron',sans-serif", color: "#00f5ff" }}>{title}</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><Icon name="X" size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function timeAgo(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
  if (diff < 86400) return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

function AuthScreen({ onAuth }: { onAuth: (user: User) => void }) {
  const [step, setStep] = useState<"phone" | "code" | "profile">("phone");
  const [phone, setPhone] = useState("+7");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) { const t = setTimeout(() => setCountdown(c => c - 1), 1000); return () => clearTimeout(t); }
  }, [countdown]);

  const handleSendCode = async () => {
    setError(""); setLoading(true);
    const res = await api.sendCode(phone);
    setLoading(false);
    if (res.ok) { setStep("code"); setCountdown(60); }
    else setError(res.error || "Ошибка отправки");
  };

  const handleVerify = async () => {
    setError(""); setLoading(true);
    const res = await api.verifyCode(phone, code);
    setLoading(false);
    if (res.ok) {
      localStorage.setItem("ap_token", res.token);
      setToken(res.token);
      setIsNew(res.is_new);
      if (res.is_new || !res.username) setStep("profile");
      else {
        const me = await api.getMe();
        onAuth(me);
      }
    } else setError(res.error || "Неверный код");
  };

  const handleProfile = async () => {
    setError(""); setLoading(true);
    const res = await api.setupProfile({ username, display_name: displayName, bio });
    setLoading(false);
    if (res.ok) {
      const me = await api.getMe();
      onAuth(me);
    } else setError(res.error || "Ошибка");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-10" style={{ background: "radial-gradient(circle,#00f5ff,transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-8" style={{ background: "radial-gradient(circle,#8b5cf6,transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute inset-0 bg-grid opacity-40" />
      </div>

      <div className="relative z-10 w-full max-w-sm px-4 animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 animate-pulse-neon"
            style={{ background: "linear-gradient(135deg,rgba(0,245,255,.15),rgba(139,92,246,.15))", border: "2px solid rgba(0,245,255,.5)" }}>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: "1.4rem", color: "#00f5ff" }}>AP</span>
          </div>
          <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: "1.3rem", color: "#00f5ff", letterSpacing: "0.08em" }}>ALISTER PRIME</h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">Защищённый мессенджер</p>
        </div>

        <div className="rounded-2xl glass-strong p-6 space-y-4">
          {step === "phone" && (
            <>
              <div>
                <p className="text-xs text-muted-foreground mb-3 text-center">Введите номер телефона для входа</p>
                <Input value={phone} onChange={setPhone} placeholder="+79991234567" type="tel" />
              </div>
              {error && <p className="text-xs text-red-400 text-center">{error}</p>}
              <Btn onClick={handleSendCode} disabled={loading || phone.length < 10} className="w-full">
                {loading ? "Отправка..." : "Получить код"}
              </Btn>
              <div className="flex items-center gap-2 justify-center mt-2">
                <Icon name="ShieldCheck" size={12} style={{ color: "#00f5ff" }} />
                <span className="text-[10px] text-muted-foreground">Сквозное шифрование · Без рекламы</span>
              </div>
            </>
          )}

          {step === "code" && (
            <>
              <p className="text-xs text-muted-foreground text-center">Код отправлен на {phone}</p>
              <Input value={code} onChange={setCode} placeholder="000000" type="text" className="text-center text-2xl tracking-[0.4em] font-bold" />
              {error && <p className="text-xs text-red-400 text-center">{error}</p>}
              <Btn onClick={handleVerify} disabled={loading || code.length < 4} className="w-full">
                {loading ? "Проверка..." : "Войти"}
              </Btn>
              <div className="flex justify-between items-center">
                <button onClick={() => setStep("phone")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Изменить номер</button>
                {countdown > 0
                  ? <span className="text-xs text-muted-foreground">Повтор через {countdown}с</span>
                  : <button onClick={handleSendCode} className="text-xs transition-colors" style={{ color: "#00f5ff" }}>Отправить снова</button>}
              </div>
            </>
          )}

          {step === "profile" && (
            <>
              <p className="text-xs text-muted-foreground text-center">Создайте свой профиль</p>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Юзернейм *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                    <Input value={username} onChange={v => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="myusername" className="pl-7" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Только a-z, 0-9 и _ · Минимум 3 символа</p>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Имя</label>
                  <Input value={displayName} onChange={setDisplayName} placeholder="Ваше имя" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">О себе</label>
                  <Input value={bio} onChange={setBio} placeholder="Пару слов о себе..." />
                </div>
              </div>
              {error && <p className="text-xs text-red-400 text-center">{error}</p>}
              <Btn onClick={handleProfile} disabled={loading || username.length < 3} className="w-full">
                {loading ? "Сохранение..." : "Создать профиль"}
              </Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── STORIES BAR ─────────────────────────────────────────────────────────────

function StoriesBar({ currentUser, onAddStory }: { currentUser: User; onAddStory: () => void }) {
  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);
  const [activeStory, setActiveStory] = useState<{ user: StoryUser; idx: number } | null>(null);

  useEffect(() => {
    api.getStories().then(r => { if (r.stories) setStoryUsers(r.stories); });
  }, []);

  const openStory = (user: StoryUser) => {
    setActiveStory({ user, idx: 0 });
    api.viewStory(user.stories[0].id);
  };

  const nextStory = () => {
    if (!activeStory) return;
    const { user, idx } = activeStory;
    if (idx + 1 < user.stories.length) {
      const newIdx = idx + 1;
      setActiveStory({ user, idx: newIdx });
      api.viewStory(user.stories[newIdx].id);
    } else setActiveStory(null);
  };

  const myStory = storyUsers.find(s => s.user_id === currentUser.id);

  return (
    <>
      <div className="flex gap-3 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {/* Add my story */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group" onClick={onAddStory}>
          <div className="relative w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-105"
            style={{ background: "linear-gradient(135deg,rgba(0,245,255,.15),rgba(139,92,246,.15))", border: myStory ? "2px solid #00f5ff" : "2px dashed rgba(0,245,255,.4)" }}>
            <Av letter={currentUser.display_name || currentUser.username} size="lg" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#00f5ff,#8b5cf6)", border: "2px solid hsl(var(--background))" }}>
              <Icon name="Plus" size={10} style={{ color: "#0a0f1a" }} />
            </div>
          </div>
          <span className="text-[9px] text-muted-foreground max-w-[56px] truncate">Моя история</span>
        </div>

        {storyUsers.filter(u => u.user_id !== currentUser.id).map(u => (
          <div key={u.user_id} className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group" onClick={() => openStory(u)}>
            <div className="w-14 h-14 rounded-full p-[2px] transition-transform group-hover:scale-105"
              style={{ background: u.has_unviewed ? "linear-gradient(135deg,#00f5ff,#8b5cf6)" : "rgba(255,255,255,0.1)" }}>
              <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: "hsl(var(--background))" }}>
                <Av letter={u.display_name || u.username} size="lg" />
              </div>
            </div>
            <span className="text-[9px] text-muted-foreground max-w-[56px] truncate">{u.display_name || u.username}</span>
          </div>
        ))}
      </div>

      {/* Story viewer */}
      {activeStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.95)" }} onClick={nextStory}>
          <div className="relative w-full max-w-sm h-full max-h-[85vh] flex flex-col items-center justify-center p-6 animate-scale-in">
            <div className="absolute top-4 left-4 right-4 flex gap-1">
              {activeStory.user.stories.map((_, i) => (
                <div key={i} className="h-0.5 flex-1 rounded-full" style={{ background: i <= activeStory.idx ? "#00f5ff" : "rgba(255,255,255,0.2)" }} />
              ))}
            </div>
            <div className="absolute top-8 left-4 flex items-center gap-2">
              <Av letter={activeStory.user.display_name} size="sm" />
              <span className="text-sm font-semibold text-white">@{activeStory.user.username}</span>
              <span className="text-xs text-white/50">{timeAgo(activeStory.user.stories[activeStory.idx].created_at)}</span>
            </div>
            <button onClick={e => { e.stopPropagation(); setActiveStory(null); }}
              className="absolute top-8 right-4 text-white/60 hover:text-white">
              <Icon name="X" size={20} />
            </button>
            <div className="text-center">
              {activeStory.user.stories[activeStory.idx].image_url && (
                <img src={activeStory.user.stories[activeStory.idx].image_url} className="max-h-64 rounded-2xl mb-4 mx-auto" alt="" />
              )}
              <p className="text-white text-lg font-medium">{activeStory.user.stories[activeStory.idx].text}</p>
              <p className="text-white/40 text-xs mt-2">{activeStory.user.stories[activeStory.idx].views} просмотров</p>
            </div>
            <p className="absolute bottom-8 text-white/30 text-xs">Нажмите для продолжения</p>
          </div>
        </div>
      )}
    </>
  );
}

// ─── CHAT VIEW ───────────────────────────────────────────────────────────────

function ChatView({ chat, currentUserId }: { chat: Chat; currentUserId: number }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadMsgs = useCallback(async () => {
    const r = await api.getMessages(chat.id);
    if (r.messages) setMessages(r.messages);
  }, [chat.id]);

  useEffect(() => { loadMsgs(); const t = setInterval(loadMsgs, 3000); return () => clearInterval(t); }, [loadMsgs]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    setLoading(true);
    const msg = await api.sendMessage(chat.id, text);
    setText("");
    if (msg.id) setMessages(p => [...p, msg]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-3.5 glass border-b border-white/5">
        <Av letter={chat.partner_name || chat.partner_username} online={chat.partner_online} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{chat.partner_name || chat.partner_username}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(0,245,255,.1)", color: "#00f5ff", border: "1px solid rgba(0,245,255,.25)" }}>
              <Icon name="Lock" size={8} className="inline mr-1" />E2E
            </span>
          </div>
          <span className="text-xs" style={{ color: chat.partner_online ? "#00f5ff" : "hsl(var(--muted-foreground))" }}>
            @{chat.partner_username} · {chat.partner_online ? "в сети" : "не в сети"}
          </span>
        </div>
        <div className="flex gap-2">
          <button className="p-2 rounded-xl hover:bg-white/5 transition-colors" style={{ color: "#00f5ff" }}><Icon name="Phone" size={16} /></button>
          <button className="p-2 rounded-xl hover:bg-white/5 transition-colors" style={{ color: "#00f5ff" }}><Icon name="Video" size={16} /></button>
          <button className="p-2 rounded-xl hover:bg-white/5 transition-colors text-muted-foreground"><Icon name="MoreVertical" size={16} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 bg-grid">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <Icon name="MessageCircle" size={32} style={{ color: "#00f5ff" }} />
            <p className="text-sm text-muted-foreground mt-2">Начните диалог</p>
          </div>
        )}
        {messages.map(m => {
          const out = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`flex ${out ? "justify-end" : "justify-start"} animate-fade-in`}>
              <div className={`max-w-xs px-4 py-2.5 rounded-2xl ${out ? "message-bubble-out rounded-br-sm" : "message-bubble-in rounded-bl-sm"}`}>
                <p className="text-sm leading-relaxed">{m.text}</p>
                <div className="flex items-center gap-1 mt-1 justify-end">
                  {out && <Icon name="Lock" size={8} style={{ color: "#00f5ff" }} />}
                  <span className="text-[10px] text-muted-foreground">{timeAgo(m.created_at)}</span>
                  {out && <Icon name="CheckCheck" size={10} style={{ color: m.is_read ? "#00f5ff" : "hsl(var(--muted-foreground))" }} />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="px-4 py-3 border-t border-white/5 glass">
        <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <input className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
            placeholder="Зашифрованное сообщение..." value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()} />
          <button onClick={send} disabled={loading || !text.trim()}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#00f5ff,#8b5cf6)", color: "#0a0f1a" }}>
            <Icon name="Send" size={14} />
          </button>
        </div>
        <div className="flex items-center gap-1 mt-1.5 px-1">
          <Icon name="ShieldCheck" size={9} style={{ color: "#00f5ff" }} />
          <span className="text-[9px]" style={{ color: "#00f5ff", opacity: .6 }}>Сквозное шифрование активно</span>
        </div>
      </div>
    </div>
  );
}

// ─── GROUP CHAT VIEW ─────────────────────────────────────────────────────────

function GroupChatView({ group, currentUser }: { group: Group; currentUser: User }) {
  const [messages, setMessages] = useState<GMessage[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const r = await api.getGroupMessages(group.id);
    if (r.messages) setMessages(r.messages);
  }, [group.id]);

  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    const msg = await api.sendGroupMessage(group.id, text);
    setText("");
    if (msg.id) setMessages(p => [...p, msg]);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-3.5 glass border-b border-white/5">
        <Av letter={group.name} />
        <div className="flex-1">
          <span className="font-semibold text-sm">{group.name}</span>
          <p className="text-xs text-muted-foreground">{group.members_count} участников</p>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px]" style={{ background: "rgba(139,92,246,.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,.3)" }}>
          <Icon name="Users" size={10} />
          <span>Группа</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-grid">
        {messages.map(m => {
          const out = m.sender_id === currentUser.id;
          return (
            <div key={m.id} className={`flex ${out ? "justify-end" : "justify-start"} gap-2 animate-fade-in`}>
              {!out && <Av letter={m.sender_name} size="xs" />}
              <div className={`max-w-xs px-3 py-2 rounded-2xl ${out ? "message-bubble-out rounded-br-sm" : "message-bubble-in rounded-bl-sm"}`}>
                {!out && <p className="text-[10px] font-semibold mb-1" style={{ color: "#00f5ff" }}>@{m.sender_username}</p>}
                <p className="text-sm">{m.text}</p>
                <p className="text-[9px] text-muted-foreground mt-1 text-right">{timeAgo(m.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="px-4 py-3 border-t border-white/5 glass">
        <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <input className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
            placeholder="Сообщение в группу..." value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()} />
          <button onClick={send} disabled={!text.trim()}
            className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#00f5ff,#8b5cf6)", color: "#0a0f1a" }}>
            <Icon name="Send" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CHANNEL VIEW ─────────────────────────────────────────────────────────────

function ChannelView({ channel, currentUser, onSubscribe }: { channel: Channel; currentUser: User; onSubscribe: () => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const isOwner = channel.subscribed;

  useEffect(() => {
    api.getChannelPosts(channel.id).then(r => { if (r.posts) setPosts(r.posts); });
  }, [channel.id]);

  const publish = async () => {
    if (!text.trim()) return;
    const res = await api.publishPost(channel.id, text);
    if (res.ok) {
      setText("");
      const r = await api.getChannelPosts(channel.id);
      if (r.posts) setPosts(r.posts);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 glass border-b border-white/5">
        <div className="flex items-center gap-3">
          <Av letter={channel.name} size="lg" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold">{channel.name}</span>
              <span className="text-xs text-muted-foreground">@{channel.username}</span>
            </div>
            <p className="text-xs text-muted-foreground">{channel.subscribers_count} подписчиков</p>
          </div>
          {!channel.subscribed && (
            <Btn onClick={async () => { await api.subscribeChannel(channel.id); onSubscribe(); }} variant="ghost">Подписаться</Btn>
          )}
        </div>
        {channel.description && <p className="text-sm text-muted-foreground mt-2">{channel.description}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {posts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <Icon name="Rss" size={32} style={{ color: "#00f5ff" }} />
            <p className="text-sm text-muted-foreground mt-2">Пока нет публикаций</p>
          </div>
        )}
        {posts.map(p => (
          <div key={p.id} className="p-4 rounded-2xl glass animate-fade-in">
            <p className="text-sm leading-relaxed">{p.text}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] text-muted-foreground">{timeAgo(p.created_at)}</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Icon name="Eye" size={10} />{p.views}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Publish panel (only for owner — check by comparing) */}
      <div className="px-4 py-3 border-t border-white/5 glass">
        <div className="flex gap-2">
          <input className="flex-1 px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 outline-none text-foreground placeholder:text-muted-foreground"
            placeholder="Опубликовать в канал..." value={text} onChange={e => setText(e.target.value)} />
          <button onClick={publish} disabled={!text.trim()}
            className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#00f5ff,#8b5cf6)", color: "#0a0f1a" }}>
            <Icon name="Send" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SEARCH PANEL ─────────────────────────────────────────────────────────────

function SearchPanel({ onStartChat }: { onStartChat: (username: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const r = await api.searchUsers(q);
      setResults(r.users || []);
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="px-5 py-4 border-b border-white/5 glass">
        <h2 className="font-bold text-sm tracking-wider mb-3" style={{ fontFamily: "'Orbitron',sans-serif", color: "#00f5ff" }}>ПОИСК ЛЮДЕЙ</h2>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,245,255,0.2)" }}>
          <Icon name="Search" size={15} style={{ color: "#00f5ff" }} />
          <input className="bg-transparent flex-1 text-sm outline-none text-foreground placeholder:text-muted-foreground"
            placeholder="Поиск по юзернейму @..." value={q} onChange={e => setQ(e.target.value.replace(/^@+/, ""))} />
          {loading && <Icon name="Loader" size={14} className="animate-spin text-muted-foreground" />}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {q.length < 2 && (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <Icon name="UserSearch" size={36} style={{ color: "#00f5ff" }} />
            <p className="text-sm text-muted-foreground mt-3 text-center">Введите минимум 2 символа<br />для поиска пользователей</p>
          </div>
        )}
        {results.map(u => (
          <div key={u.id} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 cursor-pointer group transition-all">
            <Av letter={u.display_name || u.username} online={u.is_online} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{u.display_name || u.username}</p>
              <p className="text-xs text-muted-foreground">@{u.username}</p>
              {u.bio && <p className="text-xs text-muted-foreground truncate">{u.bio}</p>}
            </div>
            <Btn onClick={() => onStartChat(u.username)} variant="ghost" className="text-xs px-3 py-1.5">
              Написать
            </Btn>
          </div>
        ))}
        {q.length >= 2 && !loading && results.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 opacity-40">
            <Icon name="SearchX" size={28} style={{ color: "#00f5ff" }} />
            <p className="text-sm text-muted-foreground mt-2">Никого не найдено</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "chats", label: "Чаты", icon: "MessageCircle" },
  { id: "search", label: "Поиск", icon: "Search" },
  { id: "groups", label: "Группы", icon: "Users" },
  { id: "channels", label: "Каналы", icon: "Rss" },
  { id: "settings", label: "Профиль", icon: "UserCircle" },
];

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [section, setSection] = useState("chats");

  // Chats
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);

  // Groups
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [groupMembers, setGroupMembers] = useState("");

  // Channels
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [chName, setChName] = useState("");
  const [chUsername, setChUsername] = useState("");
  const [chDesc, setChDesc] = useState("");

  // Stories
  const [showAddStory, setShowAddStory] = useState(false);
  const [storyText, setStoryText] = useState("");

  // Profile edit
  const [editProfile, setEditProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");

  // Init
  useEffect(() => {
    const token = localStorage.getItem("ap_token");
    if (!token) { setAuthLoading(false); return; }
    api.getMe().then(r => {
      if (r.id) setUser(r);
      else localStorage.removeItem("ap_token");
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => { if (!user) return; if (section === "chats") loadChats(); if (section === "groups") loadGroups(); if (section === "channels") loadChannels(); }, [section, user]);

  const loadChats = async () => { const r = await api.getChats(); if (r.chats) setChats(r.chats); };
  const loadGroups = async () => { const r = await api.getGroups(); if (r.groups) setGroups(r.groups); };
  const loadChannels = async () => { const r = await api.getChannels(); if (r.channels) setChannels(r.channels); };

  const startChat = async (username: string) => {
    const r = await api.startChat(username);
    if (r.chat_id) {
      await loadChats();
      setSection("chats");
      const r2 = await api.getChats();
      const found = (r2.chats || []).find((c: Chat) => c.id === r.chat_id);
      if (found) setActiveChat(found);
    }
  };

  const createGroup = async () => {
    const members = groupMembers.split(",").map(s => s.trim()).filter(Boolean);
    const r = await api.createGroup(groupName, groupDesc, members);
    if (r.ok) { setShowCreateGroup(false); setGroupName(""); setGroupDesc(""); setGroupMembers(""); loadGroups(); }
  };

  const createChannel = async () => {
    const r = await api.createChannel(chName, chUsername, chDesc);
    if (r.ok) { setShowCreateChannel(false); setChName(""); setChUsername(""); setChDesc(""); loadChannels(); }
  };

  const publishStory = async () => {
    if (!storyText.trim()) return;
    await api.publishStory(storyText);
    setShowAddStory(false); setStoryText("");
  };

  const saveProfile = async () => {
    await api.updateProfile({ display_name: editName, bio: editBio });
    const me = await api.getMe();
    setUser(me); setEditProfile(false);
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl animate-pulse-neon flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,rgba(0,245,255,.2),rgba(139,92,246,.2))", border: "2px solid rgba(0,245,255,.5)" }}>
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, color: "#00f5ff" }}>AP</span>
        </div>
        <p className="text-muted-foreground text-sm">Загрузка...</p>
      </div>
    </div>
  );

  if (!user) return <AuthScreen onAuth={u => setUser(u)} />;

  const hasSidebar = ["chats", "groups", "channels"].includes(section);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background" style={{ fontFamily: "'Golos Text',sans-serif" }}>
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/3 w-96 h-96 rounded-full opacity-5" style={{ background: "radial-gradient(circle,#00f5ff,transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-5" style={{ background: "radial-gradient(circle,#8b5cf6,transparent 70%)", filter: "blur(60px)" }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex flex-col w-16 h-full glass border-r border-white/5 items-center py-4 gap-1">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 animate-pulse-neon"
          style={{ background: "linear-gradient(135deg,rgba(0,245,255,.2),rgba(139,92,246,.2))", border: "1px solid rgba(0,245,255,.4)" }}>
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: "11px", color: "#00f5ff" }}>AP</span>
        </div>

        <div className="flex-1 flex flex-col gap-0.5 w-full px-2">
          {SECTIONS.map(s => {
            const active = section === s.id;
            return (
              <button key={s.id} onClick={() => { setSection(s.id); setActiveChat(null); setActiveGroup(null); setActiveChannel(null); }}
                className={`w-full flex flex-col items-center py-2.5 rounded-xl transition-all gap-1 relative ${active ? "nav-item-active" : "text-muted-foreground hover:text-foreground"}`}
                style={active ? { background: "rgba(0,245,255,0.08)" } : {}}>
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full" style={{ background: "#00f5ff" }} />}
                <Icon name={s.icon} size={18} />
                <span className="text-[9px] font-medium leading-none">{s.label}</span>
              </button>
            );
          })}
        </div>

        <button onClick={() => { setSection("settings"); setEditName(user.display_name || ""); setEditUsername(user.username); setEditBio(user.bio || ""); }}
          className="w-10 h-10 rounded-full flex items-center justify-center mt-2"
          style={{ background: "linear-gradient(135deg,rgba(0,245,255,.2),rgba(139,92,246,.2))", border: "1px solid rgba(0,245,255,.3)" }}>
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: "11px", color: "#00f5ff" }}>
            {(user.display_name || user.username || "?")[0].toUpperCase()}
          </span>
        </button>
      </nav>

      {/* Sidebar */}
      {hasSidebar && (
        <aside className="relative z-10 w-72 flex flex-col h-full glass border-r border-white/5">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h2 className="font-bold text-sm tracking-wider" style={{ fontFamily: "'Orbitron',sans-serif", color: "#00f5ff" }}>
              {section === "chats" ? "ЧАТЫ" : section === "groups" ? "ГРУППЫ" : "КАНАЛЫ"}
            </h2>
            {section === "groups" && (
              <button onClick={() => setShowCreateGroup(true)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors" style={{ color: "#00f5ff" }}>
                <Icon name="Plus" size={16} />
              </button>
            )}
            {section === "channels" && (
              <button onClick={() => setShowCreateChannel(true)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors" style={{ color: "#00f5ff" }}>
                <Icon name="Plus" size={16} />
              </button>
            )}
          </div>

          {/* Stories bar for chats */}
          {section === "chats" && <StoriesBar currentUser={user} onAddStory={() => setShowAddStory(true)} />}

          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
            {section === "chats" && (
              <>
                {chats.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-40 opacity-40 gap-2 mt-4">
                    <Icon name="MessageCircle" size={28} style={{ color: "#00f5ff" }} />
                    <p className="text-xs text-muted-foreground text-center">Найдите людей через «Поиск»<br />и начните общаться</p>
                  </div>
                )}
                {chats.map(c => (
                  <button key={c.id} onClick={() => setActiveChat(c)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left ${activeChat?.id === c.id ? "active-chat" : "hover:bg-white/5"}`}>
                    <Av letter={c.partner_name || c.partner_username} online={c.partner_online} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{c.partner_name || c.partner_username}</span>
                        <span className="text-[10px] text-muted-foreground ml-1 flex-shrink-0">{c.last_time ? timeAgo(c.last_time) : ""}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">@{c.partner_username}</p>
                      {c.last_msg && <p className="text-xs text-muted-foreground truncate">{c.last_msg}</p>}
                    </div>
                    {c.unread > 0 && (
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ background: "#00f5ff", color: "#0a0f1a" }}>{c.unread}</span>
                    )}
                  </button>
                ))}
              </>
            )}

            {section === "groups" && (
              <>
                {groups.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-40 opacity-40 gap-2 mt-4">
                    <Icon name="Users" size={28} style={{ color: "#00f5ff" }} />
                    <p className="text-xs text-muted-foreground text-center">Создайте группу<br />или вступите по ссылке</p>
                  </div>
                )}
                {groups.map(g => (
                  <div key={g.id} onClick={() => setActiveGroup(g)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${activeGroup?.id === g.id ? "active-chat" : "hover:bg-white/5"}`}>
                    <Av letter={g.name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{g.name}</p>
                      <p className="text-xs text-muted-foreground">{g.members_count} участников · {g.role}</p>
                    </div>
                  </div>
                ))}
              </>
            )}

            {section === "channels" && (
              <>
                {channels.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-40 opacity-40 gap-2 mt-4">
                    <Icon name="Rss" size={28} style={{ color: "#00f5ff" }} />
                    <p className="text-xs text-muted-foreground text-center">Создайте канал<br />или найдите через поиск</p>
                  </div>
                )}
                {channels.map(c => (
                  <div key={c.id} onClick={() => setActiveChannel(c)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${activeChannel?.id === c.id ? "active-chat" : "hover:bg-white/5"}`}>
                    <Av letter={c.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        {c.subscribed && <Icon name="CheckCircle" size={11} style={{ color: "#00f5ff" }} />}
                      </div>
                      <p className="text-xs text-muted-foreground">@{c.username} · {c.subscribers_count} подп.</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </aside>
      )}

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
        {section === "chats" && activeChat && <ChatView chat={activeChat} currentUserId={user.id} />}
        {section === "chats" && !activeChat && (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
            <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center"><Icon name="MessageCircle" size={36} style={{ color: "#00f5ff" }} /></div>
            <div className="text-center"><p className="font-semibold">Выберите чат</p><p className="text-sm text-muted-foreground mt-1">или найдите людей через «Поиск»</p></div>
          </div>
        )}

        {section === "search" && <SearchPanel onStartChat={startChat} />}

        {section === "groups" && activeGroup && <GroupChatView group={activeGroup} currentUser={user} />}
        {section === "groups" && !activeGroup && (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
            <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center"><Icon name="Users" size={36} style={{ color: "#00f5ff" }} /></div>
            <div className="text-center"><p className="font-semibold">Выберите группу</p><p className="text-sm text-muted-foreground mt-1">или создайте новую через «+»</p></div>
          </div>
        )}

        {section === "channels" && activeChannel && (
          <ChannelView channel={activeChannel} currentUser={user} onSubscribe={loadChannels} />
        )}
        {section === "channels" && !activeChannel && (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
            <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center"><Icon name="Rss" size={36} style={{ color: "#00f5ff" }} /></div>
            <div className="text-center"><p className="font-semibold">Выберите канал</p><p className="text-sm text-muted-foreground mt-1">или создайте свой через «+»</p></div>
          </div>
        )}

        {section === "settings" && (
          <div className="flex flex-col h-full overflow-y-auto animate-fade-in">
            <div className="px-8 pt-8 pb-6 text-center" style={{ background: "linear-gradient(180deg,rgba(0,245,255,.04),transparent)" }}>
              <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-neon"
                style={{ background: "linear-gradient(135deg,rgba(0,245,255,.25),rgba(139,92,246,.25))", border: "2px solid rgba(0,245,255,.5)" }}>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: "2rem", color: "#00f5ff" }}>
                  {(user.display_name || user.username || "?")[0].toUpperCase()}
                </span>
              </div>
              <h3 className="font-bold text-xl" style={{ fontFamily: "'Orbitron',sans-serif", color: "#00f5ff" }}>{user.display_name || user.username}</h3>
              <p className="text-sm text-muted-foreground mt-1">@{user.username}</p>
              {user.bio && <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">{user.bio}</p>}
              <div className="flex justify-center mt-3">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs encrypt-badge" style={{ color: "#00f5ff" }}>
                  <Icon name="ShieldCheck" size={11} />E2E защита активна
                </span>
              </div>
            </div>

            <div className="px-6 space-y-3 pb-8">
              {!editProfile ? (
                <>
                  {[
                    { icon: "User", label: "Имя", value: user.display_name || "—" },
                    { icon: "AtSign", label: "Юзернейм", value: `@${user.username}` },
                    { icon: "Info", label: "О себе", value: user.bio || "—" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-4 p-4 rounded-2xl glass">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,245,255,0.08)" }}>
                        <Icon name={item.icon} size={16} style={{ color: "#00f5ff" }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                        <p className="text-sm font-medium">{item.value}</p>
                      </div>
                    </div>
                  ))}
                  <Btn onClick={() => { setEditProfile(true); setEditName(user.display_name || ""); setEditUsername(user.username); setEditBio(user.bio || ""); }} className="w-full">
                    Редактировать профиль
                  </Btn>
                  <Btn variant="danger" onClick={() => { localStorage.removeItem("ap_token"); setUser(null); }} className="w-full">
                    Выйти из аккаунта
                  </Btn>
                </>
              ) : (
                <>
                  <Input value={editName} onChange={setEditName} placeholder="Имя" />
                  <Input value={editBio} onChange={setEditBio} placeholder="О себе" />
                  <div className="flex gap-2">
                    <Btn onClick={saveProfile} className="flex-1">Сохранить</Btn>
                    <Btn variant="ghost" onClick={() => setEditProfile(false)} className="flex-1">Отмена</Btn>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal: Create Group */}
      {showCreateGroup && (
        <Modal title="СОЗДАТЬ ГРУППУ" onClose={() => setShowCreateGroup(false)}>
          <Input value={groupName} onChange={setGroupName} placeholder="Название группы" />
          <Input value={groupDesc} onChange={setGroupDesc} placeholder="Описание (необязательно)" />
          <div>
            <Input value={groupMembers} onChange={setGroupMembers} placeholder="@user1, @user2, ..." />
            <p className="text-[10px] text-muted-foreground mt-1">Через запятую — юзернеймы участников</p>
          </div>
          <Btn onClick={createGroup} disabled={!groupName.trim()} className="w-full">Создать группу</Btn>
        </Modal>
      )}

      {/* Modal: Create Channel */}
      {showCreateChannel && (
        <Modal title="СОЗДАТЬ КАНАЛ" onClose={() => setShowCreateChannel(false)}>
          <Input value={chName} onChange={setChName} placeholder="Название канала" />
          <div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input value={chUsername} onChange={v => setChUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="username_канала" className="pl-7" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Только a-z, 0-9 и _</p>
          </div>
          <Input value={chDesc} onChange={setChDesc} placeholder="Описание канала" />
          <Btn onClick={createChannel} disabled={!chName.trim() || !chUsername.trim() || chUsername.length < 3} className="w-full">Создать канал</Btn>
        </Modal>
      )}

      {/* Modal: Add Story */}
      {showAddStory && (
        <Modal title="ДОБАВИТЬ ИСТОРИЮ" onClose={() => setShowAddStory(false)}>
          <p className="text-xs text-muted-foreground text-center">История исчезнет через 24 часа</p>
          <textarea value={storyText} onChange={e => setStoryText(e.target.value)} placeholder="Что хотите рассказать?"
            className="w-full px-4 py-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none h-28"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
          <Btn onClick={publishStory} disabled={!storyText.trim()} className="w-full">Опубликовать</Btn>
        </Modal>
      )}
    </div>
  );
};

export default Index;