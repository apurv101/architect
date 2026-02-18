import type { ChatMessage as ChatMessageType } from "../lib/types";
import type { Artifact } from "../agent/types";
import type { CostEstimate, StylePalette } from "../lib/types";

function CostEstimateCard({ data }: { data: CostEstimate }) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: data.currency || "USD" }).format(n);

  return (
    <div className="mt-2 bg-white border border-gray-200 rounded-lg p-3 text-xs">
      <div className="font-semibold text-sm mb-2">
        Cost Estimate: {fmt(data.totalCost)}
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="py-1 pr-2 font-medium text-gray-600">Category</th>
            <th className="py-1 pr-2 font-medium text-gray-600">Description</th>
            <th className="py-1 text-right font-medium text-gray-600">Cost</th>
          </tr>
        </thead>
        <tbody>
          {data.breakdown.map((item, i) => (
            <tr key={i} className="border-b border-gray-50">
              <td className="py-1 pr-2 text-gray-500">{item.category}</td>
              <td className="py-1 pr-2">{item.description}</td>
              <td className="py-1 text-right font-medium">{fmt(item.totalCost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.notes && (
        <p className="mt-2 text-gray-500 italic">{data.notes}</p>
      )}
    </div>
  );
}

function StylePaletteCard({ data }: { data: StylePalette }) {
  return (
    <div className="mt-2 bg-white border border-gray-200 rounded-lg p-3 text-xs">
      <div className="font-semibold text-sm mb-1">{data.overallStyle}</div>
      <div className="text-gray-500 mb-2">{data.colorScheme}</div>
      <div className="space-y-2">
        {data.rooms.map((room, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="font-medium w-24 truncate">{room.roomName}</span>
            <div className="flex gap-1">
              <div
                className="w-5 h-5 rounded border border-gray-300"
                title={`Wall: ${room.wallColor}`}
                style={{ backgroundColor: room.wallColor }}
              />
              <div
                className="w-5 h-5 rounded border border-gray-300"
                title={`Floor: ${room.flooringColor}`}
                style={{ backgroundColor: room.flooringColor }}
              />
              <div
                className="w-5 h-5 rounded border border-gray-300"
                title={`Accent: ${room.accentColor}`}
                style={{ backgroundColor: room.accentColor }}
              />
            </div>
            <span className="text-gray-400 truncate">{room.flooringType}</span>
          </div>
        ))}
      </div>
      {data.notes && (
        <p className="mt-2 text-gray-500 italic">{data.notes}</p>
      )}
    </div>
  );
}

function ArtifactBadge({ artifact }: { artifact: Artifact }) {
  switch (artifact.kind) {
    case "cost_estimate":
      return <CostEstimateCard data={artifact.data} />;
    case "style_palette":
      return <StylePaletteCard data={artifact.data} />;
    case "floor_plan":
      return null; // Rendered in the SVG panel
    case "elevation_view":
      return null; // Rendered in the SVG panel
    default:
      return null;
  }
}

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
        {message.content && <span>{message.content}</span>}
        {message.artifacts?.map((artifact, i) => (
          <ArtifactBadge key={i} artifact={artifact} />
        ))}
      </div>
    </div>
  );
}
