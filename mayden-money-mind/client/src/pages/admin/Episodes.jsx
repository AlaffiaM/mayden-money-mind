// Admin episodes page — weekly calendar + table + create/edit modal with audio picker
// Supports the full episode lifecycle: create → schedule → auto-publish → notify subscribers
import { useState, useEffect, useRef } from "react";
import api from "../../services/api";
import { Plus, Trash2, Play, Pause, Calendar, Headphones, X, ChevronLeft, ChevronRight, Send, Music, Clock, Link2, Check } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

// Day pillar categories matching the subscriber Vault
const DAY_TYPES = [
  { key: "monday", label: "Monday", pillar: "Motivation & Vision", color: "bg-mayden-coral-tint text-orange-700" },
  { key: "tuesday", label: "Tuesday", pillar: "Money Tactics", color: "bg-mayden-blue-tint text-blue-700" },
  { key: "wednesday", label: "Wednesday", pillar: "Nervous System Resets", color: "bg-mayden-pink-tint text-pink-700" },
  { key: "thursday", label: "Thursday", pillar: "Success Stories", color: "bg-mayden-purple-tint text-purple-700" },
  { key: "friday", label: "Friday", pillar: "Financial Wins", color: "bg-mayden-gold-tint text-amber-700" },
];

const STATUS_BADGE = {
  draft: "bg-gray-100 text-gray-600",
  scheduled: "bg-amber-100 text-amber-700",
  published: "bg-emerald-100 text-emerald-700",
};

// Format seconds to "1 min 30 sec" display
function formatRuntime(seconds) {
  if (!seconds) return "";
  const s = parseInt(seconds);
  const min = Math.floor(s / 60);
  const sec = s % 60;
  if (min === 0) return `${sec} sec`;
  if (sec === 0) return `${min} min`;
  return `${min} min ${sec} sec`;
}

// Format a Date as "YYYY-MM-DD" using LOCAL time (avoids UTC offset bugs with toISOString)
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// TipTap rich text editor with bold, italic, lists, quote, and link support
function RichTextEditor({ value, onChange }) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  const addLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl("");
      setShowLinkInput(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 p-2 border-b border-gray-100 bg-gray-50 flex-wrap">
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={`px-2 py-1 text-xs rounded font-bold ${editor.isActive("bold") ? "bg-mayden-magenta text-white" : "text-gray-600 hover:bg-gray-200"}`}>B</button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`px-2 py-1 text-xs rounded italic ${editor.isActive("italic") ? "bg-mayden-magenta text-white" : "text-gray-600 hover:bg-gray-200"}`}>I</button>
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`px-2 py-1 text-xs rounded ${editor.isActive("bulletList") ? "bg-mayden-magenta text-white" : "text-gray-600 hover:bg-gray-200"}`}>• List</button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`px-2 py-1 text-xs rounded ${editor.isActive("orderedList") ? "bg-mayden-magenta text-white" : "text-gray-600 hover:bg-gray-200"}`}>1. List</button>
        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`px-2 py-1 text-xs rounded ${editor.isActive("blockquote") ? "bg-mayden-magenta text-white" : "text-gray-600 hover:bg-gray-200"}`}>Quote</button>
        <button onClick={() => setShowLinkInput(!showLinkInput)} className={`px-2 py-1 text-xs rounded ${showLinkInput || editor.isActive("link") ? "bg-mayden-magenta text-white" : "text-gray-600 hover:bg-gray-200"}`}><Link2 size={12} /></button>
      </div>
      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-mayden-magenta"
            onKeyDown={(e) => e.key === "Enter" && addLink()}
          />
          <button onClick={addLink} className="px-2 py-1 text-xs bg-mayden-magenta text-white rounded">Add</button>
          <button onClick={() => { setShowLinkInput(false); setLinkUrl(""); }} className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
        </div>
      )}
      <EditorContent editor={editor} className="prose prose-sm max-w-none p-3 min-h-[120px] focus:outline-none" />
    </div>
  );
}

