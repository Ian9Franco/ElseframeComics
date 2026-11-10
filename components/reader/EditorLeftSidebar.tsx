"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getComicPageUrl } from "./readerUtils";
import { EditorPromptModal, ModalField } from "./EditorPromptModal";
import {
  createEmptyDialogueContext,
  type DialogueContextConfig,
  type DialogueDocumentRole,
} from "@/lib/dialogueContext";

interface TreeNode {
  name: string;
  displayName: string;
  path: string;
  type: "file" | "directory";
  children?: TreeNode[];
}

interface EditorLeftSidebarProps {
  pages: string[];
  pageIdx: number;
  resetPage: (idx: number) => void;
  chapter: any;
  saga: any;
  onSave?: () => Promise<void>;
}

export function EditorLeftSidebar({
  pages,
  pageIdx,
  resetPage,
  chapter,
  saga,
  onSave,
}: EditorLeftSidebarProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"pages" | "episodes" | "docs">("pages");

  // Auth token helper
  const getPass = () => typeof window !== "undefined" ? sessionStorage.getItem("editor_password") || "" : "";

  // ─── Modal State ───
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    fields: ModalField[];
  } | null>(null);

  const resolveModalRef = useRef<((val: Record<string, string> | null) => void) | null>(null);

  const requestForm = (title: string, fields: ModalField[]): Promise<Record<string, string> | null> => {
    return new Promise((resolve) => {
      resolveModalRef.current = resolve;
      setModalConfig({ isOpen: true, title, fields });
    });
  };

  const handleModalSubmit = (values: Record<string, string>) => {
    if (resolveModalRef.current) resolveModalRef.current(values);
    setModalConfig(null);
  };

  const handleModalCancel = () => {
    if (resolveModalRef.current) resolveModalRef.current(null);
    setModalConfig(null);
  };

  // ─── Sagas List State ───
  const [sagas, setSagas] = useState<any[]>([]);
  const [loadingSagas, setLoadingSagas] = useState(false);

  // ─── Docs State ───
  const [docTree, setDocTree] = useState<TreeNode | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [contextConfig, setContextConfig] = useState<DialogueContextConfig>(createEmptyDialogueContext());
  const [contextSaveStatus, setContextSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  // ─── Editor Modes & Tools ───
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [editedDocContent, setEditedDocContent] = useState("");
  
  // Modals/Prompts states
  const [editingPageName, setEditingPageName] = useState<number | null>(null);
  const [newPageName, setNewPageName] = useState("");

  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const syncSidebarForViewport = () => setIsOpen(window.innerWidth >= 1200);
    syncSidebarForViewport();
    window.addEventListener("resize", syncSidebarForViewport);
    return () => window.removeEventListener("resize", syncSidebarForViewport);
  }, []);

  // Fetch Sagas
  const loadSagas = () => {
    setLoadingSagas(true);
    fetch("/api/sagas")
      .then((r) => r.json())
      .then((d) => {
        setSagas(d);
        setLoadingSagas(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingSagas(false);
      });
  };

  useEffect(() => {
    if (activeTab === "episodes" && sagas.length === 0) loadSagas();
  }, [activeTab]);

  // Fetch Docs Tree
  const loadDocsTree = () => {
    setLoadingDocs(true);
    fetch("/api/editor/docs", { headers: { "x-editor-password": getPass() } })
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized or Error");
        return r.json();
      })
      .then((d) => {
        setDocTree(d.tree || {
          name: "docs",
          displayName: "Docs",
          path: "",
          type: "directory",
          children: [d.guiones, d.conceptos].filter(Boolean),
        });
        setLoadingDocs(false);
        setOpenFolders(prev => ({ ...prev, "": true, "conceptos": true, "guiones": true }));
      })
      .catch((err) => {
        console.error(err);
        setLoadingDocs(false);
      });
  };

  useEffect(() => {
    if (activeTab === "docs" && !docTree) loadDocsTree();
  }, [activeTab]);

  const loadContextConfig = () => {
    fetch(`/api/chapters/${encodeURIComponent(chapter.id)}/dialogues/context`, {
      headers: { "x-editor-password": getPass() },
    })
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo cargar el contexto narrativo");
        return response.json();
      })
      .then((data) => setContextConfig(data.context || createEmptyDialogueContext()))
      .catch((error) => {
        console.error(error);
        setContextSaveStatus("error");
      });
  };

  const persistContextConfig = async (nextConfig: DialogueContextConfig) => {
    setContextConfig(nextConfig);
    setContextSaveStatus("saving");
    const response = await fetch(`/api/chapters/${encodeURIComponent(chapter.id)}/dialogues/context`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-editor-password": getPass() },
      body: JSON.stringify(nextConfig),
    });
    if (!response.ok) throw new Error("No se pudo guardar la asociación");
    setContextSaveStatus("saved");
    window.dispatchEvent(new CustomEvent("dialogue-context-updated"));
    setTimeout(() => setContextSaveStatus("idle"), 1800);
  };

  useEffect(() => {
    if (activeTab === "docs") loadContextConfig();
  }, [activeTab, chapter.id]);

  // ─── ACTIONS: Pages ───
  const handleRenamePage = async (idx: number, oldSrc: string) => {
    if (!newPageName) return;
    const oldName = oldSrc.substring(oldSrc.lastIndexOf("/") + 1, oldSrc.lastIndexOf("."));
    if (oldName === newPageName) {
      setEditingPageName(null);
      return;
    }

    try {
      const res = await fetch("/api/editor/pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-editor-password": getPass() },
        body: JSON.stringify({ chapterId: chapter.id, oldName, newName: newPageName })
      });
      if (res.ok) {
        alert("Página renombrada. Recarga la página para ver el nuevo orden.");
        window.location.reload();
      } else {
        const errorData = await res.json();
        alert("Error: " + errorData.error);
      }
    } catch (e) {
      alert("Error renaming page");
    }
  };

  // ─── ACTIONS: Episodes ───
  const handleCreateSaga = async () => {
    const values = await requestForm("Nueva Saga", [
      { key: "name", label: "Nombre corto de la saga (ej: Elseframe)", required: true },
      { key: "title", label: "Título completo", required: true },
      { key: "number", label: "Número de orden", type: "number", required: true },
      { key: "color", label: "Color Hex", type: "color", defaultValue: "#e8185a", required: true }
    ]);
    if (!values) return;

    await fetch("/api/editor/structure", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-editor-password": getPass() },
      body: JSON.stringify({ type: "saga", name: values.name, title: values.title, number: values.number, color: values.color })
    });
    loadSagas();
  };

  const handleCreateChapter = async (sagaId: string) => {
    const values = await requestForm("Nuevo Capítulo", [
      { key: "name", label: "Nombre corto de la carpeta", required: true },
      { key: "title", label: "Título completo", required: true },
      { key: "number", label: "Número de capítulo", type: "number", required: true }
    ]);
    if (!values) return;

    await fetch("/api/editor/structure", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-editor-password": getPass() },
      body: JSON.stringify({ type: "chapter", sagaId, name: values.name, title: values.title, number: values.number })
    });
    loadSagas();
  };

  const handleRenameSaga = async (sagaId: string, currentNumber: number, currentTitle: string) => {
    const values = await requestForm("Editar Saga", [
      { key: "name", label: "Nombre corto de carpeta (opcional)", defaultValue: sagaId },
      { key: "title", label: "Título completo", defaultValue: currentTitle },
      { key: "number", label: "Número de orden", type: "number", defaultValue: currentNumber.toString() }
    ]);
    if (!values) return;
    if (values.name === sagaId && values.title === currentTitle && values.number === currentNumber.toString()) return;

    await fetch("/api/editor/structure", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-editor-password": getPass() },
      body: JSON.stringify({ type: "saga", sagaId, newName: values.name, newTitle: values.title, newNumber: values.number })
    });
    loadSagas();
  };

  const handleRenameChapter = async (sagaId: string, chapterId: string, currentNumber: number, currentTitle: string) => {
    const values = await requestForm("Editar Capítulo", [
      { key: "name", label: "Nombre corto de carpeta (opcional)", defaultValue: chapterId },
      { key: "title", label: "Título completo", defaultValue: currentTitle },
      { key: "number", label: "Número de orden", type: "number", defaultValue: currentNumber.toString() }
    ]);
    if (!values) return;
    if (values.name === chapterId && values.title === currentTitle && values.number === currentNumber.toString()) return;

    await fetch("/api/editor/structure", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-editor-password": getPass() },
      body: JSON.stringify({ type: "chapter", sagaId, chapterId, newName: values.name, newTitle: values.title, newNumber: values.number })
    });
    loadSagas();
  };

  const handleSwitchChapter = async (chapterId: string) => {
    if (chapterId === chapter.id) return;
    if (onSave) {
      await onSave();
    }
    router.push(`/chapters/${chapterId}`);
  };

  // ─── ACTIONS: Docs ───
  const handleSelectFile = (filePath: string) => {
    setSelectedFilePath(filePath);
    setLoadingContent(true);
    setIsEditingDoc(false);
    
    fetch(`/api/editor/docs?file=${encodeURIComponent(filePath)}`, { headers: { "x-editor-password": getPass() } })
      .then((r) => r.json())
      .then((d) => {
        setSelectedFileContent(d.content || "");
        setEditedDocContent(d.content || "");
        setLoadingContent(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingContent(false);
      });
  };

  const handleDocumentRoleChange = async (
    filePath: string,
    role: DialogueDocumentRole | ""
  ) => {
    const nextDocuments = contextConfig.documents.filter((document) => document.path !== filePath);
    if (role) nextDocuments.push({ path: filePath, role });
    const nextConfig = { ...contextConfig, documents: nextDocuments };

    try {
      await persistContextConfig(nextConfig);
    } catch (error) {
      console.error(error);
      setContextSaveStatus("error");
      loadContextConfig();
    }
  };

  const handleSaveDoc = async () => {
    if (!selectedFilePath) return;
    setLoadingContent(true);
    await fetch("/api/editor/docs", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-editor-password": getPass() },
      body: JSON.stringify({ file: selectedFilePath, content: editedDocContent })
    });
    setSelectedFileContent(editedDocContent);
    setIsEditingDoc(false);
    setLoadingContent(false);
  };

  const handleCreateNode = async (parentPath: string, type: "file" | "folder") => {
    const values = await requestForm(`Nuevo ${type === "file" ? "Archivo" : "Carpeta"}`, [
      { key: "name", label: `Nombre ${type === "file" ? "(sin .md)" : ""}`, required: true }
    ]);
    if (!values) return;

    await fetch("/api/editor/docs", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-editor-password": getPass() },
      body: JSON.stringify({ parent: parentPath, name: values.name, type })
    });
    loadDocsTree();
  };

  const handleRenameNode = async (filePath: string, oldName: string) => {
    const values = await requestForm("Renombrar", [
      { key: "name", label: "Nuevo nombre", defaultValue: oldName, required: true }
    ]);
    if (!values || values.name === oldName) return;

    const response = await fetch("/api/editor/docs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-editor-password": getPass() },
      body: JSON.stringify({ filePath, newName: values.name })
    });
    if (!response.ok) return;

    const isMarkdown = filePath.toLowerCase().endsWith(".md");
    const finalName = isMarkdown && !values.name.toLowerCase().endsWith(".md")
      ? `${values.name}.md`
      : values.name;
    const separatorIndex = filePath.lastIndexOf("/");
    const parent = separatorIndex >= 0 ? filePath.slice(0, separatorIndex + 1) : "";
    const renamedPath = `${parent}${finalName}`;
    const nextDocuments = contextConfig.documents.map((document) => {
      if (document.path === filePath) return { ...document, path: renamedPath };
      if (document.path.startsWith(`${filePath}/`)) {
        return { ...document, path: `${renamedPath}${document.path.slice(filePath.length)}` };
      }
      return document;
    });
    if (nextDocuments.some((document, index) => document.path !== contextConfig.documents[index]?.path)) {
      try {
        await persistContextConfig({ ...contextConfig, documents: nextDocuments });
      } catch (error) {
        console.error(error);
        setContextSaveStatus("error");
      }
    }
    loadDocsTree();
    if (selectedFilePath === filePath) setSelectedFilePath(null);
  };

  const handleDeleteNode = async (filePath: string) => {
    const values = await requestForm("Confirmar Eliminación", [
      { key: "confirm", label: `Escribe "eliminar" para confirmar borrar ${filePath}`, required: true, placeholder: "eliminar" }
    ]);
    if (!values || values.confirm.toLowerCase() !== "eliminar") return;

    const res = await fetch(`/api/editor/docs?file=${encodeURIComponent(filePath)}`, {
      method: "DELETE",
      headers: { "x-editor-password": getPass() }
    });
    
    if (res.ok) {
      const nextDocuments = contextConfig.documents.filter(
        (document) => document.path !== filePath && !document.path.startsWith(`${filePath}/`)
      );
      if (nextDocuments.length !== contextConfig.documents.length) {
        try {
          await persistContextConfig({ ...contextConfig, documents: nextDocuments });
        } catch (error) {
          console.error(error);
          setContextSaveStatus("error");
        }
      }
      loadDocsTree();
      if (selectedFilePath === filePath) setSelectedFilePath(null);
    } else {
      const data = await res.json();
      alert("Error al eliminar: " + data.error);
    }
  };

  const toggleFolder = (path: string) => {
    setOpenFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const getCleanDialogueText = (line: string): string => {
    const dashMatch = line.match(/[—]([^—]+)[—]/);
    if (dashMatch && dashMatch[1]) return dashMatch[1].trim();
    const quoteMatch = line.match(/["“]([^"”]+)["”]/);
    if (quoteMatch && quoteMatch[1]) return quoteMatch[1].trim();
    const speakerMatch = line.match(/\*\*[^*]+\*\*:\s*(.*)/);
    if (speakerMatch && speakerMatch[1]) return speakerMatch[1].trim();
    return line.replace(/^\*\s*/, "").replace(/\*\*/g, "").trim();
  };

  const handleCopyText = (rawText: string, index: number) => {
    const cleanText = getCleanDialogueText(rawText);
    navigator.clipboard.writeText(cleanText);
    setCopiedText(cleanText);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedText(null);
      setCopiedIndex(null);
    }, 2000);
  };

  const renderMarkdownContent = (text: string) => {
    if (!text) return <p className="text-zinc-450 text-xs italic">El archivo está vacío.</p>;
    const lines = text.split("\n");
    return (
      <div className="flex flex-col gap-2.5 pb-8">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("# ")) return <h1 key={idx} className="text-lg font-bold border-b border-white/10 pb-1.5 mt-5 mb-2 text-white" style={{ fontFamily: "var(--font-bangers)", letterSpacing: "0.05em" }}>{trimmed.slice(2)}</h1>;
          if (trimmed.startsWith("## ")) return <h2 key={idx} className="text-sm font-bold mt-4 mb-1.5 border-b border-dashed border-white/10 pb-0.5 text-zinc-200" style={{ fontFamily: "var(--font-marker)" }}>{trimmed.slice(3)}</h2>;
          if (trimmed.startsWith("### ")) return <h3 key={idx} className="text-xs font-black uppercase text-[#e8185a] mt-3 mb-1 tracking-wider">{trimmed.slice(4)}</h3>;
          if (trimmed === "---") return <hr key={idx} className="my-3 border-white/10" />;
          if (trimmed === "") return <div key={idx} className="h-1" />;

          const isBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ");
          const content = isBullet ? trimmed.slice(2) : trimmed;

          const renderInline = (str: string) => {
            return str.split("**").map((part, i) => i % 2 === 1 ? <strong key={i} className="font-bold text-white bg-yellow-500/20 px-0.5 rounded">{part}</strong> : part);
          };

          const hasDialogueDash = trimmed.includes("—") || trimmed.includes("\"") || trimmed.includes("“");
          const isCopied = copiedIndex === idx;

          return (
            <motion.div key={idx} whileHover={{ x: 2 }} className={`group relative flex items-start gap-1 p-1.5 rounded border transition-all ${isBullet ? "pl-2" : ""} ${hasDialogueDash ? "bg-[#e8185a]/10 border-[#e8185a]/30 hover:bg-[#e8185a]/15 hover:border-[#e8185a]/40" : "border-transparent hover:bg-white/5"}`}>
              {isBullet && <span className="text-zinc-550 mr-1 select-none">•</span>}
              <div className="flex-1 text-xs text-zinc-300 leading-relaxed font-sans select-text">{renderInline(content)}</div>
              <button onClick={() => handleCopyText(content, idx)} title="Copiar diálogo limpio" className={`shrink-0 ml-1.5 p-1 rounded border border-white/10 shadow-[1px_1px_0_rgba(255,255,255,0.1)] cursor-pointer transition-all opacity-0 group-hover:opacity-100 ${isCopied ? "bg-emerald-500 text-white" : "bg-[#0a0a0f] hover:bg-zinc-800 text-white"}`}>
                {isCopied ? "✓" : "📋"}
              </button>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderTree = (node: TreeNode | null, parentPath: string = "") => {
    if (!node) return null;

    const renderNode = (item: TreeNode) => {
      const isDir = item.type === "directory";
      const isFolderOpen = openFolders[item.path] ?? false;

      if (!isDir) {
        const isSelected = selectedFilePath === item.path;
        const association = contextConfig.documents.find((document) => document.path === item.path);
        return (
          <div key={item.path} className="flex flex-col gap-1 my-1.5 p-1 rounded bg-black/10">
            <div className="flex items-center gap-1">
              <motion.div
                whileHover={{ x: 2 }}
                onClick={() => handleSelectFile(item.path)}
                className={`flex-1 flex items-center gap-2.5 py-1 px-2 rounded border cursor-pointer text-xs select-none transition-all min-w-0 ${
                  isSelected ? "bg-[#e8185a] text-white font-bold border-transparent shadow-[2px_2px_0_rgba(0,0,0,0.3)]" : "text-zinc-300 bg-[#0a0a0f] border-white/10 hover:border-white/20"
                }`}
              >
                <span className="shrink-0">📄</span>
                <span className="truncate flex-1 min-w-0">{item.displayName}</span>
              </motion.div>
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => handleRenameNode(item.path, item.name)} className="text-[10px] bg-zinc-800 border border-white/10 px-1 hover:bg-zinc-700 text-white" title="Renombrar">✏️</button>
                <button onClick={() => handleDeleteNode(item.path)} className="text-[10px] bg-red-950 border border-red-800 px-1 hover:bg-red-900 text-red-400" title="Eliminar">🗑</button>
              </div>
            </div>
            <select
              value={association?.role || ""}
              onChange={(event) => handleDocumentRoleChange(item.path, event.target.value as DialogueDocumentRole | "")}
              className="w-full text-[10px]"
              aria-label={`Uso narrativo de ${item.displayName}`}
            >
              <option value="">No usar en IA</option>
              <option value="sagaCanon">Canon de saga</option>
              <option value="characterSheet">Ficha de personaje</option>
              <option value="chapterState">Resumen / estado del capítulo</option>
            </select>
          </div>
        );
      }

      return (
        <div key={item.path} className="flex flex-col my-1">
          <div className="flex items-center gap-1">
            <div
              onClick={() => toggleFolder(item.path)}
              className="flex-1 flex items-center justify-between py-1 px-2 rounded border border-transparent cursor-pointer text-xs select-none hover:bg-white/5 font-bold text-zinc-200 min-w-0"
            >
              <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                <span className="text-sm leading-none shrink-0">{isFolderOpen ? "📂" : "📁"}</span>
                <span className="truncate flex-1 min-w-0">{item.displayName}</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono pr-1 shrink-0">{isFolderOpen ? "▲" : "▼"}</span>
            </div>
            <div className="flex gap-0.5 shrink-0">
              <button onClick={() => handleCreateNode(item.path, "file")} className="text-[10px] bg-blue-950 border border-blue-800 px-1 hover:bg-blue-900 text-blue-300" title="Nuevo Archivo">📄+</button>
              <button onClick={() => handleCreateNode(item.path, "folder")} className="text-[10px] bg-green-950 border border-green-800 px-1 hover:bg-green-900 text-green-300" title="Nueva Carpeta">📁+</button>
              {item.path !== "conceptos" && item.path !== "guiones" && (
                <>
                  <button onClick={() => handleRenameNode(item.path, item.name)} className="text-[10px] bg-zinc-800 border border-white/10 px-1 hover:bg-zinc-700 text-white" title="Renombrar">✏️</button>
                  <button onClick={() => handleDeleteNode(item.path)} className="text-[10px] bg-red-950 border border-red-800 px-1 hover:bg-red-900 text-red-400" title="Eliminar">🗑</button>
                </>
              )}
            </div>
          </div>
          {isFolderOpen && item.children && (
            <div className="pl-3 border-l border-dashed border-white/10 ml-3.5 flex flex-col">
              {item.children.map((child) => renderNode(child))}
            </div>
          )}
        </div>
      );
    };

    return renderNode(node);
  };

  if (!isOpen) {
    return (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 z-[160]">
        <button onClick={() => setIsOpen(true)} className="w-10 h-12 flex items-center justify-center bg-white border-y-3 border-r-3 border-[#0a0a0f] shadow-[4px_4px_0_#0a0a0f] text-[#0a0a0f] font-bold text-lg hover:bg-zinc-50 hover:translate-x-0.5 cursor-pointer rounded-r-md">
          ▶
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="editor-left-sidebar absolute md:relative left-0 top-0 md:left-auto md:top-auto w-[290px] sm:w-[320px] md:w-[350px] shrink-0 bg-[#0e0e14] border-r border-white/10 flex flex-col overflow-hidden z-[160] md:z-40 shadow-2xl md:shadow-none editor-dark-theme" style={{ maxHeight: "calc(100vh - 64px)", height: "100%", touchAction: "pan-y" }}>
        <style>{`
          @media (max-width: 1199px) {
            .editor-left-sidebar {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: min(350px, 48vw) !important;
              max-height: none !important;
              height: 100% !important;
            }
          }
          /* Scoped editor dark theme overrides */
          .editor-dark-theme {
            background-color: #0e0e14 !important;
            color: #e4e4e7 !important;
          }
          .editor-dark-theme::-webkit-scrollbar {
            width: 6px;
          }
          .editor-dark-theme::-webkit-scrollbar-track {
            background: #0e0e14;
          }
          .editor-dark-theme::-webkit-scrollbar-thumb {
            background: #27272a;
            border-radius: 3px;
          }
          .editor-dark-theme::-webkit-scrollbar-thumb:hover {
            background: #3f3f46;
          }

          .editor-dark-theme select,
          .editor-dark-theme input:not([type="checkbox"]):not([type="range"]):not([type="color"]),
          .editor-dark-theme textarea {
            background-color: #0a0a0f !important;
            color: #ffffff !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 4px !important;
            font-size: 12px !important;
            padding: 6px 10px !important;
          }

          .editor-dark-theme select option {
            background-color: #0a0a0f !important;
            color: #ffffff !important;
          }

          .editor-dark-theme label,
          .editor-dark-theme .text-zinc-600,
          .editor-dark-theme .text-zinc-700,
          .editor-dark-theme .text-zinc-500 {
            color: #a1a1aa !important;
          }

          .editor-dark-theme .bg-white,
          .editor-dark-theme .bg-zinc-50,
          .editor-dark-theme .bg-zinc-50\\/50,
          .editor-dark-theme .bg-[#f3f4f6],
          .editor-dark-theme .bg-zinc-100,
          .editor-dark-theme .bg-zinc-100\\/50 {
            background-color: #14141e !important;
            color: #f4f4f5 !important;
          }

          .editor-dark-theme .hover\\:bg-zinc-100:hover {
            background-color: rgba(255, 255, 255, 0.05) !important;
          }
          .editor-dark-theme .hover\\:bg-zinc-200:hover {
            background-color: rgba(255, 255, 255, 0.08) !important;
          }
          .editor-dark-theme .hover\\:bg-zinc-50:hover {
            background-color: rgba(255, 255, 255, 0.05) !important;
          }

          .editor-dark-theme .border-zinc-200,
          .editor-dark-theme .border-zinc-300,
          .editor-dark-theme .border-b-2,
          .editor-dark-theme .border-b-3,
          .editor-dark-theme .border-t-3,
          .editor-dark-theme .border-2,
          .editor-dark-theme .border,
          .editor-dark-theme .border-\\[\\#0a0a0f\\] {
            border-color: rgba(255, 255, 255, 0.08) !important;
          }

          .editor-dark-theme input[type="range"] {
            accent-color: #e8185a !important;
          }
        `}</style>
        <button onClick={() => setIsOpen(false)} className="absolute right-2 top-3 w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-xs font-mono font-bold text-white cursor-pointer rounded transition-all active:translate-y-0.5" style={{ zIndex: 100 }}>
          ◀
        </button>

        <div className="p-4 border-b border-white/10 bg-[#161622] flex flex-col gap-1 pr-12">
          <span className="font-[var(--font-bangers)] text-xl tracking-wider text-white">Panel de Control</span>
          <span className="font-sans text-[10px] text-zinc-400 font-bold uppercase tracking-wider truncate">{saga.title} — Cap #{chapter.number}</span>
        </div>

        <div className="flex border-b border-white/10 bg-[#14141e] p-1.5 gap-1.5">
          {(["pages", "episodes", "docs"] as const).map((tab) => {
            let label = tab === "pages" ? "Págs" : tab === "episodes" ? "Episodios" : "Docs";
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 font-[var(--font-bangers)] text-xs py-1.5 border rounded transition-all cursor-pointer ${isActive ? "bg-[#e8185a] text-white border-transparent shadow-[2px_2px_0_rgba(0,0,0,0.3)] translate-y-[-1px]" : "bg-zinc-800 text-zinc-300 border-white/10 hover:border-white/20 hover:bg-zinc-700"}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-[#0a0a0f] text-white">
          <AnimatePresence mode="wait">
            {activeTab === "pages" && (
              <motion.div key="pages-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
                <span className="font-[var(--font-bangers)] text-sm text-white tracking-wide mb-1 block">📖 Páginas ({pages.length})</span>
                <div className="grid grid-cols-2 gap-3">
                  {pages.map((src, idx) => {
                    const isSelected = pageIdx === idx;
                    const isEditing = editingPageName === idx;
                    const oldName = src.substring(src.lastIndexOf("/") + 1, src.lastIndexOf("."));
                    return (
                      <motion.div key={src} whileHover={{ scale: 1.03 }} className={`flex flex-col border rounded bg-[#161622] overflow-hidden transition-all ${isSelected ? "border-[#e8185a] shadow-[4px_4px_0_#e8185a]" : "border-white/10 shadow-[2px_2px_0_rgba(0,0,0,0.2)] hover:border-white/30"}`}>
                        <div className="relative aspect-[3/4] bg-[#0a0a0f] border-b border-white/10 cursor-pointer" onClick={() => resetPage(idx)}>
                          <img src={getComicPageUrl(src)} alt={`Página ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute bottom-1 right-1 bg-[#0a0a0f] text-yellow-400 font-[var(--font-bangers)] text-xs px-1.5 rounded">#{idx + 1}</div>
                        </div>
                        <div className="p-1.5 text-center flex flex-col gap-1">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input autoFocus type="text" value={newPageName} onChange={(e) => setNewPageName(e.target.value)} className="w-full text-xs p-1 border border-white/10 bg-[#0a0a0f] text-white rounded" />
                              <button onClick={() => handleRenamePage(idx, src)} className="bg-green-500 text-white p-1 rounded">✓</button>
                              <button onClick={() => setEditingPageName(null)} className="bg-zinc-300 p-1 rounded">✕</button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between px-1">
                              <span className={`text-[10px] font-bold ${isSelected ? "text-[#e8185a]" : "text-zinc-300"}`}>
                                {oldName}
                              </span>
                              <button onClick={() => { setEditingPageName(idx); setNewPageName(oldName); }} className="text-[10px] text-blue-400 hover:text-blue-300">✏️</button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab === "episodes" && (
              <motion.div key="episodes-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-[var(--font-bangers)] text-sm text-white tracking-wide">⚡ Sagas y Capítulos</span>
                  <button onClick={handleCreateSaga} className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded border border-white/10 hover:bg-emerald-700 transition-colors">+ Nueva Saga</button>
                </div>

                {loadingSagas ? <div className="text-center py-8 text-zinc-500 text-xs animate-pulse">Cargando...</div> : (
                  <div className="flex flex-col gap-4">
                    {sagas.map((s) => (
                      <div key={s.id} className="border border-white/10 bg-[#161622] p-2.5 rounded shadow-lg">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <div className="font-[var(--font-bangers)] text-xs px-2 py-0.5 rounded text-white border border-white/20" style={{ backgroundColor: s.color || "#0a0a0f" }}>
                              #{s.order} — {s.title}
                            </div>
                            <button onClick={() => handleRenameSaga(s.id, s.order, s.title)} className="text-[10px] text-blue-400 hover:text-blue-300">✏️</button>
                          </div>
                          <button onClick={() => handleCreateChapter(s.id)} className="text-[10px] bg-zinc-800 border border-white/10 text-white px-2 py-0.5 rounded hover:bg-zinc-700 font-bold transition-all">+ Capítulo</button>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {s.chapters.map((ch: any) => {
                            const isCurrent = ch.id === chapter.id;
                            return (
                              <div key={ch.id} className="flex gap-1">
                                <button onClick={() => handleSwitchChapter(ch.id)} className={`flex-1 text-left py-1.5 px-2.5 border rounded text-xs transition-all flex items-center justify-between cursor-pointer ${isCurrent ? "bg-white/10 border-white/30 text-white font-black" : "bg-[#0a0a0f] border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"}`}>
                                  <span className="truncate flex-1">#{ch.number} — {ch.title}</span>
                                  {isCurrent && <span className="text-[10px] text-[#e8185a] font-black">ACTIVO</span>}
                                </button>
                                <button onClick={() => handleRenameChapter(s.id, ch.id, ch.number, ch.title)} className="px-1.5 text-[10px] bg-zinc-800 border border-white/10 rounded hover:bg-zinc-750 text-white" title="Renombrar">✏️</button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "docs" && (
              <motion.div key="docs-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                <AnimatePresence mode="wait">
                  {selectedFilePath === null ? (
                    <motion.div key="explorer-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-[var(--font-bangers)] text-sm text-white tracking-wide">📁 Documentos narrativos</span>
                        <span className={`text-[9px] font-mono ${contextSaveStatus === "error" ? "text-red-400" : "text-zinc-500"}`}>
                          {contextSaveStatus === "saving" ? "Guardando…" : contextSaveStatus === "saved" ? "Asociado ✓" : contextSaveStatus === "error" ? "Error" : `${contextConfig.documents.length} asociados`}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        Elegí el rol de cada Markdown. La asociación se guarda en el capítulo actual y se reutiliza al generar.
                      </p>
                      {loadingDocs ? <div className="text-center py-8 text-zinc-500 text-xs animate-pulse">Cargando...</div> : (
                        <div className="border border-white/10 rounded p-2 bg-[#161622]">
                          {docTree?.children?.map((node) => renderTree(node))}
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div key="viewer-view" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full">
                      <div className="flex items-center gap-2 mb-3">
                        <button onClick={() => setSelectedFilePath(null)} className="py-1 px-2.5 bg-zinc-800 border border-white/10 text-[10px] font-bold cursor-pointer rounded hover:translate-y-0.5 text-white">← Volver</button>
                        <span className="text-[10px] font-bold text-zinc-400 truncate flex-1 uppercase tracking-wider text-right">{selectedFilePath.split("/").pop()}</span>
                        <button onClick={() => isEditingDoc ? handleSaveDoc() : setIsEditingDoc(true)} className={`py-1 px-2.5 border border-white/10 text-[10px] font-bold cursor-pointer rounded hover:translate-y-0.5 ${isEditingDoc ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>
                          {isEditingDoc ? "💾 Guardar" : "✏️ Editar"}
                        </button>
                      </div>

                      <div className="bg-[#161622] border border-white/10 rounded p-3 shadow-2xl overflow-y-auto max-h-[60vh] relative flex flex-col flex-1">
                        {loadingContent ? (
                          <div className="text-center py-12 text-zinc-500 text-xs animate-pulse">Cargando...</div>
                        ) : isEditingDoc ? (
                          <textarea
                            value={editedDocContent}
                            onChange={(e) => setEditedDocContent(e.target.value)}
                            className="w-full h-full min-h-[300px] text-xs font-mono p-2 border border-white/10 bg-[#0a0a0f] text-white rounded focus:outline-none resize-none flex-1"
                          />
                        ) : (
                          renderMarkdownContent(selectedFileContent || "")
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {modalConfig && (
        <EditorPromptModal
          isOpen={modalConfig.isOpen}
          title={modalConfig.title}
          fields={modalConfig.fields}
          onSubmit={handleModalSubmit}
          onCancel={handleModalCancel}
        />
      )}
    </>
  );
}
