/**
 * Landing Page Builder — drag-and-drop block editor.
 *
 * Uses @dnd-kit for drag-and-drop. The left panel shows the block palette
 * (BLOCK_TYPES grouped by category). The right panel is the canvas where
 * blocks are dropped, reordered, and edited.
 *
 * The editor saves to /api/landing-pages/:id/blocks (blocks_json + page_template).
 *
 * Block editing: each block type has a simple JSON editor (key/value pairs)
 * in v1. A follow-up will add type-specific form editors.
 */

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  getLandingPageBlocks,
  saveLandingPageBlocks,
  type PageBlock,
  type LandingPageBlocks,
} from "../api";

// ── Block type metadata (mirrors macod-shared/lib/landing-page-blocks.ts) ─────

interface BlockTypeMeta {
  type: string;
  label: string;
  labelAr?: string;
  category: "product" | "social" | "layout" | "urgency" | "content" | "media";
}

const BLOCK_TYPES: BlockTypeMeta[] = [
  { type: "hero", label: "Hero", labelAr: "هيرو", category: "media" },
  { type: "title", label: "Title", labelAr: "عنوان", category: "content" },
  { type: "image", label: "Image", labelAr: "صورة", category: "media" },
  { type: "images_list", label: "Images List", labelAr: "معرض صور", category: "media" },
  { type: "youtube", label: "YouTube", labelAr: "يوتيوب", category: "media" },
  { type: "html_editor", label: "HTML Editor", labelAr: "محرر HTML", category: "content" },
  { type: "custom_code", label: "Custom Code", labelAr: "كود مخصص", category: "content" },
  { type: "countdown", label: "Countdown", labelAr: "عد تنازلي", category: "urgency" },
  { type: "offer_timer", label: "Offer + Timer", labelAr: "عرض + مؤقت", category: "urgency" },
  { type: "urgency", label: "Urgency", labelAr: "إلحاح", category: "urgency" },
  { type: "pricing_packs", label: "Pricing Packs", labelAr: "باقات الأسعار", category: "product" },
  { type: "dynamic_products", label: "Dynamic Products", labelAr: "منتجات ديناميكية", category: "product" },
  { type: "product_button", label: "Product + Button", labelAr: "منتج + زر", category: "product" },
  { type: "product_button_timer", label: "Product + Button + Timer", labelAr: "منتج + زر + مؤقت", category: "product" },
  { type: "express_checkout", label: "Express Checkout", labelAr: "دفع سريع", category: "product" },
  { type: "cod_form", label: "COD Form", labelAr: "نموذج الطلب", category: "product" },
  { type: "reviews", label: "Reviews", labelAr: "آراء العملاء", category: "social" },
  { type: "product_reviews", label: "Product Reviews", labelAr: "تقييمات المنتج", category: "social" },
  { type: "faq", label: "FAQ", labelAr: "الأسئلة الشائعة", category: "social" },
  { type: "social_media", label: "Social Media", labelAr: "وسائل التواصل", category: "social" },
  { type: "trust", label: "Trust Badges", labelAr: "شارات الثقة", category: "social" },
  { type: "benefits", label: "Benefits", labelAr: "الفوائد", category: "content" },
  { type: "problem_solution", label: "Problem / Solution", labelAr: "مشكلة / حل", category: "content" },
  { type: "before_after", label: "Before / After", labelAr: "قبل / بعد", category: "content" },
  { type: "product_comparison", label: "Product Comparison", labelAr: "مقارنة المنتجات", category: "product" },
  { type: "features", label: "Features", labelAr: "مميزات", category: "media" },
  { type: "icons_box", label: "Icons Box", labelAr: "صناديق أيقونات", category: "media" },
  { type: "categories_list", label: "Categories List", labelAr: "قائمة الفئات", category: "content" },
  { type: "columns", label: "Columns", labelAr: "أعمدة", category: "layout" },
  { type: "container", label: "Container", labelAr: "حاوية", category: "layout" },
  { type: "spacer", label: "Spacer", labelAr: "فراغ", category: "layout" },
  { type: "header", label: "Header", labelAr: "ترويسة", category: "layout" },
  { type: "footer", label: "Footer", labelAr: "تذييل", category: "layout" },
  { type: "link_button", label: "Link Button", labelAr: "زر رابط", category: "content" },
  { type: "text_2_columns", label: "Text 2 Columns", labelAr: "نص عمودين", category: "layout" },
  { type: "text_3_columns", label: "Text 3 Columns", labelAr: "نص 3 أعمدة", category: "layout" },
  { type: "button_2_columns", label: "Button 2 Columns", labelAr: "زرين", category: "layout" },
  { type: "button_3_columns", label: "Button 3 Columns", labelAr: "3 أزرار", category: "layout" },
  { type: "list", label: "List", labelAr: "قائمة", category: "content" },
];

