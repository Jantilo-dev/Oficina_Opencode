import { useEffect, useRef, useState } from "react";
import type { ChatMessage, Session } from "../types";
import { displayTitle } from "../format";
import ErrorBox, { isBillingError, isRegionError } from "./ErrorBox";
import { pendingQuestionFor } from "../chatQuestions";

type Props = {
  session: Session | null;
  messages: ChatMessage[];
  busy: boolean;
  busyLabel?: string;
  sessionError?: string;
  onRegionalFallback?: () => boolean;
  onGoFallback?: () => boolean;
  agent?: string;
  model?: string;
  name?: string;
  role?: string;
  onEdit?: () => void;
  handoff?: { disabled: boolean; hint?: string; ready?: boolean | null; onRun: () => Promise<void> };
  onSend: (text: string) => Promise<void>;
  onAbort: () => Promise<void>;
  onDelete: () => Promise<void>;
};

export default function SessionChat({
  session,
  messages,
  busy,
  busyLabel,
  sessionError,
  onRegionalFallback,
  onGoFallback,
  agent,
  model,
  name,
  role,
  onEdit,
  handoff,
  onSend,
  onAbort,
  onDelete
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [handoffInfo, setHandoffInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissedQuestion, setDismissedQuestion] = useState<string | null>(null);

  useEffect(() => {
    setDismissedQuestion(null);
  }, [session?.id]);

  useEffect(() => {
    const element = listRef.current;
    if (!element || !stickRef.current) return;
    element.scrollTop = element.scrollHeight;
  }, [messages, busy, sending]);

  if (!session) {
    return (
      <div className="chat">
        <div className="hint">
          Selecciona una sesión en <b>EQUIPO</b> o pulsa <b>NUEVA SESIÓN</b> para empezar.
        </div>
      </div>
    );
  }

  const parsedPending = pendingQuestionFor(messages);
  const pending = parsedPending && parsedPending.messageId !== dismissedQuestion ? parsedPending : null;

  const sendValue = async (raw: string) => {
    const value = raw.trim();
    if (!value || busy || sending) return;
    if (pending) setDismissedQuestion(pending.messageId);
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

  const submit = async () => {
    await sendValue(text);
  };

  const runHandoff = async () => {
    if (!handoff || handoff.disabled || handoffBusy) return;
    setHandoffBusy(true);
    setHandoffInfo(null);
    setError(null);
    try {
      await handoff.onRun();
      setHandoffInfo("Plan enviado a Frontend, Backend, QA y Documentación.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setHandoffBusy(false);
    }
  };

  const shownError = error ?? sessionError ?? null;
  const regionalAction =
    shownError && isRegionError(shownError) && onRegionalFallback
      ? {
          label: "Usar modelo regional",
          onClick: () => {
            if (onRegionalFallback()) setError(null);
          }
        }
      : undefined;
  const billingAction =
    shownError && isBillingError(shownError) && onGoFallback
      ? {
          label: "Usar OpenCode Go en el equipo",
          onClick: () => {
            if (onGoFallback()) setError(null);
          }
        }
      : undefined;
  const errorAction = regionalAction ?? billingAction;

  return (
    <div className="chat">
      <div className="chat-head">
        <div className="chat-title-row">
          <div className="chat-title">{name ?? displayTitle(session.title)}</div>
          {onEdit ? (
            <button type="button" className="icon-btn dark" onClick={onEdit} title="Editar personaje">
              âœŽ
            </button>
          ) : null}
        </div>
        <div className="chat-meta">
          <span className="badge muted" title={session.id}>
            id {session.id.slice(0, 8)}
          </span>
          <span className="badge muted" title={session.parentID ?? "sin padre"}>
            padre {session.parentID ? session.parentID.slice(0, 8) : "—"}
          </span>
          <span className="badge">{agent ?? "agente ?"}</span>
          <span className="badge muted">{model ?? "modelo del agente"}</span>
          <span className={`badge ${busy ? "busy" : "idle"}`}>
            estado {busy ? busyLabel || "trabajando" : "idle"}
          </span>
          {pending && !busy && !sending ? <span className="badge busy">PREGUNTA PENDIENTE</span> : null}
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
        {pending && !busy && !sending && (
          <div className="pending-question" role="status" aria-live="polite">
            <div className="pending-head">
              <span className="badge busy">PENDIENTE</span>
              <span>{name ?? pending.agent ?? agent ?? "AGENTE"}{role ? ` · ${role}` : ""}</span>
            </div>
            <div className="pending-text">{pending.question}</div>
            {pending.options.length > 0 ? (
              <div className="pending-options">
                {pending.options.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    className="pending-option"
                    onClick={() => void sendValue(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="pending-help">Responde en el cuadro de abajo.</div>
            )}
          </div>
        )}
        {(busy || sending) && (
          <div className="chat-activity" role="status" aria-live="polite">
            <span className="activity-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>{sending && !busy ? "Enviando…" : busyLabel || "Pensando…"}</span>
          </div>
        )}
      </div>

      <div className="chat-note">Actúa con los permisos de su agente: puede editar y ejecutar.</div>

      {shownError && <ErrorBox message={shownError} action={errorAction} />}
      {handoffInfo && <div className="hint">{handoffInfo}</div>}
      {handoff && (
        <div className={`handoff-status ${handoff.disabled ? "disabled" : ""}`}>
          {handoff.ready === true ? (
            <span className="badge busy">JEFE LISTO PARA EL EQUIPO</span>
          ) : handoff.ready === false ? (
            <span className="badge idle">FALTAN ACLARACIONES</span>
          ) : null}
          {handoff.ready !== null && handoff.ready !== undefined ? " " : null}
          {busy ? "El jefe está trabajando; espera a que termine." : handoff.hint}
        </div>
      )}

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
          {handoff ? (
            <button
              type="button"
              className="btn ghost"
              disabled={handoff.disabled || handoffBusy || busy}
              title={handoff.hint}
              onClick={() => void runHandoff()}
            >
              {handoffBusy ? "ENVIANDO…" : "PASAR PLAN"}
            </button>
          ) : null}
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
