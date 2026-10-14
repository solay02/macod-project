/**
 * Anti-Fraud Settings — customer blacklist management.
 *
 * Lists blacklisted phone numbers with reason + return count.
 * The admin can manually add or remove entries.
 */

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";

interface BlacklistEntry {
  id: string;
  phone: string;
  reason: string;
  notes: string | null;
  autoFlagged: boolean;
  returnCount: number;
  createdAt: string;
}

export default function AntiFraudSettings() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPhone, setNewPhone] = useState("");
  const [newReason, setNewReason] = useState("manual");
  const [newNotes, setNewNotes] = useState("");

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: BlacklistEntry[] }>("/api/anti-fraud/blacklist");
      setEntries(res.data ?? []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const addEntry = async () => {
    if (!newPhone.trim()) return;
    try {
      await apiFetch("/api/anti-fraud/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone, reason: newReason, notes: newNotes }),
      });
      setNewPhone("");
      setNewNotes("");
      fetchEntries();
    } catch (err) {
      console.error("Failed to add:", err);
    }
  };

  const removeEntry = async (id: string) => {
    try {
      await apiFetch(`/api/anti-fraud/blacklist/${id}`, { method: "DELETE" });
      fetchEntries();
    } catch (err) {
      console.error("Failed to remove:", err);
    }
  };

  const reasonColors: Record<string, string> = {
    fake_number: "bg-red-100 text-red-700",
    chronic_returner: "bg-orange-100 text-orange-700",
    spam: "bg-yellow-100 text-yellow-700",
    manual: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-black mb-4">Anti-Fraud — Customer Blacklist</h1>

      <div className="border rounded-xl p-4 mb-6 bg-white">
        <h2 className="font-bold mb-2">Add to Blacklist</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="tel"
            placeholder="0661234567"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm flex-1 min-w-[150px]"
          />
          <select
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm"
          >
            <option value="manual">Manual</option>
            <option value="fake_number">Fake Number</option>
            <option value="chronic_returner">Chronic Returner</option>
            <option value="spam">Spam</option>
          </select>
          <input
            type="text"
            placeholder="Notes (optional)"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm flex-1 min-w-[150px]"
          />
          <button onClick={addEntry} className="px-4 py-1.5 bg-red-600 text-white rounded text-sm font-bold">
            Block
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No blacklisted numbers</div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="border rounded-xl p-3 bg-white flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{entry.phone}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${reasonColors[entry.reason] ?? "bg-gray-100"}`}>
                    {entry.reason}
                  </span>
                  {entry.autoFlagged && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Auto</span>
                  )}
                </div>
                {entry.notes && <div className="text-sm text-gray-500 mt-0.5">{entry.notes}</div>}
                <div className="text-xs text-gray-400 mt-0.5">
                  Returns: {entry.returnCount} · Added {new Date(entry.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => removeEntry(entry.id)}
                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-red-100 text-red-600"
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
