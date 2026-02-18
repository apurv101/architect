import { useState } from "react";

interface Props {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export default function ApiKeyInput({ apiKey, onApiKeyChange }: Props) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-400 whitespace-nowrap">API Key</label>
      <input
        type={show ? "text" : "password"}
        value={apiKey}
        onChange={(e) => onApiKeyChange(e.target.value)}
        placeholder="sk-ant-..."
        className="w-48 px-2.5 py-1.5 text-xs border border-gray-600 bg-gray-800 text-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-500 placeholder:text-gray-600"
      />
      <button
        onClick={() => setShow(!show)}
        className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
