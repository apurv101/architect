import { useState, useRef, useEffect } from "react";
import type { ChatMessage as ChatMessageType } from "../lib/types";
import ChatMessage from "./ChatMessage";

interface Props {
  messages: ChatMessageType[];
  loading: boolean;
  onSend: (text: string) => void;
  disabled: boolean;
}

export default function ChatPanel({ messages, loading, onSend, disabled }: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || disabled) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-gray-400 text-sm space-y-2 mt-8 px-2">
            <p className="font-medium text-gray-500">Welcome! Describe a floor plan to get started.</p>
            <p>Try something like:</p>
            <p className="italic">"Design a 2 bedroom house on a 2000 sqft plot, 50x40 dimensions"</p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-500 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm animate-pulse">
              Designing...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={disabled ? "Enter API key first..." : "Describe a floor plan..."}
            disabled={disabled || loading}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <button
            type="submit"
            disabled={disabled || loading || !input.trim()}
            className="px-4 py-2.5 bg-gray-800 text-white text-sm rounded-xl hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
