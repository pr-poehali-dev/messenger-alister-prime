import { useState } from "react";
import Icon from "@/components/ui/icon";

const SECTIONS = [
  { id: "chats", label: "Чаты", icon: "MessageCircle" },
  { id: "channels", label: "Каналы", icon: "Rss" },
  { id: "groups", label: "Группы", icon: "Users" },
  { id: "calls", label: "Звонки", icon: "Phone" },
  { id: "files", label: "Файлы", icon: "FolderOpen" },
  { id: "contacts", label: "Контакты", icon: "Contact" },
  { id: "settings", label: "Настройки", icon: "Settings" },
  { id: "profile", label: "Профиль", icon: "UserCircle" },
];

const CHATS = [
  { id: 1, name: "Алексей Морозов", preview: "Окей, завтра в 10:00", time: "14:32", unread: 2, online: true, avatar: "А" },
  { id: 2, name: "Команда APEX", preview: "Документы отправлены", time: "13:15", unread: 0, online: true, avatar: "К" },
  { id: 3, name: "Дарья Кузнецова", preview: "Спасибо за помощь!", time: "11:48", unread: 5, online: false, avatar: "Д" },
  { id: 4, name: "Проект Нова", preview: "Дедлайн перенесён", time: "Вчера", unread: 0, online: false, avatar: "П" },
  { id: 5, name: "Виктор Лебедев", preview: "Увидимся вечером", time: "Вчера", unread: 1, online: true, avatar: "В" },
  { id: 6, name: "Анна Петрова", preview: "Файл получила, всё ок", time: "Пн", unread: 0, online: false, avatar: "А" },
];

const MESSAGES: Record<number, { id: number; text: string; out: boolean; time: string; encrypted?: boolean }[]> = {
  1: [
    { id: 1, text: "Привет! Как дела с проектом?", out: false, time: "14:20" },
    { id: 2, text: "Всё идёт по плану, завершаем финальный этап", out: true, time: "14:22", encrypted: true },
    { id: 3, text: "Отлично! Встретимся для обсуждения?", out: false, time: "14:30" },
    { id: 4, text: "Окей, завтра в 10:00", out: true, time: "14:32", encrypted: true },
  ],
  2: [
    { id: 1, text: "Команда, документы готовы к проверке", out: false, time: "13:10" },
    { id: 2, text: "Документы отправлены на согласование", out: false, time: "13:15" },
  ],
  3: [
    { id: 1, text: "Дарья, смогла разобраться с настройкой?", out: true, time: "11:40", encrypted: true },
    { id: 2, text: "Да! Всё получилось!", out: false, time: "11:44" },
    { id: 3, text: "Спасибо за помощь!", out: false, time: "11:48" },
  ],
};

const CONTACTS = [
  { id: 1, name: "Алексей Морозов", status: "В сети", online: true, avatar: "А" },
  { id: 2, name: "Виктор Лебедев", status: "15 мин назад", online: false, avatar: "В" },
  { id: 3, name: "Дарья Кузнецова", status: "Нет на месте", online: false, avatar: "Д" },
  { id: 4, name: "Анна Петрова", status: "В сети", online: true, avatar: "А" },
  { id: 5, name: "Михаил Соколов", status: "2 часа назад", online: false, avatar: "М" },
];

const CHANNELS = [
  { id: 1, name: "Технологии PRIME", subscribers: "12.4K", avatar: "Т", preview: "Обновление безопасности 3.0" },
  { id: 2, name: "Новости команды", subscribers: "458", avatar: "Н", preview: "Ежемесячный дайджест" },
  { id: 3, name: "Криптография Today", subscribers: "8.1K", avatar: "К", preview: "Новые алгоритмы шифрования" },
];

const GROUPS = [
  { id: 1, name: "Команда APEX", members: 12, avatar: "К", preview: "Дедлайн в пятницу" },
  { id: 2, name: "Проект Нова", members: 7, avatar: "П", preview: "Встреча в Zoom в 15:00" },
  { id: 3, name: "R&D Лаборатория", members: 24, avatar: "R", preview: "Новый протокол готов" },
];

const CALLS = [
  { id: 1, name: "Алексей Морозов", type: "Входящий", time: "13:45", duration: "12 мин", icon: "PhoneIncoming", color: "text-[#00f5ff]" },
  { id: 2, name: "Дарья Кузнецова", type: "Исходящий", time: "10:20", duration: "5 мин", icon: "PhoneOutgoing", color: "text-purple-400" },
  { id: 3, name: "Команда APEX", type: "Пропущенный", time: "18:30", duration: "—", icon: "PhoneMissed", color: "text-red-400" },
  { id: 4, name: "Виктор Лебедев", type: "Входящий", time: "14:00", duration: "34 мин", icon: "PhoneIncoming", color: "text-[#00f5ff]" },
];

