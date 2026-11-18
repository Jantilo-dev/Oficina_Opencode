import type { ChatMessage } from "./types";

export type ChatOption = {
  label: string;
  value: string;
};

export type ChatQuestion = {
  messageId: string;
  question: string;
  options: ChatOption[];
  agent?: string;
};

function textOf(message: ChatMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
}

function clean(value: string): string {
  return value.replace(/\*\*/g, "").trim();
}

export function parseChatQuestion(message: ChatMessage): ChatQuestion | null {
  if (message.role !== "assistant") return null;
  const text = textOf(message);
  if (!text) return null;

  const lines = text.split(/\r?\n/);
  const questionStart = lines.findIndex((line) => /^\s*PREGUNTA\s*:/i.test(line));
  const optionsStart = lines.findIndex((line) => /^\s*OPCIONES?\s*:/i.test(line));

  if (questionStart >= 0 || optionsStart >= 0) {
    const questionEnd = optionsStart >= 0 ? optionsStart : lines.length;
    let question = "";
    if (questionStart >= 0) {
      const first = lines[questionStart].replace(/^\s*PREGUNTA\s*:\s*/i, "");
      const rest = lines.slice(questionStart + 1, questionEnd).join("\n");
      question = clean(`${first}\n${rest}`);
    } else {
      question = clean(lines.slice(0, questionEnd).join("\n"));
    }

    const options: ChatOption[] = [];
    if (optionsStart >= 0) {
      for (const line of lines.slice(optionsStart + 1)) {
        if (!line.trim()) continue;
        const match = line.match(/^\s*(?:(?:[A-Za-z]|\d{1,2})\s*[).:-]|[-*])\s*(.+)$/);
        if (match) {
          const label = clean(match[1]);
          if (label) options.push({ label, value: label });
          continue;
        }
        if (options.length > 0) break;
      }
    }

    return {
      messageId: message.id,
      question: question || "Elige una opción.",
      options,
      agent: message.agent
    };
  }

  if (/LISTO PARA PASAR AL EQUIPO\s*:\s*S[IÍ]/i.test(text)) return null;
  const questionLines = lines.filter((line) => line.includes("?"));
  if (questionLines.length === 0) return null;
  return {
    messageId: message.id,
    question: clean(questionLines[questionLines.length - 1]),
    options: [],
    agent: message.agent
  };
}

export function pendingQuestionFor(messages: ChatMessage[]): ChatQuestion | null {
  let lastAssistant = -1;
  let lastUser = -1;
  for (let index = 0; index < messages.length; index++) {
    if (messages[index].role === "assistant") lastAssistant = index;
    else lastUser = index;
  }
  if (lastAssistant < 0 || lastAssistant < lastUser) return null;
  return parseChatQuestion(messages[lastAssistant]);
}
