import { useState, useEffect } from "react";
import ChatPanel from "./components/ChatPanel";
import FloorPlanPanel from "./components/FloorPlanPanel";
import ApiKeyInput from "./components/ApiKeyInput";
import { useChat } from "./hooks/useChat";

const STORAGE_KEY = "archai-api-key";

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const { messages, loading, floorPlan, sendMessage } = useChat(apiKey);

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem(STORAGE_KEY, apiKey);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [apiKey]);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 bg-gray-900 text-white shrink-0">
        <h1 className="text-base font-semibold tracking-tight">Architecture AI</h1>
        <ApiKeyInput apiKey={apiKey} onApiKeyChange={setApiKey} />
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Chat panel */}
        <div className="w-full md:w-[400px] md:min-w-[360px] border-b md:border-b-0 md:border-r border-gray-200 h-1/2 md:h-full">
          <ChatPanel
            messages={messages}
            loading={loading}
            onSend={sendMessage}
            disabled={!apiKey}
          />
        </div>

        {/* Floor plan panel */}
        <div className="flex-1 h-1/2 md:h-full">
          <FloorPlanPanel floorPlan={floorPlan} loading={loading} />
        </div>
      </div>
    </div>
  );
}
