import type { RoomPlan, ZoneType } from "../lib/types";

interface Props {
  roomPlan: RoomPlan;
}

const ZONE_LABELS: Record<ZoneType, string> = {
  public: "Public Zone",
  private: "Private Zone",
  service: "Service Zone",
};

const ZONE_COLORS: Record<ZoneType, string> = {
  public: "bg-green-50 border-green-200",
  private: "bg-blue-50 border-blue-200",
  service: "bg-amber-50 border-amber-200",
};

const ZONE_BADGE: Record<ZoneType, string> = {
  public: "bg-green-100 text-green-700",
  private: "bg-blue-100 text-blue-700",
  service: "bg-amber-100 text-amber-700",
};

export default function RoomPlanView({ roomPlan }: Props) {
  const totalArea = roomPlan.rooms.reduce((sum, r) => sum + r.targetArea, 0);

  // Group rooms by zone
  const grouped = new Map<ZoneType, typeof roomPlan.rooms>();
  for (const room of roomPlan.rooms) {
    const list = grouped.get(room.zone) ?? [];
    list.push(room);
    grouped.set(room.zone, list);
  }

  const entryRoom = roomPlan.rooms.find((r) => r.id === roomPlan.entryRoomId);
  const roomMap = new Map(roomPlan.rooms.map((r) => [r.id, r]));

  return (
    <div className="max-w-lg mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="text-center">
        <div className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium mb-3">
          Step 1 of 5 — Room Planning
        </div>
        <h2 className="text-lg font-semibold text-gray-800">Room Plan</h2>
        <p className="text-sm text-gray-500 mt-1">
          {roomPlan.plot.width} x {roomPlan.plot.height} ft plot &middot; {roomPlan.plot.width * roomPlan.plot.height} sqft &middot; {roomPlan.rooms.length} rooms &middot; ~{totalArea} sqft allocated
        </p>
      </div>

      {/* Rooms by zone */}
      {(["public", "private", "service"] as ZoneType[]).map((zone) => {
        const rooms = grouped.get(zone);
        if (!rooms || rooms.length === 0) return null;
        return (
          <div key={zone} className={`rounded-lg border p-4 ${ZONE_COLORS[zone]}`}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{ZONE_LABELS[zone]}</h3>
            <div className="space-y-2">
              {rooms.map((room) => (
                <div key={room.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${ZONE_BADGE[zone]}`}>
                      {room.type.replace("_", " ")}
                    </span>
                    <span className="text-gray-800">{room.name}</span>
                  </div>
                  <span className="text-gray-500 text-xs">
                    ~{room.targetArea} sqft &middot; {room.widthRange[0]}-{room.widthRange[1]} x {room.heightRange[0]}-{room.heightRange[1]} ft
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Adjacencies */}
      {roomPlan.adjacencies.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Adjacency Requirements</h3>
          <div className="space-y-1">
            {roomPlan.adjacencies.map((adj, i) => {
              const a = roomMap.get(adj.roomId);
              const b = roomMap.get(adj.adjacentTo);
              return (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${adj.strength === "required" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                    {adj.strength}
                  </span>
                  <span className="text-gray-700">
                    {a?.name ?? adj.roomId} &harr; {b?.name ?? adj.adjacentTo}
                  </span>
                  <span className="text-gray-400 text-xs">&mdash; {adj.reason}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Entry point */}
      {entryRoom && (
        <div className="text-sm text-gray-500 text-center">
          Entry via <span className="font-medium text-gray-700">{entryRoom.name}</span> on <span className="font-medium text-gray-700">{roomPlan.entryEdge}</span> edge
        </div>
      )}

      {/* Notes */}
      {roomPlan.notes && (
        <p className="text-xs text-gray-400 text-center italic">{roomPlan.notes}</p>
      )}
    </div>
  );
}
