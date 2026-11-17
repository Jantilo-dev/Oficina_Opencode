import { useEffect, useRef, useState } from "react";
import type { ChatMessage, Session } from "../types";
import { displayTitle } from "../format";

type Props = {
  session: Session | null;
  messages: ChatMessage[];
  busy: boolean;
  agent?: string;
  model?: string;
  name?: string;
  onEdit?: () => void;
  onSend: (text: string) => Promise<void>;
  onAbort: () => Promise<void>;
  onDelete: () => Promise<void>;
};

export default function SessionChat({
  session,
  messages,
  busy,
  agent,
  model,
  name,
  onEdit,
  onSend,
  onAbort,
  onDelete
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const element = listRef.current;
    if (!element || !stickRef.current) return;
    element.scrollTop = element.scrollHeight;
  }, [messages]);

  if (!session) {
    return (
      <div className="chat">
        <div className="hint">
          Selecciona una sesión en <b>EQUIPO</b> o pulsa <b>NUEVA SESIÓN</b> para empezar.
        </div>
      </div>
    );
  }

  const submit = async () => {
    const value = text.trim();
    if (!value || busy || sending) return;
    setSending(true);
    setError(null);
    try {
      await onSend(value);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat">
      <div className="chat-head">
        <div className="chat-title-row">
          <div className="chat-title">{name ?? displayTitle(session.title)}</div>
          {onEdit ? (
            <button type="button" className="icon-btn dark" onClick={onEdit} title="Editar personaje">
              ✎
            </button>
          ) : null}
        </div>
        <div className="chat-meta">
          <span className="badge">{agent ?? "agente —"}</span>
          <span className="badge muted">{model ?? "modelo del agente"}</span>
          <span className={`badge ${busy ? "busy" : "idle"}`}>{busy ? "trabajando" : "idle"}</span>
        </div>
      </div>

      <div
        className="chat-list"
        ref={listRef}
        onScroll={(event) => {
          const element = event.currentTarget;
          stickRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 40;
        }}
      >
        {messages.length === 0 && <div className="hint">Sin mensajes todavía.</div>}
        {messages.map((message) => (
          <div key={message.id} className={`msg ${message.role}`}>
            <div className="msg-head">
              <span>{message.role === "user" ? "TÚ" : (message.agent ?? agent ?? "AGENTE")}</span>
              {message.model ? <span className="msg-model">{message.model}</span> : null}
            </div>
            {message.parts.map((part) =>
              part.type === "text" ? (
                <div key={part.id} className="msg-text">
                  {part.text}
                </div>
              ) : part.type === "tool" ? (
                <div key={part.id} className="toolchip">
                  <b>{part.tool}</b>
                  <span>{part.status ?? ""}</span>
                  {part.title ? <em>{part.title}</em> : null}
                </div>
              ) : null
            )}
            {message.role === "assistant" && (message.tokens || message.cost) ? (
              <div className="msg-foot">
                {message.tokens ? `${message.tokens} tokens` : ""}
                {message.cost ? ` · $${message.cost.toFixed(4)}` : ""}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="chat-note">Actúa con los permisos de su agente: puede editar y ejecutar.</div>

      {error && <div className="errbox">{error}</div>}

      <div className="composer">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder={busy ? "El agente está trabajando…" : "Escribe una instrucción (Enter para enviar)"}
          rows={3}
          maxLength={8000}
        />
        <div className="composer-actions">
          <button
            type="button"
            className="btn ghost danger"
            onClick={() => {
              if (window.confirm(`¿Eliminar "${name ?? displayTitle(session.title)}"? También se borrarán sus subagentes.`)) {
                void onDelete();
              }
            }}
          >
            Eliminar
          </button>
          {busy ? (
            <button type="button" className="btn warning" onClick={() => void onAbort()}>
              Abortar
            </button>
          ) : null}
          <button type="button" className="btn primary" disabled={!text.trim() || busy || sending} onClick={() => void submit()}>
            {sending ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