const PAGE_TEMPLATES = [
  { value: "full_width", label: "Full Width", labelAr: "عرض كامل" },
  { value: "header_footer", label: "Header + Footer", labelAr: "ترويسة + تذييل" },
  { value: "header_only", label: "Header Only", labelAr: "ترويسة فقط" },
  { value: "footer_only", label: "Footer Only", labelAr: "تذييل فقط" },
  { value: "bare", label: "Bare", labelAr: "بدون إطار" },
] as const;

const CATEGORIES = ["product", "social", "urgency", "layout", "content", "media"] as const;

// ── Per-block form editor (type-specific) ──────────────────────────────────────

interface BlockEditorProps {
  block: PageBlock;
  onEdit: (newData: Record<string, unknown>) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <label className="block text-xs font-bold mb-1">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-sm border rounded px-2 py-1"
    />
  );
}

function TextArea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-24 text-sm border rounded px-2 py-1 font-mono"
    />
  );
}

function NumberInput({ value, onChange, placeholder }: { value: number; onChange: (v: number) => void; placeholder?: string }) {
  return (
    <input
      type="number"
      value={value || ""}
      onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
      placeholder={placeholder}
      className="w-full text-sm border rounded px-2 py-1"
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full text-sm border rounded px-2 py-1">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function BlockEditor({ block, onEdit }: BlockEditorProps) {
  const data = block.data;
  const update = (key: string, value: unknown) => onEdit({ ...data, [key]: value });

  switch (block.type) {
    case "title":
      return (
        <>
          <Field label="Text"><TextInput value={String(data.text ?? "")} onChange={(v) => update("text", v)} /></Field>
          <Field label="Level"><Select value={String(data.level ?? "2")} onChange={(v) => update("level", parseInt(v))} options={[{value:"1",label:"H1"},{value:"2",label:"H2"},{value:"3",label:"H3"},{value:"4",label:"H4"}]} /></Field>
          <Field label="Align"><Select value={String(data.align ?? "center")} onChange={(v) => update("align", v)} options={[{value:"left",label:"Left"},{value:"center",label:"Center"},{value:"right",label:"Right"}]} /></Field>
          <Field label="Color (hex)"><TextInput value={String(data.color ?? "")} onChange={(v) => update("color", v)} placeholder="#7c3aed" /></Field>
        </>
      );
    case "countdown":
      return (
        <>
          <Field label="End Date"><TextInput value={String(data.endDate ?? "")} onChange={(v) => update("endDate", v)} placeholder="2026-12-31T23:59:59" /></Field>
          <Field label="Label"><TextInput value={String(data.label ?? "")} onChange={(v) => update("label", v)} placeholder="ينتهي العرض خلال" /></Field>
          <Field label="Format"><Select value={String(data.format ?? "dh:ms")} onChange={(v) => update("format", v)} options={[{value:"dh:ms",label:"Days:Hours:Min:Sec"},{value:"h:ms",label:"Hours:Min:Sec"}]} /></Field>
        </>
      );
    case "image":
      return (
        <>
          <Field label="Image URL"><TextInput value={String(data.src ?? "")} onChange={(v) => update("src", v)} placeholder="https://..." /></Field>
          <Field label="Alt text"><TextInput value={String(data.alt ?? "")} onChange={(v) => update("alt", v)} /></Field>
          <Field label="Max width (%)"><NumberInput value={Number(data.maxWidth ?? 100)} onChange={(v) => update("maxWidth", v)} /></Field>
          <Field label="Link (optional)"><TextInput value={String(data.link ?? "")} onChange={(v) => update("link", v)} placeholder="https://..." /></Field>
        </>
      );
    case "youtube":
      return (
        <>
          <Field label="Video ID"><TextInput value={String(data.videoId ?? "")} onChange={(v) => update("videoId", v)} placeholder="dQw4w9WgXcQ" /></Field>
          <Field label="Title"><TextInput value={String(data.title ?? "")} onChange={(v) => update("title", v)} /></Field>
        </>
      );
    case "html_editor":
    case "custom_code":
      return <Field label="HTML"><TextArea value={String(data.html ?? "")} onChange={(v) => update("html", v)} placeholder="<script>...</script>" /></Field>;
    case "link_button":
      return (
        <>
          <Field label="Text"><TextInput value={String(data.text ?? "")} onChange={(v) => update("text", v)} /></Field>
          <Field label="URL"><TextInput value={String(data.url ?? "")} onChange={(v) => update("url", v)} placeholder="https://..." /></Field>
          <Field label="Variant"><Select value={String(data.variant ?? "primary")} onChange={(v) => update("variant", v)} options={[{value:"primary",label:"Primary"},{value:"secondary",label:"Secondary"},{value:"outline",label:"Outline"}]} /></Field>
          <Field label="Full width"><Select value={String(data.fullWidth ?? "false")} onChange={(v) => update("fullWidth", v === "true")} options={[{value:"false",label:"No"},{value:"true",label:"Yes"}]} /></Field>
        </>
      );
    case "spacer":
      return <Field label="Height (px)"><NumberInput value={Number(data.height ?? 20)} onChange={(v) => update("height", v)} /></Field>;
    case "hero":
      return (
        <>
          <Field label="Title"><TextInput value={String(data.title ?? "")} onChange={(v) => update("title", v)} /></Field>
          <Field label="Subtitle"><TextInput value={String(data.subtitle ?? "")} onChange={(v) => update("subtitle", v)} /></Field>
        </>
      );
    case "urgency":
      return (
        <>
          <Field label="Stock left"><NumberInput value={Number(data.stockLeft ?? 5)} onChange={(v) => update("stockLeft", v)} /></Field>
          <Field label="Message"><TextInput value={String(data.message ?? "")} onChange={(v) => update("message", v)} placeholder="عرض خاص ينتهي قريباً" /></Field>
        </>
      );
    case "faq":
      return <Field label="Questions JSON"><TextArea value={JSON.stringify(data.questions ?? [], null, 2)} onChange={(v) => { try { update("questions", JSON.parse(v)); } catch {} }} /></Field>;
    case "trust":
      return <Field label="Badges (comma-separated)"><TextInput value={Array.isArray(data.badges) ? (data.badges as string[]).join(", ") : ""} onChange={(v) => update("badges", v.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="ضمان 14 يوم, التوصيل مجاني" /></Field>;
    case "offer_timer":
      return (
        <>
          <Field label="Title"><TextInput value={String(data.title ?? "")} onChange={(v) => update("title", v)} /></Field>
          <Field label="Offer price"><NumberInput value={Number(data.offerPrice ?? 0)} onChange={(v) => update("offerPrice", v)} /></Field>
          <Field label="Original price"><NumberInput value={Number(data.originalPrice ?? 0)} onChange={(v) => update("originalPrice", v)} /></Field>
          <Field label="End date"><TextInput value={String(data.endDate ?? "")} onChange={(v) => update("endDate", v)} placeholder="2026-12-31T23:59:59" /></Field>
          <Field label="Button text"><TextInput value={String(data.buttonText ?? "")} onChange={(v) => update("buttonText", v)} /></Field>
        </>
      );
    default:
      // Fallback: raw JSON editor for untyped blocks
      return <Field label="Data (JSON)"><TextArea value={JSON.stringify(data, null, 2)} onChange={(v) => { try { onEdit(JSON.parse(v)); } catch {} }} /></Field>;
  }
}

// ── Sortable block item ──────────────────────────────────────────────────────

interface SortableBlockProps {
  block: PageBlock;
  index: number;
  onRemove: () => void;
  onEdit: (newData: Record<string, unknown>) => void;
}

function SortableBlock({ block, index, onRemove, onEdit }: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: `${index}-${block.type}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [editing, setEditing] = useState(false);
  const [jsonText, setJsonText] = useState(JSON.stringify(block.data, null, 2));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-xl p-3 mb-2 bg-white"
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 px-1"
          title="Drag to reorder"
        >
          ⠿
        </button>
        <span className="font-bold text-sm flex-1">{block.type}</span>
        <button
          onClick={() => setEditing(!editing)}
          className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
        >
          {editing ? "Done" : "Edit"}
        </button>
        <button
          onClick={onRemove}
          className="text-xs px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200"
        >
          ✕
        </button>
      </div>
      {editing && (
        <div className="mt-2">
          <BlockEditor block={block} onEdit={onEdit} />
        </div>
      )}
    </div>
  );
}

// ── Main editor ───────────────────────────────────────────────────────────────

interface Props {
  landingPageId: string;
}

export default function LandingPageBuilder({ landingPageId }: Props) {
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [pageTemplate, setPageTemplate] = useState<LandingPageBlocks["pageTemplate"]>("full_width");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[number]>("product");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getLandingPageBlocks(landingPageId);
        if (cancelled) return;
        setBlocks(data.blocks ?? []);
        setPageTemplate(data.pageTemplate ?? "full_width");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load blocks");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [landingPageId]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = parseInt(String(active.id).split("-")[0], 10);
    const newIndex = parseInt(String(over.id).split("-")[0], 10);
    setBlocks((items) => arrayMove(items, oldIndex, newIndex));
  }, []);

  const addBlock = (type: string) => {
    setBlocks((prev) => [...prev, { type, data: {} }]);
  };

  const removeBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const editBlock = (index: number, newData: Record<string, unknown>) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, data: newData } : b)));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveLandingPageBlocks(landingPageId, { blocks, pageTemplate });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  const filteredBlocks = BLOCK_TYPES.filter((b) => b.category === activeCategory);

  return (
    <div className="flex h-screen">
      {/* ── Left: Block palette ──────────────────────────────────────────────── */}
      <div className="w-64 border-r overflow-y-auto p-3">
        <h3 className="font-black text-sm mb-3">Blocks</h3>
        <div className="flex flex-wrap gap-1 mb-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs px-2 py-1 rounded ${activeCategory === cat ? "bg-purple-600 text-white" : "bg-gray-100"}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="space-y-1">
          {filteredBlocks.map((bt) => (
            <button
              key={bt.type}
              onClick={() => addBlock(bt.type)}
              className="w-full text-left text-sm px-2 py-1.5 rounded border hover:bg-gray-50"
            >
              <span className="font-bold">{bt.label}</span>
              {bt.labelAr && <span className="text-xs text-gray-500 ms-2">{bt.labelAr}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Center: Canvas ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black">Blocks ({blocks.length})</h2>
          <div className="flex items-center gap-2">
            <select
              value={pageTemplate}
              onChange={(e) => setPageTemplate(e.target.value as LandingPageBlocks["pageTemplate"])}
              className="text-sm border rounded px-2 py-1"
            >
              {PAGE_TEMPLATES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 rounded bg-purple-600 text-white text-sm font-bold disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

        {blocks.length === 0 ? (
          <div className="text-center py-16 text-gray-400 border-2 border-dashed rounded-xl">
            Add blocks from the left panel
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={blocks.map((_, i) => `${i}-${blocks[i].type}`)}
              strategy={verticalListSortingStrategy}
            >
              {blocks.map((block, index) => (
                <SortableBlock
                  key={`${index}-${block.type}`}
                  block={block}
                  index={index}
                  onRemove={() => removeBlock(index)}
                  onEdit={(newData) => editBlock(index, newData)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* ── Right: Live Preview (iframe) ───────────────────────────────────── */}
      <div className="w-96 border-l p-3 bg-gray-50">
        <h3 className="font-black text-sm mb-3">Live Preview</h3>
        <div className="mx-auto" style={{ width: "375px", maxWidth: "100%" }}>
          <iframe
            ref={(el) => {
              if (!el) return;
              // Build the preview HTML from the current blocks
              const html = buildPreviewHtml(blocks);
              const doc = el.contentDocument;
              if (doc) {
                doc.open();
                doc.write(html);
                doc.close();
              }
            }}
            className="border rounded-2xl bg-white"
            style={{ width: "100%", height: "600px", border: "1px solid #e5e7eb" }}
            title="Preview"
          />
        </div>
      </div>
    </div>
  );
}

// ── Preview HTML builder ─────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderBlockForPreview(block: PageBlock): string {
  const d = block.data;
  switch (block.type) {
    case "title": {
      const tag = `h${d.level ?? 2}`;
      return `<${tag} style="text-align:${d.align ?? "center"};color:${d.color ?? "inherit"}">${escapeHtml(String(d.text ?? ""))}</${tag}>`;
    }
    case "hero":
      return `<div style="text-align:center;padding:2rem"><h1 style="font-size:2rem;font-weight:900">${escapeHtml(String(d.title ?? ""))}</h1><p>${escapeHtml(String(d.subtitle ?? ""))}</p></div>`;
    case "image":
      return `<img src="${d.src}" alt="${escapeHtml(String(d.alt ?? ""))}" style="width:100%;border-radius:0.75rem" />`;
    case "youtube":
      return `<div style="position:relative;padding-bottom:56.25%"><iframe src="https://www.youtube.com/embed/${d.videoId}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;border-radius:0.75rem" allowfullscreen></iframe></div>`;
    case "html_editor":
    case "custom_code":
      return String(d.html ?? "");
    case "countdown":
      return `<div style="text-align:center;padding:1rem;background:${d.backgroundColor ?? "#f0f0f0"};color:${d.color ?? "inherit"};border-radius:1rem"><b>${escapeHtml(String(d.label ?? ""))}</b><div style="font-size:2rem;font-weight:900;font-family:monospace">${d.endDate ?? ""}</div></div>`;
    case "spacer":
      return `<div style="height:${d.height ?? 20}px"></div>`;
    case "link_button":
      return `<a href="${d.url ?? "#"}" style="display:inline-block;padding:0.75rem 1.5rem;background:${d.variant === "outline" ? "transparent" : "#7c3aed"};color:${d.variant === "outline" ? "inherit" : "white"};border-radius:1rem;font-weight:900">${escapeHtml(String(d.text ?? ""))}</a>`;
    case "urgency":
      return `<div style="text-align:center;padding:1rem;background:#fef2f2;border-radius:1rem"><b style="color:#dc2626">${escapeHtml(String(d.message ?? ""))}</b><p>باقي فقط ${d.stockLeft ?? 0} قطع</p></div>`;
    case "trust": {
      const badges = Array.isArray(d.badges) ? d.badges as string[] : [];
      return `<div style="text-align:center;padding:1rem">${badges.map((b) => `<span style="display:inline-block;margin:0.25rem;padding:0.25rem 0.75rem;background:#dcfce7;color:#15803d;border-radius:9999px;font-size:0.875rem;font-weight:700">✓ ${escapeHtml(b)}</span>`).join("")}</div>`;
    }
    case "faq": {
      const qs = Array.isArray(d.questions) ? d.questions as Array<{q:string;a:string}> : [];
      return `<div style="padding:1rem">${qs.map((qa) => `<details style="border:1px solid #e5e7eb;border-radius:0.5rem;padding:1rem;margin-bottom:0.5rem"><summary style="font-weight:700;cursor:pointer">${escapeHtml(qa.q)}</summary><p style="margin-top:0.5rem;opacity:0.7">${escapeHtml(qa.a)}</p></details>`).join("")}</div>`;
    }
    case "offer_timer":
      return `<div style="padding:1.5rem;text-align:center;background:linear-gradient(135deg,#7c3aed,#ec4899);color:white;border-radius:1rem"><h3 style="font-size:1.5rem;font-weight:900">${escapeHtml(String(d.title ?? ""))}</h3><span style="font-size:2rem;font-weight:900">${d.offerPrice ?? 0} درهم</span></div>`;
    case "benefits": {
      const items = Array.isArray(d.benefits) ? d.benefits as Array<{icon?:string;title:string;desc?:string}> : [];
      return `<div style="padding:1rem">${items.map((b) => `<div style="display:flex;gap:0.75rem;margin-bottom:0.5rem">${b.icon ? `<span style="font-size:1.5rem">${b.icon}</span>` : ""}<div><b>${escapeHtml(b.title)}</b>${b.desc ? `<div style="font-size:0.875rem;opacity:0.7">${escapeHtml(b.desc)}</div>` : ""}</div></div>`).join("")}</div>`;
    }
    default:
      return `<div style="padding:1rem;border:1px dashed #ccc;border-radius:0.5rem;text-align:center;color:#999;font-size:0.875rem">${block.type} block</div>`;
  }
}

function buildPreviewHtml(blocks: PageBlock[]): string {
  const body = blocks.map(renderBlockForPreview).join("\n");
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet"/>
<style>
  body { font-family: 'Cairo', sans-serif; margin: 0; padding: 0.5rem; }
  * { box-sizing: border-box; }
</style>
</head>
<body>
${blocks.length === 0 ? '<div style="text-align:center;padding:3rem;color:#999">No blocks yet</div>' : body}
</body>
</html>`;
}