// Weekly calendar showing episodes by day with publish buttons
function WeekCalendar({ episodes, weekOffset, onPublish }) {
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1 + weekOffset * 7);
  startOfWeek.setHours(0, 0, 0, 0);

  const days = DAY_TYPES.map((dt, i) => {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + i);
    const dateStr = toLocalDateStr(date);
    const ep = episodes.find((e) => {
      const epDate = toLocalDateStr(new Date(e.publishDate));
      return epDate === dateStr;
    });
    return { ...dt, date, dateStr, episode: ep || null };
  });

  return (
    <div className="grid grid-cols-5 gap-3">
      {days.map((day) => (
        <div key={day.key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 min-h-[180px]">
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${day.color}`}>{day.label}</span>
            <span className="text-xs text-gray-400">{day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </div>
          {day.episode ? (
            <div>
              <p className="text-sm font-medium text-mayden-dark line-clamp-2 mb-1">{day.episode.title}</p>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase ${STATUS_BADGE[day.episode.status]}`}>
                {day.episode.status}
              </span>
              {day.episode.runTimeSeconds > 0 && (
                <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                  <Clock size={8} /> {formatRuntime(day.episode.runTimeSeconds)}
                </p>
              )}
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                <Headphones size={10} /> {day.episode.listenCount || 0}
              </div>
              {day.episode.status !== "published" && (
                <button
                  onClick={() => onPublish(day.episode.id)}
                  className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1 bg-emerald-500 text-white text-xs rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  <Send size={10} /> Publish
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-300 text-center mt-6">No episode</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Episodes() {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEp, setEditingEp] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [form, setForm] = useState({ title: "", dayType: "monday", runTimeSeconds: "", showNotes: "" });
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [audioFiles, setAudioFiles] = useState({});
  const [saving, setSaving] = useState(false);
  const [playingPreview, setPlayingPreview] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState(false);
  const [toast, setToast] = useState(null);
  const previewRef = useRef(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchEpisodes = () => {
    api.get("/admin/episodes").then(({ data }) => setEpisodes(data)).catch(() => {}).finally(() => setLoading(false));
  };

  const fetchAudioFiles = () => {
    api.get("/admin/audio-files").then(({ data }) => setAudioFiles(data)).catch(() => {});
  };

  useEffect(() => { fetchEpisodes(); fetchAudioFiles(); }, []);

  // Find the next available date for a dayType — skips days that already have an episode
  const getNextAvailableDate = (dayTypeKey) => {
    const idx = DAY_TYPES.findIndex((d) => d.key === dayTypeKey);
    if (idx === -1) return toLocalDateStr(new Date());
    const taken = new Set(episodes.map((e) => toLocalDateStr(new Date(e.publishDate))));
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const dayOfWeek = start.getDay();
    const targetDay = idx + 1; // Monday=1, Tuesday=2, ... Friday=5
    let diff = targetDay - dayOfWeek;
    if (diff < 0) diff += 7;
    const candidate = new Date(start);
    candidate.setDate(candidate.getDate() + diff);
    while (taken.has(toLocalDateStr(candidate))) {
      candidate.setDate(candidate.getDate() + 7);
    }
    return toLocalDateStr(candidate);
  };

  // Get all remaining dates for a specific day type from this week through end of next month
  const getRemainingDatesForDayType = (dayTypeKey) => {
    const idx = DAY_TYPES.findIndex((d) => d.key === dayTypeKey);
    if (idx === -1) return [];
    const taken = new Set(episodes.map((e) => toLocalDateStr(new Date(e.publishDate))));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endWindow = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    const dayOfWeek = today.getDay();
    const targetDay = idx + 1;
    let diff = targetDay - dayOfWeek;
    if (diff < 0) diff += 7;
    const first = new Date(today);
    first.setDate(first.getDate() + diff);
    const results = [];
    const current = new Date(first);
    while (current <= endWindow) {
      const dateStr = toLocalDateStr(current);
      if (!taken.has(dateStr)) {
        results.push(dateStr);
      }
      current.setDate(current.getDate() + 7);
    }
    return results;
  };

  // Auto-detect audio duration from URL using the browser Audio API
  const detectAudioDuration = (url) => {
    return new Promise((resolve) => {
      const audio = new Audio(url);
      audio.addEventListener("loadedmetadata", () => {
        resolve(Math.round(audio.duration) || 0);
      });
      audio.addEventListener("error", () => resolve(0));
    });
  };

  const openCreate = () => {
    setEditingEp(null);
    const dayType = "monday";
    setForm({ title: "", dayType, runTimeSeconds: "", showNotes: "" });
    setSelectedAudio(null);
    setShowModal(true);
  };

  const openEdit = async (ep) => {
    setEditingEp(ep);
    setForm({
      title: ep.title,
      dayType: ep.dayType,
      runTimeSeconds: String(ep.runTimeSeconds || ""),
      showNotes: ep.showNotes || "",
    });
    setSelectedAudio(ep.audioUrl || null);
    setShowModal(true);
    if (ep.audioUrl && !ep.runTimeSeconds) {
      const duration = await detectAudioDuration(ep.audioUrl);
      if (duration > 0) setForm((prev) => ({ ...prev, runTimeSeconds: String(duration) }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingEp) {
        const fd = new FormData();
        fd.append("title", form.title);
        fd.append("dayType", form.dayType);
        fd.append("runTimeSeconds", form.runTimeSeconds);
        fd.append("showNotes", form.showNotes);
        fd.append("publishDate", getNextAvailableDate(form.dayType));
        if (selectedAudio) fd.append("audioUrl", selectedAudio);
        await api.put(`/admin/episodes/${editingEp.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        setShowModal(false);
        fetchEpisodes();
        showToast("Episode updated");
      } else {
        const dates = getRemainingDatesForDayType(form.dayType);
        if (dates.length === 0) {
          showToast("No remaining dates for this day type", "error");
          setSaving(false);
          return;
        }
        for (const date of dates) {
          const fd = new FormData();
          fd.append("title", form.title);
          fd.append("dayType", form.dayType);
          fd.append("runTimeSeconds", form.runTimeSeconds || 0);
          fd.append("showNotes", form.showNotes);
          fd.append("publishDate", date);
          if (selectedAudio) fd.append("audioUrl", selectedAudio);
          await api.post("/admin/episodes", fd, { headers: { "Content-Type": "multipart/form-data" } });
        }
        setShowModal(false);
        fetchEpisodes();
        showToast(`${dates.length} ${form.dayType} episodes scheduled`);
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to save episode", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id) => {
    try {
      await api.post(`/admin/episodes/${id}/publish`);
      fetchEpisodes();
      showToast("Episode published — subscribers notified");
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to publish", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/admin/episodes/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchEpisodes();
      showToast("Episode deleted");
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to delete", "error");
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleBulkPublish = async () => {
    try {
      const toPublish = selectedIds.filter((id) => {
        const ep = episodes.find((e) => e.id === id);
        return ep && ep.status !== "published";
      });
      for (const id of toPublish) {
        await api.post(`/admin/episodes/${id}/publish`);
      }
      setSelectedIds([]);
      fetchEpisodes();
      showToast(`${toPublish.length} episodes published`);
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to publish", "error");
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await api.delete(`/admin/episodes/${id}`);
      }
      setBulkDeleteTarget(false);
      setSelectedIds([]);
      fetchEpisodes();
      showToast(`${selectedIds.length} episodes deleted`);
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to delete", "error");
    }
  };

  const handleBulkAssignAudio = async () => {
    try {
      let assigned = 0;
      for (const id of selectedIds) {
        const ep = episodes.find((e) => e.id === id);
        if (!ep) continue;
        const dayAudio = audioFiles[ep.dayType] || [];
        if (dayAudio.length === 0) continue;
        const file = dayAudio[0];
        const duration = await detectAudioDuration(file.url);
        const fd = new FormData();
        fd.append("audioUrl", file.url);
        if (duration > 0) fd.append("runTimeSeconds", String(duration));
        await api.put(`/admin/episodes/${ep.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        assigned++;
      }
      setSelectedIds([]);
      fetchEpisodes();
      showToast(`Audio assigned to ${assigned} episodes`);
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to assign audio", "error");
    }
  };

  const togglePreview = (file) => {
    if (previewRef.current) {
      previewRef.current.pause();
      previewRef.current = null;
    }
    if (playingPreview === file.url) {
      setPlayingPreview(null);
      return;
    }
    const audio = new Audio(file.url);
    audio.play();
    audio.onended = () => setPlayingPreview(null);
    previewRef.current = audio;
    setPlayingPreview(file.url);
  };

  const currentDayFiles = audioFiles[form.dayType] || [];
  const currentDayPillar = DAY_TYPES.find((d) => d.key === form.dayType)?.pillar || "";
  const remainingCount = !editingEp ? getRemainingDatesForDayType(form.dayType).length : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-mayden-magenta border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-mayden-dark">Episodes</h1>
          <p className="text-sm text-gray-400 mt-1">Create episodes with audio and show notes. They auto-publish on the scheduled date and notify subscribers.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-mayden-magenta text-white rounded-lg text-sm font-medium hover:bg-mayden-magenta/90">
          <Plus size={16} /> New Episode
        </button>
      </div>

      {/* Weekly Calendar */}
      <div className="flex items-center gap-4">
        <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} /></button>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar size={16} />
          <span>Week of {new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 1 + weekOffset * 7)).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
        </div>
        <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight size={18} /></button>
        {weekOffset !== 0 && (
          <button onClick={() => setWeekOffset(0)} className="text-xs text-mayden-magenta hover:underline">Today</button>
        )}
      </div>

      <WeekCalendar episodes={episodes} weekOffset={weekOffset} onPublish={handlePublish} />

      {/* All Episodes — grouped by week */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-mayden-dark text-lg">All Episodes</h2>
            {episodes.length > 0 && (
              <button
                onClick={() => setSelectedIds((prev) => prev.length === episodes.length ? [] : episodes.map((e) => e.id))}
                className="text-[10px] text-mayden-magenta hover:underline font-medium"
              >
                {selectedIds.length === episodes.length ? "Deselect All" : "Select All"}
              </button>
            )}
          </div>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{selectedIds.length} selected</span>
              <button onClick={handleBulkAssignAudio} className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 flex items-center gap-1">
                <Music size={12} /> Assign Audio
              </button>
              <button onClick={handleBulkPublish} className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 flex items-center gap-1">
                <Send size={12} /> Publish
              </button>
              <button onClick={() => setBulkDeleteTarget(true)} className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 flex items-center gap-1">
                <Trash2 size={12} /> Delete
              </button>
              <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">Clear</button>
            </div>
          )}
        </div>

        {(() => {
          // Group episodes by week (Monday of each week)
          const weekMap = {};
          for (const ep of episodes) {
            const d = new Date(ep.publishDate);
            const day = d.getDay();
            const mondayOffset = day === 0 ? -6 : 1 - day;
            const monday = new Date(d);
            monday.setDate(monday.getDate() + mondayOffset);
            const weekKey = toLocalDateStr(monday);
            if (!weekMap[weekKey]) weekMap[weekKey] = [];
            weekMap[weekKey].push(ep);
          }
          const weeks = Object.entries(weekMap).sort(([a], [b]) => b.localeCompare(a));

          if (weeks.length === 0) {
            return <p className="text-center text-gray-400 py-12 bg-white rounded-xl border border-gray-100">No episodes yet. Click "New Episode" to get started.</p>;
          }

          return weeks.map(([weekKey, weekEps]) => {
            const monday = new Date(weekKey + "T00:00:00");
            const friday = new Date(monday);
            friday.setDate(friday.getDate() + 4);
            const weekLabel = `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${friday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

            const weekDayEps = DAY_TYPES.map((dt) => {
              const ep = weekEps.find((e) => e.dayType === dt.key);
              return { ...dt, episode: ep || null };
            });

            const weekSelected = weekDayEps.filter((d) => d.episode && selectedIds.includes(d.episode.id)).length;
            const weekTotal = weekDayEps.filter((d) => d.episode).length;
            const allWeekSelected = weekTotal > 0 && weekSelected === weekTotal;

            const toggleWeekSelect = () => {
              const ids = weekDayEps.filter((d) => d.episode).map((d) => d.episode.id);
              if (allWeekSelected) {
                setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
              } else {
                setSelectedIds((prev) => [...new Set([...prev, ...ids])]);
              }
            };

            return (
              <div key={weekKey} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleWeekSelect}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        allWeekSelected ? "bg-mayden-magenta border-mayden-magenta" : "border-gray-300 hover:border-mayden-magenta"
                      }`}
                    >
                      {allWeekSelected && <Check size={10} className="text-white" />}
                    </button>
                    <span className="font-medium text-xs text-mayden-dark">Week of {weekLabel}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">{weekSelected > 0 ? `${weekSelected}/${weekTotal} selected` : `${weekTotal} eps`}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {weekDayEps.map((day) => (
                    <div key={day.key} className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-50/50 ${day.episode && selectedIds.includes(day.episode.id) ? "bg-mayden-magenta/5" : ""}`}>
                      <button
                        onClick={() => day.episode && toggleSelect(day.episode.id)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                          day.episode && selectedIds.includes(day.episode.id) ? "bg-mayden-magenta border-mayden-magenta" : "border-gray-300 hover:border-mayden-magenta"
                        }`}
                      >
                        {day.episode && selectedIds.includes(day.episode.id) && <Check size={10} className="text-white" />}
                      </button>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 w-14 text-center ${day.color}`}>{day.label.slice(0, 3)}</span>
                      {day.episode ? (
                        <>
                          <span className="text-xs font-medium text-mayden-dark truncate flex-1 min-w-0">{day.episode.title}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase shrink-0 ${STATUS_BADGE[day.episode.status]}`}>{day.episode.status}</span>
                          <span className="text-[10px] text-gray-400 shrink-0 flex items-center gap-1"><Headphones size={10} />{day.episode.listenCount || 0}</span>
                          {day.episode.runTimeSeconds > 0 && <span className="text-[10px] text-gray-400 shrink-0">{formatRuntime(day.episode.runTimeSeconds)}</span>}
                          {!day.episode.audioUrl && <span className="text-[10px] text-amber-500 shrink-0">No audio</span>}
                          <div className="flex items-center gap-1 shrink-0">
                            {day.episode.status !== "published" && (
                              <button onClick={() => handlePublish(day.episode.id)} className="px-1.5 py-0.5 bg-emerald-500 text-white text-[10px] rounded hover:bg-emerald-600">Publish</button>
                            )}
                            <button onClick={() => openEdit(day.episode)} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded hover:bg-gray-200">Edit</button>
                            <button onClick={() => setDeleteTarget(day.episode)} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                          </div>
                        </>
                      ) : (
                        <span className="text-[10px] text-gray-300 flex-1 text-center">No episode</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-mayden-dark">{editingEp ? "Edit Episode" : "New Episode"}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editingEp ? "Update episode details" : "Pick a day type — episodes are scheduled for every remaining week"}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Episode Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. The Peace of Mind Fund"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20 focus:border-mayden-magenta"
                />
              </div>

              {/* Day Type + Runtime */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day Type</label>
                  <select value={form.dayType} onChange={(e) => setForm({ ...form, dayType: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    {DAY_TYPES.map((d) => <option key={d.key} value={d.key}>{d.label} — {d.pillar}</option>)}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">Pillar: {currentDayPillar}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Runtime</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={form.runTimeSeconds}
                      onChange={(e) => setForm({ ...form, runTimeSeconds: e.target.value })}
                      placeholder="Auto-detected from audio"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  {form.runTimeSeconds > 0 && (
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                      <Clock size={8} /> {formatRuntime(form.runTimeSeconds)}
                    </p>
                  )}
                </div>
              </div>

              {/* Remaining episodes summary — only when creating */}
              {!editingEp && remainingCount > 0 && (
                <div className="bg-mayden-magenta/5 border border-mayden-magenta/20 rounded-lg px-4 py-3">
                  <p className="text-sm text-mayden-dark font-medium">{remainingCount} {form.dayType} episodes will be created</p>
                  <p className="text-xs text-gray-500 mt-0.5">Starting from this week through end of next month. Dates with existing episodes are skipped.</p>
                </div>
              )}

              {!editingEp && remainingCount === 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-gray-500">All {form.dayType} episodes are already scheduled.</p>
                </div>
              )}

              {/* Audio Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Audio — {currentDayPillar} ({form.dayType})
                </label>
                {currentDayFiles.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3">No audio files available for this day. Add files to client/public/audio/Maiden/</p>
                ) : (
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                    {currentDayFiles.map((file) => (
                      <div
                        key={file.url}
                        onClick={async () => {
                          if (selectedAudio === file.url) {
                            setSelectedAudio(null);
                          } else {
                            setSelectedAudio(file.url);
                            const duration = await detectAudioDuration(file.url);
                            if (duration > 0) setForm((prev) => ({ ...prev, runTimeSeconds: String(duration) }));
                          }
                        }}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                          selectedAudio === file.url ? "bg-mayden-magenta/10 border-l-2 border-mayden-magenta" : "hover:bg-gray-50"
                        }`}
                      >
                        <Music size={14} className={`flex-shrink-0 ${selectedAudio === file.url ? "text-mayden-magenta" : "text-gray-400"}`} />
                        <span className={`text-sm flex-1 truncate ${selectedAudio === file.url ? "text-mayden-magenta font-medium" : "text-gray-600"}`}>
                          {file.name}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePreview(file); }}
                          className="p-1 rounded hover:bg-gray-200"
                        >
                          {playingPreview === file.url ? <Pause size={12} /> : <Play size={12} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {selectedAudio && (
                  <p className="text-xs text-mayden-magenta mt-1.5">Selected: {selectedAudio.split("/").pop()}</p>
                )}
              </div>

              {/* Show Notes — rich text with link support */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Show Notes</label>
                <p className="text-[10px] text-gray-400 mb-1.5">Appears below the audio player for subscribers. Use the link button to add clickable CTAs (e.g. "Open Mayden App").</p>
                <RichTextEditor value={form.showNotes} onChange={(val) => setForm({ ...form, showNotes: val })} />
              </div>
            </div>
            <div className="flex gap-3 justify-end p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.title || (!editingEp && remainingCount === 0)} className="px-4 py-2 bg-mayden-magenta text-white text-sm font-medium rounded-lg hover:bg-mayden-magenta/90 disabled:opacity-50">
                {saving ? "Saving..." : editingEp ? "Update" : `Schedule ${remainingCount} Episodes`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="font-bold text-mayden-dark mb-2">Delete Episode</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete "{deleteTarget.title}"? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="font-bold text-mayden-dark mb-2">Delete {selectedIds.length} Episodes</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete {selectedIds.length} episodes? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setBulkDeleteTarget(false)} className="flex-1 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200">Cancel</button>
              <button onClick={handleBulkDelete} className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600">Delete All</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${toast.type === "error" ? "bg-red-500 text-white" : "bg-emerald-500 text-white"}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