const FILES = [
  { id: 1, name: "Презентация Q4.pdf", size: "2.4 MB", date: "Сегодня", icon: "FileText", color: "text-red-400" },
  { id: 2, name: "Архив проекта.zip", size: "18.7 MB", date: "Вчера", icon: "Archive", color: "text-yellow-400" },
  { id: 3, name: "Скриншот_1920.png", size: "890 KB", date: "Вчера", icon: "Image", color: "text-[#00f5ff]" },
  { id: 4, name: "Отчёт_март.docx", size: "1.2 MB", date: "22.03", icon: "FileText", color: "text-blue-400" },
  { id: 5, name: "Голосовое.ogg", size: "340 KB", date: "21.03", icon: "Mic", color: "text-purple-400" },
];

function AvatarBubble({ letter, size = "md", online }: { letter: string; size?: "sm" | "md" | "lg"; online?: boolean }) {
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-12 h-12 text-lg" : "w-10 h-10 text-sm";
  return (
    <div className="relative flex-shrink-0">
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center font-bold`}
        style={{
          fontFamily: "'Orbitron', sans-serif",
          background: "linear-gradient(135deg, rgba(0,245,255,0.3), rgba(139,92,246,0.3))",
          border: "1px solid rgba(0,245,255,0.35)",
          color: "#00f5ff",
        }}
      >
        {letter}
      </div>
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${online ? "status-online" : "status-offline"}`} />
      )}
    </div>
  );
}

function EncryptBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium encrypt-badge"
      style={{ color: "#00f5ff" }}
    >
      <Icon name="Lock" size={9} />
      E2E
    </span>
  );
}

