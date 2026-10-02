"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  FaPlus,
  FaRegEdit,
  FaTrash,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaBold,
  FaItalic,
  FaStrikethrough,
  FaListUl,
  FaListOl,
  FaQuoteRight,
  FaUndo,
  FaRedo,
} from "react-icons/fa";
import GalleryPicker, { imgSrc } from "@/app/admin/GalleryPicker";
import { slugify } from "@/lib/slugify";

type Category = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  descriptionText: string;
  parent: string;
  parentName: string;
  image: string;
  icon: string;
};
type CategoryOption = { _id: string; name: string; parent: string };
type SortKey = "createdAt" | "name" | "slug";
type ModalState = null | { mode: "add" } | { mode: "edit"; category: Category };

const LIMITS = [10, 25, 50, 100];
const API = "/api/admin/product-categories";

export default function ProductCategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced("");
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: debounced,
        page: String(page),
        limit: String(limit),
        sort,
        order,
      });
      const res = await fetch(`${API}?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (data.page !== page) setPage(data.page);
    } catch (e: any) {
      toast.error(e.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [debounced, page, limit, sort, order]);

  useEffect(() => {
    load();
  }, [load]);

  const clearSearch = () => {
    setSearch("");
    setDebounced("");
    setPage(1);
  };

  const toggleSort = (key: SortKey) => {
    if (sort === key) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setOrder("asc");
    }
  };
  

  const handleDelete = async (c: Category) => {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    try {
      const res = await fetch(`${API}/${c._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success("Category deleted");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sort !== k ? (
      <FaSort className="w-3 h-3 text-gray-300" />
    ) : order === "asc" ? (
      <FaSortUp className="w-3 h-3 text-[#4CAF4F]" />
    ) : (
      <FaSortDown className="w-3 h-3 text-[#4CAF4F]" />
    );

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="relative flex items-center justify-between pb-4 border-b border-gray-200">
        <h1 className="text-xl sm:text-2xl font-semibold text-[#263238]">
          Product Categories
        </h1>

        {/* wrapper: popup is anchored to this button */}
        <div className="relative">
          <button
            onClick={() => setModal({ mode: "add" })}
            title="Add category"
            className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shadow transition-colors"
          >
            <FaPlus className="w-4 h-4" />
          </button>

          {modal && (
            <CategoryModal
              state={modal}
              onClose={() => setModal(null)}
              onSaved={() => {
                setModal(null);
                load();
              }}
            />
          )}
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 text-sm text-[#263238]">
          <label className="flex items-center gap-2">
            Show
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="border border-gray-200 rounded-md px-2 py-1 bg-white"
            >
              {LIMITS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            entries
          </label>

          <div className="flex items-center gap-2">
            <span>Search:</span>
            <div className="flex items-stretch gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && clearSearch()}
                className="border border-gray-200 rounded-md px-3 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {search && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="flex items-center px-3 rounded-md text-sm border border-gray-200 text-[#263238] hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed text-sm text-left">
            <thead>
              <tr className="text-[#263238] border-b border-gray-200 text-left">
                <th className="px-4 py-3 font-semibold text-left">ID</th>
                <th
                  className="px-4 py-3 font-semibold text-left cursor-pointer select-none"
                  onClick={() => toggleSort("name")}
                >
                  <span className="inline-flex items-center gap-2">
                    Name <SortIcon k="name" />
                  </span>
                </th>
                <th className="px-4 py-3 font-semibold text-left">Description</th>
                <th
                  className="px-4 py-3 font-semibold text-left cursor-pointer select-none"
                  onClick={() => toggleSort("slug")}
                >
                  <span className="inline-flex items-center gap-2">
                    Slug <SortIcon k="slug" />
                  </span>
                </th>
                <th className="px-4 py-3 font-semibold text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#717171]">
                    Loading...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#717171]">
                    No categories found
                  </td>
                </tr>
              ) : (
                items.map((c, i) => (
                  <tr key={c._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 bg-gray-50">
                      {(page - 1) * limit + i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {c.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imgSrc(c.image)}
                            alt={c.name}
                            className="w-7 h-7 rounded object-cover shrink-0 bg-gray-100"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="truncate">{c.name}</p>
                          {c.parentName && (
                            <p className="text-[11px] text-gray-400 truncate">
                              in {c.parentName}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 truncate" title={c.descriptionText}>
                      {c.descriptionText || "—"}
                    </td>
                    <td className="px-4 py-3 truncate">{c.slug}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 text-[#263238]">
                        <button
                          onClick={() => setModal({ mode: "edit", category: c })}
                          title="Edit"
                          className="text-[#3F7A60] hover:text-[#285943] transition-colors"
                        >
                          <FaRegEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          title="Delete"
                          className="hover:text-red-500"
                        >
                          <FaTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 text-sm text-[#717171]">
          <p>
            Showing {from} to {to} of {total} entries
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-md text-white bg-primary border border-primary-hover disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="px-2">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-md text-white bg-primary border border-primary-hover disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Add / Edit category popup ───────────────────────── */

function CategoryModal({
  state,
  onClose,
  onSaved,
}: {
  state: Exclude<ModalState, null>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = state.mode === "edit";
  const selfId = state.mode === "edit" ? state.category._id : "";

  const [name, setName] = useState(editing ? state.category.name : "");
  const [description, setDescription] = useState(editing ? state.category.description : "");
  const [parent, setParent] = useState(editing ? state.category.parent : "");
  const [slug, setSlug] = useState(editing ? state.category.slug : "");
  const [slugTouched, setSlugTouched] = useState(editing); // edit me slug na badle
  const [image, setImage] = useState(editing ? state.category.image : "");
  const [icon, setIcon] = useState(editing ? state.category.icon : "");
  const [options, setOptions] = useState<CategoryOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);

  // Parent dropdown: existing categories
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}?all=1`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load categories");
        setOptions(data);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setLoadingOptions(false);
      }
    })();
  }, []);
    // ── Validation: parent ko chhod kar sab required ──
  const missing: string[] = [];
  if (!name.trim()) missing.push("Name");
  if (!description.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim())
    missing.push("Description");
  if (!slug.trim()) missing.push("Slug");
  if (!image) missing.push("Category Media");
  if (!icon) missing.push("Category Icon");
  const isValid = missing.length === 0;

  // Parent choices: khud + apni sub-categories hata kar, "A › B" path ke saath
  const choices = useMemo(() => {
    const excluded = new Set<string>(selfId ? [selfId] : []);
    let grew = true;
    while (grew) {
      grew = false;
      for (const o of options) {
        if (o.parent && excluded.has(o.parent) && !excluded.has(o._id)) {
          excluded.add(o._id);
          grew = true;
        }
      }
    }

    const byId = new Map(options.map((o) => [o._id, o]));
    const labelOf = (o: CategoryOption) => {
      const parts = [o.name];
      let p = o.parent;
      let guard = 0;
      while (p && guard++ < 20) {
        const par = byId.get(p);
        if (!par) break;
        parts.unshift(par.name);
        p = par.parent;
      }
      return parts.join(" › ");
    };

    return options
      .filter((o) => !excluded.has(o._id))
      .map((o) => ({ id: o._id, label: labelOf(o) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [options, selfId]);

  const onNameChange = (v: string) => {
    setName(v);
    if (!slugTouched) setSlug(v.trim() ? slugify(v, "category") : "");
  };

  const submit = async () => {
    if (!isValid) {
      toast.error(`Required: ${missing.join(", ")}`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(editing ? `${API}/${selfId}` : API, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, parent, slug, image, icon }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      toast.success(editing ? "Category updated" : "Category added");
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* backdrop: bahar click karne par band */}
      <div className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent" onClick={onClose} />

      {/*
        Mobile: screen ke beech me, topbar ke neeche (fixed, full width)
        sm+: + button ke neeche, right aligned
      */}
      <div
        className="fixed inset-x-3 top-[72px] bottom-3 z-50 flex flex-col
          bg-white rounded-2xl shadow-xl border border-gray-100 text-left
          sm:absolute sm:inset-x-auto sm:left-auto sm:right-0 sm:top-full sm:bottom-auto sm:mt-3
          sm:w-[30rem] sm:max-h-[calc(100vh-9rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="hidden sm:block absolute -top-1.5 right-3 w-3 h-3 bg-white border-l border-t border-gray-100 rotate-45" />

        {/* header */}
        <div className="px-5 pt-5 pb-3 shrink-0">
          <h2 className="text-lg font-semibold text-[#263238]">
            {editing ? "Edit Category" : "Add Category"}
          </h2>
        </div>

        {/* body (scrollable) */}
        <div className="px-5 pb-2 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#263238] mb-1">Name <span className="text-red-500">* </span></label>
            <input
              autoFocus
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Clothing, T-Shirts"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#263238] mb-1">
              Description
            </label>
            <RichTextEditor value={description} onChange={setDescription} />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#263238] mb-1">
              Parent Category
            </label>
            <select
              value={parent}
              onChange={(e) => setParent(e.target.value)}
              disabled={loadingOptions}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
            >
              <option value="">
                {loadingOptions ? "Loading..." : "main category"}
              </option>
              {choices.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">
              if you leve it blank it will become main categoery.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#263238] mb-1">Slug</label>
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="auto-generated from name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex flex-col items-start gap-3">
            <MediaField label="Upload Category Media" value={image} onChange={setImage} required />
            <MediaField label="Upload Category Icon" value={icon} onChange={setIcon} required/>
          </div>
        </div>

        {/* footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm bg-primary text-white hover:bg-primary-hover disabled:opacity-60 transition-colors"
          >
            {saving ? "Submitting..." : editing ? "Update" : "Submit"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ───────────────────────── Gallery image field ───────────────────────── */

function MediaField({
  label,
  value,
  onChange,
  required
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {value ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc(value)}
            alt={label}
            className="w-14 h-14 rounded-lg object-cover border border-gray-200 bg-gray-100"
          />
          <div className="flex flex-col items-start gap-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-sm text-primary underline"
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-sm text-red-500 underline"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm bg-primary text-white transition-colors"
          >
            {label}
          </button>
          <p className="text-[11px] text-gray-500 mt-1.5">Select image file from gallery.</p>
        </>
      )}

      {open && (
        <GalleryPicker
          selectedId={value}
          onClose={() => setOpen(false)}
          onSelect={(id) => {
            onChange(id);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Rich text editor (Tiptap) ───────────────────────── */

function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const [, force] = useState(0);

  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false, // Next.js SSR hydration error se bachne ke liye
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
    editorProps: {
      attributes: {
        class: "min-h-[140px] max-h-56 overflow-y-auto px-3 py-2 text-sm focus:outline-none",
      },
    },
  });

  // toolbar ki active state refresh karne ke liye
  useEffect(() => {
    if (!editor) return;
    const h = () => force((n) => n + 1);
    editor.on("transaction", h);
    return () => {
      editor.off("transaction", h);
    };
  }, [editor]);

  if (!editor) {
    return <div className="h-48 rounded-lg border border-gray-200 bg-gray-50" />;
  }

  const btn = (active: boolean) =>
    `w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${
      active ? "bg-primary text-white" : "text-[#263238] hover:bg-gray-100"
    }`;

  const headingValue = editor.isActive("heading", { level: 2 })
    ? "2"
    : editor.isActive("heading", { level: 3 })
    ? "3"
    : "0";

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/30">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
        <select
          value={headingValue}
          onChange={(e) => {
            const v = e.target.value;
            const chain = editor.chain().focus();
            if (v === "0") chain.setParagraph().run();
            else chain.setHeading({ level: Number(v) as 2 | 3 }).run();
          }}
          className="text-xs border border-gray-200 rounded px-1.5 py-1 mr-1 bg-white"
        >
          <option value="0">Normal</option>
          <option value="2">Heading</option>
          <option value="3">Subheading</option>
        </select>

        <button type="button" title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))}>
          <FaBold />
        </button>
        <button type="button" title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))}>
          <FaItalic />
        </button>
        <button type="button" title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive("strike"))}>
          <FaStrikethrough />
        </button>
        <button type="button" title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))}>
          <FaListUl />
        </button>
        <button type="button" title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))}>
          <FaListOl />
        </button>
        <button type="button" title="Quote" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive("blockquote"))}>
          <FaQuoteRight />
        </button>
        <button type="button" title="Undo" onClick={() => editor.chain().focus().undo().run()} className={btn(false)}>
          <FaUndo />
        </button>
        <button type="button" title="Redo" onClick={() => editor.chain().focus().redo().run()} className={btn(false)}>
          <FaRedo />
        </button>
      </div>

      {/* Tailwind reset lists/headings hata deta hai, isliye inko wapas style kiya */}
      <EditorContent
        editor={editor}
        className="[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:text-gray-600 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_p]:my-1"
      />
    </div>
  );
}