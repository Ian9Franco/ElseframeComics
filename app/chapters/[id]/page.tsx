"use client";

import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { DraftLockScreen } from "@/components/reader/DraftLockScreen";
import { CinematicReader } from "@/components/reader/CinematicReader";

export default function ChapterPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [chapterData, setChapterData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const fetchChapterData = useCallback(() => {
    setLoading(true);
    setError(false);

    fetch(`/api/chapters/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setChapterData(data);
        setLoading(false);

        if (data.locked && data.reason === "draft") {
          return;
        }

        if (data.chapterIndex > 0 && data.prevChapter) {
          try {
            const read = localStorage.getItem("read-chapters");
            const readList = read ? JSON.parse(read) : [];
            const isPrevRead = readList
              .map((r: string) => decodeURIComponent(r).toLowerCase().trim())
              .includes(decodeURIComponent(data.prevChapter.id).toLowerCase().trim());
            if (!isPrevRead) {
              return;
            }
          } catch (e) {
            console.error(e);
          }
        }

        try {
          const read = localStorage.getItem("read-chapters");
          const readList: string[] = read ? JSON.parse(read) : [];
          const decodedId = decodeURIComponent(id);
          const decodedReadList = readList.map((r: string) => decodeURIComponent(r));
          if (!decodedReadList.includes(decodedId)) {
            readList.push(decodedId);
            localStorage.setItem("read-chapters", JSON.stringify(readList));
          }
        } catch (e) {
          console.error(e);
        }
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    fetchChapterData();
  }, [id, fetchChapterData]);

  if (!mounted) return null;

  if (error || (!loading && !chapterData)) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-6 p-8 text-center" style={{ background: "#0a0a0f" }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="panel panel-lg px-10 py-8 max-w-md text-center"
          style={{ borderColor: "#e8185a", boxShadow: "8px 8px 0 #e8185a" }}
        >
          <h1 className="font-[var(--font-bangers)] text-5xl md:text-7xl mb-4" style={{ color: "#e8185a", textShadow: "3px 3px 0 #0a0a0f" }}>
            404
          </h1>
          <p className="font-[var(--font-bangers)] text-2xl text-[#0a0a0f] mb-6 tracking-wider">
            Capítulo no encontrado
          </p>
          <button onClick={() => router.push("/")} className="btn btn-dark text-2xl">
            ← Volver al inicio
          </button>
        </motion.div>
      </div>
    );
  }

  if (loading) return <div className="flex-1" style={{ background: "#f4f0e6" }}><LoadingState /></div>;

  if (chapterData && chapterData.locked && chapterData.reason === "draft") {
    return (
      <DraftLockScreen
        chapterTitle={chapterData.title}
        onUnlock={fetchChapterData}
      />
    );
  }

  const { chapter, saga, pages, prevChapter, nextChapter } = chapterData;

  return (
    <CinematicReader
      pages={pages}
      dialogues={chapterData.dialogues ?? null}
      chapter={chapter}
      saga={saga}
      nextChapter={nextChapter}
      prevChapter={prevChapter}
      cover={chapterData.cover}
    />
  );
}

function LoadingState() {
  return (
    <div className="text-center py-32 flex flex-col items-center gap-6">
      <motion.div
        className="font-[var(--font-bangers)] text-6xl md:text-8xl text-white px-8 py-5"
        style={{ background: "#0a0a0f", border: "3px solid #e8185a", boxShadow: "8px 8px 0 #e8185a" }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
      >
        CARGANDO…
      </motion.div>
      <p className="font-[var(--font-marker)] text-2xl text-[#0a0a0f]/60">
        Bancá un toque...
      </p>
    </div>
  );
}
