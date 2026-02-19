import type { ChatMessage as ChatMessageType, ThinkingStep } from "../lib/types";

const TOOL_LABELS: Record<string, string> = {
  plan_rooms: "Planning & placing rooms",
  finalize_floor_plan: "Finalizing floor plan",
  review_floor_plan: "Reviewing floor plan",
  furnish_floor_plan: "Placing furniture",
};

function StepIndicator({ step }: { step: ThinkingStep }) {
  const label = TOOL_LABELS[step.toolName] ?? step.toolName;
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      {step.status === "running" && (
        <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      )}
      {step.status === "done" && (
        <span className="text-green-600 font-bold">&#10003;</span>
      )}
      {step.status === "error" && (
        <span className="text-red-500 font-bold">&#10007;</span>
      )}
      <span>{label}{step.status === "running" ? "..." : ""}</span>
    </div>
  );
}

export default function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";
  const hasSteps = message.thinkingSteps && message.thinkingSteps.length > 0;
  const hasContent = !!message.content;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-gray-800 text-white rounded-br-md"
            : "bg-gray-100 text-gray-800 rounded-bl-md"
        }`}
      >
        {message.images && message.images.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-2">
            {message.images.map((img, i) => (
              <img
                key={i}
                src={`data:${img.mediaType};base64,${img.data}`}
                alt={`Attached image ${i + 1}`}
                className="max-w-[200px] max-h-[200px] rounded-lg object-contain"
              />
            ))}
          </div>
        )}
        {hasSteps && (
          <div className={`flex flex-col gap-1 ${hasContent ? "mb-2" : ""}`}>
            {message.thinkingSteps!.map((step, i) => (
              <StepIndicator key={i} step={step} />
            ))}
          </div>
        )}
        {hasContent && <span>{message.content}</span>}
        {!hasContent && !hasSteps && (
          <span className="text-gray-400 animate-pulse">Thinking...</span>
        )}
      </div>
    </div>
  );
}
