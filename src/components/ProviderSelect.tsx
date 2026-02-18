import { PROVIDER_CONFIGS, type ProviderId } from "../agent/providers";

interface Props {
  provider: ProviderId;
  onChange: (provider: ProviderId) => void;
}

const providers: ProviderId[] = ["anthropic", "openai", "gemini"];

export default function ProviderSelect({ provider, onChange }: Props) {
  return (
    <select
      value={provider}
      onChange={(e) => onChange(e.target.value as ProviderId)}
      className="px-2.5 py-1.5 text-xs border border-gray-600 bg-gray-800 text-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-500"
    >
      {providers.map((id) => (
        <option key={id} value={id}>
          {PROVIDER_CONFIGS[id].name}
        </option>
      ))}
    </select>
  );
}