function ChatView({ chatId }: { chatId: number }) {
  const [input, setInput] = useState("");
  const chat = CHATS.find((c) => c.id === chatId);
  const messages = MESSAGES[chatId] || [];

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex items-center gap-3 px-5 py-4 glass border-b border-white/5">
        {chat && <AvatarBubble letter={chat.avatar} online={chat.online} />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">{chat?.name}</span>
            <EncryptBadge />
          </div>
          <span className="text-xs" style={{ color: chat?.online ? "#00f5ff" : "hsl(var(--muted-foreground))" }}>
            {chat?.online ? "В сети" : "Не в сети"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#00f5ff" }}>
            <Icon name="Phone" size={17} />
          </button>
          <button className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#00f5ff" }}>
            <Icon name="Video" size={17} />
          </button>
          <button className="p-2 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground">
            <Icon name="MoreVertical" size={17} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-grid">
        <div className="flex justify-center mb-4">
          <span className="px-3 py-1 rounded-full text-xs text-muted-foreground glass">Сегодня</span>
        </div>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.out ? "justify-end" : "justify-start"} animate-fade-in`}>
            <div className={`max-w-xs px-4 py-2.5 rounded-2xl ${msg.out ? "message-bubble-out rounded-br-sm" : "message-bubble-in rounded-bl-sm"}`}>
              <p className="text-sm leading-relaxed text-foreground">{msg.text}</p>
              <div className="flex items-center gap-1.5 mt-1 justify-end">
                {msg.encrypted && <Icon name="Lock" size={9} style={{ color: "#00f5ff" }} />}
                <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                {msg.out && <Icon name="CheckCheck" size={11} style={{ color: "#00f5ff" }} />}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 glass border-t border-white/5">
        <div
          className="flex items-center gap-2 rounded-2xl px-4 py-2.5"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="Paperclip" size={17} />
          </button>
          <input
            className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
            placeholder="Зашифрованное сообщение..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="Smile" size={17} />
          </button>
          <button
            className="ml-1 w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #00f5ff, #8b5cf6)", color: "#0a0f1a" }}
          >
            <Icon name="Send" size={14} />
          </button>
        </div>
        <div className="flex items-center gap-1 mt-1.5 px-1">
          <Icon name="ShieldCheck" size={10} style={{ color: "#00f5ff" }} />
          <span className="text-[10px]" style={{ color: "#00f5ff", opacity: 0.7 }}>
            Сквозное шифрование активно
          </span>
        </div>
      </div>
    </div>
  );
}

function SectionEmpty({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center glass">
        <Icon name={icon} size={28} style={{ color: "#00f5ff" }} />
      </div>
      <div className="text-center">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{desc}</p>
      </div>
    </div>
  );
}

const Index = () => {
  const [activeSection, setActiveSection] = useState("chats");
  const [activeChat, setActiveChat] = useState<number | null>(1);

  const hasSidebar = ["chats", "channels", "groups", "contacts", "calls", "files"].includes(activeSection);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background" style={{ fontFamily: "'Golos Text', sans-serif" }}>
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #00f5ff, transparent 70%)", filter: "blur(60px)" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #8b5cf6, transparent 70%)", filter: "blur(60px)" }}
        />
      </div>

      {/* Left nav */}
      <nav className="relative z-10 flex flex-col w-16 h-full glass border-r border-white/5 items-center py-4 gap-1">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 animate-pulse-neon"
          style={{
            background: "linear-gradient(135deg, rgba(0,245,255,0.2), rgba(139,92,246,0.2))",
            border: "1px solid rgba(0,245,255,0.4)",
          }}
        >
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: "11px", color: "#00f5ff" }}>AP</span>
        </div>

        <div className="flex-1 flex flex-col gap-1 w-full px-2">
          {SECTIONS.map((s) => {
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSection(s.id);
                  if (s.id !== "chats") setActiveChat(null);
                }}
                className={`w-full flex flex-col items-center justify-center py-2.5 rounded-xl transition-all gap-1 relative ${
                  isActive ? "nav-item-active" : "text-muted-foreground hover:text-foreground"
                }`}
                style={isActive ? { background: "rgba(0,245,255,0.08)" } : {}}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
                    style={{ background: "#00f5ff" }}
                  />
                )}
                <Icon name={s.icon} size={18} />
                <span className="text-[9px] font-medium leading-none">{s.label}</span>
              </button>
            );
          })}
        </div>

        <div
          className="w-10 h-10 rounded-full flex items-center justify-center mt-2"
          style={{
            background: "linear-gradient(135deg, rgba(0,245,255,0.2), rgba(139,92,246,0.2))",
            border: "1px solid rgba(0,245,255,0.3)",
          }}
        >
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: "12px", color: "#00f5ff" }}>Я</span>
        </div>
      </nav>

      {/* Middle panel */}
      {hasSidebar && (
        <aside className="relative z-10 w-72 flex flex-col h-full glass border-r border-white/5">
          <div className="px-4 pt-5 pb-3">
            <div className="flex items-center justify-between mb-3">
              <h2
                className="font-bold text-sm tracking-wider"
                style={{ fontFamily: "'Orbitron', sans-serif", color: "#00f5ff" }}
              >
                {SECTIONS.find((s) => s.id === activeSection)?.label?.toUpperCase()}
              </h2>
              {activeSection === "chats" && (
                <button
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
                  style={{ color: "#00f5ff" }}
                >
                  <Icon name="Edit" size={14} />
                </button>
              )}
            </div>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <Icon name="Search" size={13} className="text-muted-foreground" />
              <input
                className="bg-transparent text-xs outline-none flex-1 text-foreground placeholder:text-muted-foreground"
                placeholder="Поиск..."
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
            {activeSection === "chats" &&
              CHATS.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setActiveChat(chat.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left ${
                    activeChat === chat.id ? "active-chat" : "hover:bg-white/5"
                  }`}
                >
                  <AvatarBubble letter={chat.avatar} online={chat.online} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground truncate">{chat.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">{chat.time}</span>
                    </div>
                    <span className="text-xs text-muted-foreground truncate block">{chat.preview}</span>
                  </div>
                  {chat.unread > 0 && (
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ background: "#00f5ff", color: "#0a0f1a" }}
                    >
                      {chat.unread}
                    </span>
                  )}
                </button>
              ))}

            {activeSection === "channels" &&
              CHANNELS.map((ch) => (
                <div
                  key={ch.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
                >
                  <AvatarBubble letter={ch.avatar} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground truncate">{ch.name}</span>
                      <span className="text-[10px] text-muted-foreground">{ch.subscribers}</span>
                    </div>
                    <span className="text-xs text-muted-foreground truncate block">{ch.preview}</span>
                  </div>
                </div>
              ))}

            {activeSection === "groups" &&
              GROUPS.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
                >
                  <AvatarBubble letter={g.avatar} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground truncate">{g.name}</span>
                      <span className="text-[10px] text-muted-foreground">{g.members} уч.</span>
                    </div>
                    <span className="text-xs text-muted-foreground truncate block">{g.preview}</span>
                  </div>
                </div>
              ))}

            {activeSection === "contacts" &&
              CONTACTS.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
                >
                  <AvatarBubble letter={c.avatar} online={c.online} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground block">{c.name}</span>
                    <span className="text-xs" style={{ color: c.online ? "#00f5ff" : "hsl(var(--muted-foreground))" }}>
                      {c.status}
                    </span>
                  </div>
                  <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground">
                    <Icon name="MessageCircle" size={14} />
                  </button>
                </div>
              ))}

            {activeSection === "calls" &&
              CALLS.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.15)" }}
                  >
                    <Icon name={c.icon} size={16} className={c.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground block">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.type} · {c.duration}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{c.time}</span>
                </div>
              ))}

            {activeSection === "files" &&
              FILES.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center glass">
                    <Icon name={f.icon} size={18} className={f.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate block">{f.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {f.size} · {f.date}
                    </span>
                  </div>
                  <button className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground">
                    <Icon name="Download" size={13} />
                  </button>
                </div>
              ))}
          </div>
        </aside>
      )}

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
        {activeSection === "chats" && activeChat ? (
          <ChatView chatId={activeChat} />
        ) : activeSection === "settings" ? (
          <div className="flex flex-col h-full animate-fade-in">
            <div className="px-8 py-6 border-b border-white/5 glass">
              <h2 className="font-bold text-lg tracking-wider" style={{ fontFamily: "'Orbitron', sans-serif", color: "#00f5ff" }}>
                НАСТРОЙКИ
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-3">
              {[
                { icon: "ShieldCheck", label: "Безопасность и шифрование", desc: "E2E шифрование, двойная аутентификация" },
                { icon: "Bell", label: "Уведомления", desc: "Звуки, вибрация, всплывающие окна" },
                { icon: "Palette", label: "Внешний вид", desc: "Тема, размер шрифта, акцентный цвет" },
                { icon: "Globe", label: "Конфиденциальность", desc: "Кто видит профиль, статус, геолокация" },
                { icon: "Database", label: "Хранилище и данные", desc: "Автозагрузка медиа, кэш" },
                { icon: "Info", label: "О приложении", desc: "ALISTER PRIME v1.0.0 · Зашифрован" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-4 p-4 rounded-2xl glass cursor-pointer transition-all group"
                  style={{ borderColor: "rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.15)" }}
                  >
                    <Icon name={item.icon} size={18} style={{ color: "#00f5ff" }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <Icon name="ChevronRight" size={15} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              ))}
            </div>
          </div>
        ) : activeSection === "profile" ? (
          <div className="flex flex-col h-full animate-fade-in overflow-y-auto">
            <div
              className="px-8 py-10 flex flex-col items-center"
              style={{ background: "linear-gradient(180deg, rgba(0,245,255,0.04), transparent)" }}
            >
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mb-4 animate-pulse-neon"
                style={{
                  background: "linear-gradient(135deg, rgba(0,245,255,0.25), rgba(139,92,246,0.25))",
                  border: "2px solid rgba(0,245,255,0.5)",
                }}
              >
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: "2rem", color: "#00f5ff" }}>Я</span>
              </div>
              <h3 className="font-bold text-xl mb-1" style={{ fontFamily: "'Orbitron', sans-serif", color: "#00f5ff" }}>
                Ваш Профиль
              </h3>
              <p className="text-sm text-muted-foreground mb-3">@alister_user</p>
              <EncryptBadge />
            </div>
            <div className="px-8 py-4 space-y-3">
              {[
                { icon: "User", label: "Имя", value: "Имя Фамилия" },
                { icon: "AtSign", label: "Username", value: "@alister_user" },
                { icon: "Phone", label: "Телефон", value: "+7 (___) ___-__-__" },
                { icon: "Info", label: "О себе", value: "Пишите..." },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-4 p-4 rounded-2xl glass cursor-pointer hover:border-[rgba(0,245,255,0.2)] transition-all"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(0,245,255,0.08)" }}
                  >
                    <Icon name={item.icon} size={16} style={{ color: "#00f5ff" }} />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                    <p className="text-sm font-medium text-foreground">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeSection === "chats" && !activeChat ? (
          <SectionEmpty icon="MessageCircle" title="Выберите чат" desc="Выберите собеседника из списка слева" />
        ) : (
          <SectionEmpty icon="Lock" title="Защищено шифрованием" desc="Все данные зашифрованы E2E протоколом" />
        )}
      </main>
    </div>
  );
};

export default Index;