import type { ChatMessage as ChatMessageType } from "../lib/types";

export default function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-gray-800 text-white rounded-br-md"
            : "bg-gray-100 text-gray-800 rounded-bl-md"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
