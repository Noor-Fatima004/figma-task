"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  FaChevronDown,
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
      setDebounced(search);
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
    setDebounced(""); // turant reset, 300ms wait nahi
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
      <FaSort className="w-3 h-3 text-muted" />
    ) : order === "asc" ? (
      <FaSortUp className="w-3 h-3 text-secondary" />
    ) : (
      <FaSortDown className="w-3 h-3 text-secondary" />
    );

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="relative flex items-center justify-between pb-3 sm:pb-4 border-b border-border">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-text">
          Product Categories
        </h1>

        {/* wrapper: popup is anchored to this button */}
        <div className="relative">
          <button
            onClick={() => setModal({ mode: "add" })}
            title="Add category"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow transition-colors"
          >
            <FaPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
      <div className="bg-surface rounded-2xl border border-border shadow-sm p-3 sm:p-5">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 mb-4 text-xs sm:text-sm text-text">
          <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
            Show
            <FormSelect
              compact
              value={String(limit)}
              onChange={(v) => {
                setLimit(Number(v));
                setPage(1);
              }}
              options={LIMITS.map((l) => ({ value: String(l), label: String(l) }))}
            />
            <span className="hidden sm:inline">entries</span>
          </div>

          <div className="flex min-w-0 flex-1 sm:flex-none items-center justify-end gap-2">
            <span className="shrink-0">Search:</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && clearSearch()}
              placeholder="Search..."
              className="min-w-0 w-full sm:w-56 border border-border rounded-md px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {search && (
              <button
                type="button"
                onClick={clearSearch}
                className="hidden min-[400px]:flex shrink-0 items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm border border-border text-text hover:bg-surface-hover hover:text-text-hover transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] table-fixed text-xs sm:text-sm text-left">
            <thead>
              <tr className="text-text border-b border-border">
                <th className="w-1/5 px-3 sm:px-4 py-2.5 sm:py-3 font-semibold">
                  ID
                </th>
                <th
                  className="w-1/5 px-3 sm:px-4 py-2.5 sm:py-3 font-semibold cursor-pointer select-none"
                  onClick={() => toggleSort("name")}
                >
                  <span className="inline-flex items-center gap-2">
                    Name <SortIcon k="name" />
                  </span>
                </th>
                <th className="w-1/5 px-3 sm:px-4 py-2.5 sm:py-3 font-semibold">
                  Description
                </th>
                <th
                  className="w-1/5 px-3 sm:px-4 py-2.5 sm:py-3 font-semibold cursor-pointer select-none"
                  onClick={() => toggleSort("slug")}
                >
                  <span className="inline-flex items-center gap-2">
                    Slug <SortIcon k="slug" />
                  </span>
                </th>
                <th className="w-1/5 px-3 sm:px-4 py-2.5 sm:py-3 font-semibold">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted"
                  >
                    Loading...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted"
                  >
                    No categories found
                  </td>
                </tr>
              ) : (
                items.map((c, i) => (
                  <tr
                    key={c._id}
                    className="group border-b border-border"
                  >
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 bg-background group-hover:bg-surface-hover transition-colors">
                      {(page - 1) * limit + i + 1}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {c.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imgSrc(c.image)}
                            alt={c.name}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded object-cover shrink-0 bg-background"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="break-words">{c.name}</p>
                          {c.parentName && (
                            <p className="text-[11px] text-muted break-words">
                              in {c.parentName}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td
                      className="px-3 sm:px-4 py-2.5 sm:py-3 max-w-[14rem] truncate"
                      title={c.descriptionText}
                    >
                      {c.descriptionText || "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 break-words">
                      {c.slug}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                      <div className="flex items-center gap-3 text-text">
                        <button
                          onClick={() =>
                            setModal({ mode: "edit", category: c })
                          }
                          title="Edit"
                          className="text-icon hover:text-icon-hover transition-colors"
                        >
                          <FaRegEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          title="Delete"
                          className="hover:text-red-500 transition-colors"
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 text-xs sm:text-sm text-muted">
          <p className="shrink-0">
            Showing {from} to {to} of {total} entries
          </p>
          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-white bg-primary hover:bg-primary-hover border border-primary-hover disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="px-2">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-white bg-primary hover:bg-primary-hover border border-primary-hover disabled:opacity-40 transition-colors"
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
  const [description, setDescription] = useState(
    editing ? state.category.description : ""
  );
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
      <div
        className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent"
        onClick={onClose}
      />

      {/*
        Mobile: screen ke beech me, topbar ke neeche (fixed, full width)
        sm+: + button ke neeche, right aligned
      */}
      <div
        className="fixed inset-x-3 top-[72px] bottom-3 z-50 flex flex-col
          bg-surface rounded-xl shadow-xl border border-border text-left
          sm:absolute sm:inset-x-auto sm:left-auto sm:right-0 sm:top-full sm:bottom-auto sm:mt-3
          sm:w-[30rem] sm:max-h-[calc(100vh-9rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="hidden sm:block absolute -top-1.5 right-3 w-3 h-3 bg-surface border-l border-t border-border rotate-45" />

        {/* header */}
        <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 shrink-0">
          <h2 className="text-base sm:text-lg font-semibold text-text">
            {editing ? "Edit Category" : "Add Category"}
          </h2>
        </div>

        {/* body (scrollable) */}
        <div className="px-4 sm:px-5 pb-2 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-text mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Clothing, T-Shirts"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-text mb-1">
              Description
            </label>
            <RichTextEditor value={description} onChange={setDescription} />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-text mb-1">
              Parent Category
            </label>
            <FormSelect
              inline
              value={parent}
              onChange={setParent}
              disabled={loadingOptions}
              placeholder={loadingOptions ? "Loading..." : "main category"}
              options={
                loadingOptions
                  ? []
                  : [
                      { value: "", label: "main category" },
                      ...choices.map((c) => ({ value: c.id, label: c.label })),
                    ]
              }
            />
            <p className="text-[11px] text-muted mt-1">
              if you leave it blank it will become main category.
            </p>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-text mb-1">
              Slug
            </label>
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="auto-generated from name"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex flex-col items-start gap-3">
            <MediaField
              label="Upload Category Media"
              value={image}
              onChange={setImage}
            />
            <MediaField
              label="Upload Category Icon"
              value={icon}
              onChange={setIcon}
            />
          </div>
        </div>

        {/* footer */}
        <div className="flex justify-end gap-2 px-4 sm:px-5 py-3 sm:py-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm border border-border hover:bg-surface-hover hover:text-text-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm bg-primary text-white hover:bg-primary-hover disabled:opacity-60 transition-colors"
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
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
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
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover border border-border bg-background"
          />
          <div className="flex flex-col items-start gap-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-xs sm:text-sm text-primary underline"
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-xs sm:text-sm text-red-500 underline"
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
            className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm bg-primary hover:bg-primary-hover text-white transition-colors"
          >
            {label}
          </button>
          <p className="text-[11px] text-muted mt-1.5">
            Select image file from gallery.
          </p>
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
        class:
          "min-h-[120px] sm:min-h-[140px] max-h-48 sm:max-h-56 overflow-y-auto px-3 py-2 text-sm focus:outline-none",
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
    return (
      <div className="h-40 sm:h-48 rounded-lg border border-border bg-background" />
    );
  }

  const btn = (active: boolean) =>
    `w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded text-xs sm:text-sm transition-colors ${
      active ? "bg-primary text-white" : "text-text hover:bg-surface-hover hover:text-text-hover"
    }`;


  return (
    <div className="border border-border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/30">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-background">
        <button
          type="button"
          title="Heading"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`${btn(editor.isActive("heading", { level: 2 }))} font-semibold`}
        >
          H2
        </button>
        <button
          type="button"
          title="Subheading"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`${btn(editor.isActive("heading", { level: 3 }))} font-semibold`}
        >
          H3
        </button>

        <button
          type="button"
          title="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btn(editor.isActive("bold"))}
        >
          <FaBold />
        </button>
        <button
          type="button"
          title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btn(editor.isActive("italic"))}
        >
          <FaItalic />
        </button>
        <button
          type="button"
          title="Strikethrough"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={btn(editor.isActive("strike"))}
        >
          <FaStrikethrough />
        </button>
        <button
          type="button"
          title="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btn(editor.isActive("bulletList"))}
        >
          <FaListUl />
        </button>
        <button
          type="button"
          title="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btn(editor.isActive("orderedList"))}
        >
          <FaListOl />
        </button>
        <button
          type="button"
          title="Quote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={btn(editor.isActive("blockquote"))}
        >
          <FaQuoteRight />
        </button>
        <button
          type="button"
          title="Undo"
          onClick={() => editor.chain().focus().undo().run()}
          className={btn(false)}
        >
          <FaUndo />
        </button>
        <button
          type="button"
          title="Redo"
          onClick={() => editor.chain().focus().redo().run()}
          className={btn(false)}
        >
          <FaRedo />
        </button>
      </div>

      {/* Tailwind reset lists/headings hata deta hai, isliye inko wapas style kiya */}
      <EditorContent
        editor={editor}
        className="[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-border-hover [&_blockquote]:pl-3 [&_blockquote]:text-muted [&_h2]:text-base sm:[&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-sm sm:[&_h3]:text-base [&_h3]:font-semibold [&_p]:my-1"
      />
    </div>
  );
}

/* ───────────────────────── Responsive custom select ───────────────────────── */

function FormSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  disabled = false,
  inline = false, // true: list neeche content ko dhakel kar khulti hai (scroll area me clip nahi hoti)
  compact = false, // true: chhota trigger (Show entries wale dropdown ke liye)
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  inline?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // bahar click ya Escape par band
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={compact ? "relative inline-block" : "relative"}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center justify-between gap-2 border border-border bg-surface text-text text-left focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 ${
          compact
            ? "rounded-md px-2 py-1 text-xs sm:text-sm min-w-[3.5rem]"
            : "w-full rounded-lg px-3 py-2 text-sm"
        }`}
      >
        <span className={`truncate ${selected ? "text-text" : "text-muted"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <FaChevronDown
          className={`w-3 h-3 shrink-0 text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className={`${
            inline
              ? "mt-1"
              : `absolute top-full mt-1 z-[60] left-0 ${
                  compact ? "min-w-full" : "right-0"
                }`
          } max-h-44 sm:max-h-52 overflow-y-auto bg-surface border border-border rounded-lg shadow-lg py-1`}
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-xs sm:text-sm text-muted">
              No options
            </li>
          ) : (
            options.map((o) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`px-3 py-2 text-xs sm:text-sm cursor-pointer truncate transition-colors ${
                  o.value === value
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-text hover:bg-surface-hover hover:text-text-hover"
                }`}
              >
                {o.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}