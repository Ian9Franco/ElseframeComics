"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { BookOpen, Calendar, Cpu, Lock, Unlock } from "lucide-react";
import { DossierTab } from "@/components/lore/DossierTab";
import { TimelineTab } from "@/components/lore/TimelineTab";
import { BlueprintsTab } from "@/components/lore/BlueprintsTab";
import { CharacterModal } from "@/components/home/CharacterModal";
import { CHARACTER_DETAILS } from "@/lib/characterData";
import { PasswordPromptModal } from "@/components/PasswordPromptModal";
import { isPreviewAuthBypassedClient } from "@/lib/previewAuthClient";

type TabId = "dossier" | "timeline" | "blueprints";

const TABS: { id: TabId; label: string; short: string; icon: React.ReactNode }[] = [
  { id: "dossier",    label: "EXPEDIENTES CLASIFICADOS",    short: "EXPEDIENTES", icon: <BookOpen className="w-4 h-4 shrink-0" /> },
  { id: "timeline",   label: "TIMELINE DEL MULTIVERSO",    short: "TIMELINE",    icon: <Calendar className="w-4 h-4 shrink-0" /> },
  { id: "blueprints", label: "ESQUEMAS DE TECNOLOGÍA", short: "TECNOLOGÍA",    icon: <Cpu className="w-4 h-4 shrink-0" /> },
];

export default function LorePage() {
  const [activeTab, setActiveTab] = useState<TabId>("dossier");
  const [readChapters, setReadChapters] = useState<string[]>([]);
  const [unlockAll, setUnlockAll] = useState(false);
  const [selectedChar, setSelectedChar] = useState<any | null>(null);

  useEffect(() => {
    try {
      const read = localStorage.getItem("read-chapters");
      if (read) setReadChapters(JSON.parse(read));
      if (isPreviewAuthBypassedClient()) {
        localStorage.setItem("unlock-all", "true");
        setUnlockAll(true);
      } else {
        setUnlockAll(localStorage.getItem("unlock-all") === "true");
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const handleOpenModal = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      const charId = customEvent.detail?.id;
      if (charId) {
        const char = CHARACTER_DETAILS.find((c) => c.id === charId);
        if (char) {
          setSelectedChar(char);
        }
      }
    };
    window.addEventListener("open-character-modal", handleOpenModal);
    return () => window.removeEventListener("open-character-modal", handleOpenModal);
  }, []);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const toggleUnlockAll = () => {
    const next = !unlockAll;
    if (next) {
      if (isPreviewAuthBypassedClient()) {
        setUnlockAll(true);
        localStorage.setItem("unlock-all", "true");
        window.dispatchEvent(new Event("unlockAllChanged"));
        return;
      }
      setIsPasswordModalOpen(true);
    } else {
      setUnlockAll(false);
      localStorage.setItem("unlock-all", "false");
      window.dispatchEvent(new Event("unlockAllChanged"));
    }
  };

  const handleUnlockSuccess = () => {
    setUnlockAll(true);
    localStorage.setItem("unlock-all", "true");
    window.dispatchEvent(new Event("unlockAllChanged"));
  };

  return (
    <main className="min-h-screen bg-[#07070c] text-white selection:bg-[#e8185a] selection:text-white pb-20 relative overflow-hidden font-sans">
      {/* Sci-Fi grid backdrop */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] z-0" />

      <div className="max-w-5xl mx-auto px-6 pt-12 relative z-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 border-b-3 border-white pb-6">
          <div>
            <Link href="/" className="inline-block text-xs font-[var(--font-bangers)] text-[#e8185a] tracking-widest hover:underline mb-2 uppercase">
              ← REGRESAR A LA CENTRAL
            </Link>
            <h1 className="font-[var(--font-bangers)] text-5xl sm:text-6xl text-[#f5e642] tracking-widest" style={{ textShadow: "3px 3px 0 #e8185a" }}>
              MULTIVERSAL DATABASE
            </h1>
          </div>

          <button
            onClick={toggleUnlockAll}
            style={{
              backgroundColor: unlockAll ? "#e8185a" : "#1a1a25",
              borderColor: "#ffffff",
              boxShadow: "3px 3px 0 #000",
            }}
            className="px-4 py-2 border-2 text-[10px] sm:text-xs font-[var(--font-bangers)] tracking-widest uppercase transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer shrink-0"
          >
            {unlockAll ? (
              <><Unlock className="w-3.5 h-3.5 text-white" /><span>EXPEDIENTES REVELADOS</span></>
            ) : (
              <><Lock className="w-3.5 h-3.5 text-gray-400" /><span>ENCRIPTAR SPOILERS</span></>
            )}
          </button>
        </div>

        {/* Tab Nav */}
        <div className="flex border-3 border-white bg-[#0e0e16] p-1 shadow-[5px_5px_0_#000] mb-12">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 sm:py-3.5 px-3 sm:px-6 text-center flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5 font-[var(--font-bangers)] text-xs sm:text-sm tracking-wider transition-all border-2 cursor-pointer ${
                  active
                    ? "bg-[#f5e642] text-[#0a0a0f] border-black shadow-[2px_2px_0_#000] translate-y-[-1px]"
                    : "text-gray-400 hover:text-white hover:bg-white/5 border-transparent"
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.short}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "dossier" && (
            <DossierTab key="dossier" unlockAll={unlockAll} readChapters={readChapters} />
          )}
          {activeTab === "timeline" && (
            <TimelineTab key="timeline" unlockAll={unlockAll} readChapters={readChapters} />
          )}
          {activeTab === "blueprints" && (
            <BlueprintsTab key="blueprints" unlockAll={unlockAll} readChapters={readChapters} />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedChar && (
          <CharacterModal
            char={selectedChar}
            onClose={() => setSelectedChar(null)}
          />
        )}
      </AnimatePresence>

      <PasswordPromptModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={handleUnlockSuccess}
      />
    </main>
  );
}
