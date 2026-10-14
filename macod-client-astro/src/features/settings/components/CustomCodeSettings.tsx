/**
 * Custom Code Settings — paste head/body/footer scripts.
 */

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

interface CustomCodeConfig {
  customHead: string | null;
  customBodyOpen: string | null;
  customFooter: string | null;
}

export default function CustomCodeSettings() {
  const [config, setConfig] = useState<CustomCodeConfig>({ customHead: "", customBodyOpen: "", customFooter: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<CustomCodeConfig>("/api/custom-code");
        setConfig(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await apiFetch("/api/custom-code", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-black mb-4">Custom Code</h1>
      <p className="text-sm text-gray-500 mb-4">
        Paste tracking pixels, Google Search Console verification, custom CSS, Hotjar, GTM noscript, etc.
        These are injected into the storefront HTML on every page.
      </p>

      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      {success && <div className="text-green-600 text-sm mb-2">Saved!</div>}

      <CodeField
        label="Custom Head (before </head>)"
        placeholder="<!-- Meta Pixel Code -->&#10;<script>&#10;...&#10;</script>"
        value={config.customHead ?? ""}
        onChange={(v) => setConfig({ ...config, customHead: v })}
      />

      <CodeField
        label="Custom Body Open (after <body>)"
        placeholder="<!-- GTM noscript -->"
        value={config.customBodyOpen ?? ""}
        onChange={(v) => setConfig({ ...config, customBodyOpen: v })}
      />

      <CodeField
        label="Custom Footer (before </body>)"
        placeholder="<!-- Hotjar, chat widgets, custom JS -->"
        value={config.customFooter ?? ""}
        onChange={(v) => setConfig({ ...config, customFooter: v })}
      />

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl font-bold disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

function CodeField({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-bold mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-40 font-mono text-xs p-3 border rounded-xl"
      />
    </div>
  );
}
