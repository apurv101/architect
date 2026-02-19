import { useState, useRef, useEffect } from "react";
import type { ChatMessage as ChatMessageType, ImageAttachment } from "../lib/types";
import { fileToBase64, SUPPORTED_IMAGE_TYPES } from "../lib/image";
import ChatMessage from "./ChatMessage";

interface Props {
  messages: ChatMessageType[];
  loading: boolean;
  onSend: (text: string, images?: ImageAttachment[]) => void;
  disabled: boolean;
}

export default function ChatPanel({ messages, loading, onSend, disabled }: Props) {
  const [input, setInput] = useState("");
  const [stagedImages, setStagedImages] = useState<ImageAttachment[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setImageError(null);

    try {
      const newImages: ImageAttachment[] = [];
      for (const file of Array.from(files)) {
        const attachment = await fileToBase64(file);
        newImages.push(attachment);
      }
      setStagedImages((prev) => [...prev, ...newImages]);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Failed to read image");
    }

    // Reset so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setStagedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && stagedImages.length === 0) || loading || disabled) return;
    onSend(input.trim(), stagedImages.length > 0 ? stagedImages : undefined);
    setInput("");
    setStagedImages([]);
    setImageError(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-gray-400 text-sm space-y-2 mt-8 px-2">
            <p className="font-medium text-gray-500">Welcome! Describe a floor plan to get started.</p>
            <p>Try something like:</p>
            <p className="italic">"Design a 2 bedroom house on a 2000 sqft plot, 50x40 dimensions"</p>
            <p className="mt-2 italic">Or upload an image of a floor plan for me to interpret.</p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {/* Streaming progress is shown directly in the assistant message */}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200">
        {imageError && (
          <div className="px-3 pt-2">
            <p className="text-xs text-red-500">{imageError}</p>
          </div>
        )}

        {stagedImages.length > 0 && (
          <div className="px-3 pt-2 flex gap-2 flex-wrap">
            {stagedImages.map((img, i) => (
              <div key={i} className="relative group">
                <img
                  src={`data:${img.mediaType};base64,${img.data}`}
                  alt={`Upload ${i + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-3">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={SUPPORTED_IMAGE_TYPES.join(",")}
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || loading}
              className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Upload image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={disabled ? "Enter API key first..." : "Describe a floor plan or upload an image..."}
              disabled={disabled || loading}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
            />

            <button
              type="submit"
              disabled={disabled || loading || (!input.trim() && stagedImages.length === 0)}
              className="px-4 py-2.5 bg-gray-800 text-white text-sm rounded-xl hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
