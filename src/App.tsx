import { useState, useEffect } from "react";
import ChatPanel from "./components/ChatPanel";
import FloorPlanPanel from "./components/FloorPlanPanel";
import ApiKeyInput from "./components/ApiKeyInput";
import ProviderSelect from "./components/ProviderSelect";
import { useChat } from "./hooks/useChat";
import { PROVIDER_CONFIGS, type ProviderId } from "./agent/providers";

const PROVIDER_STORAGE_KEY = "archai-provider";

export default function App() {
  const [provider, setProvider] = useState<ProviderId>(
    () => (localStorage.getItem(PROVIDER_STORAGE_KEY) as ProviderId) || "anthropic"
  );

  const providerConfig = PROVIDER_CONFIGS[provider];

  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem(providerConfig.storageKey) || ""
  );

  const { messages, loading, floorPlan, sendMessage } = useChat(apiKey, provider);

  // Persist provider selection
  useEffect(() => {
    localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
  }, [provider]);

  // Persist API key for the current provider
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem(providerConfig.storageKey, apiKey);
    } else {
      localStorage.removeItem(providerConfig.storageKey);
    }
  }, [apiKey, providerConfig.storageKey]);

  const handleProviderChange = (newProvider: ProviderId) => {
    // Save current key before switching
    if (apiKey) {
      localStorage.setItem(providerConfig.storageKey, apiKey);
    }
    setProvider(newProvider);
    const newConfig = PROVIDER_CONFIGS[newProvider];
    setApiKey(localStorage.getItem(newConfig.storageKey) || "");
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 bg-gray-900 text-white shrink-0">
        <h1 className="text-base font-semibold tracking-tight">Architecture AI</h1>
        <div className="flex items-center gap-3">
          <ProviderSelect provider={provider} onChange={handleProviderChange} />
          <ApiKeyInput
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
            placeholder={providerConfig.placeholder}
          />
        </div>
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
