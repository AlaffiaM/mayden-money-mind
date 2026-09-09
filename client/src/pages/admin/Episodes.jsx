import { useState, useEffect, useRef } from "react";
import api from "../../services/api";
import {
  Plus,
  Trash2,
  Play,
  Pause,
  Calendar,
  Headphones,
  X,
  ChevronLeft,
  ChevronRight,
  Send,
  Music,
  Clock,
  Link2,
  Check,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  BUSINESS_UTC_OFFSET_MIN,
  businessDateStr as toLocalDateStr,
  businessDayOfWeek,
  businessToday,
} from "../../utils/businessTime.js";
import AdminPageHeading from "../../components/admin/AdminPageHeading";
import Loader from "../../components/admin/Loader";
import ConfirmModal from "../../components/admin/ConfirmModal";
import StatusBadge from "../../components/admin/StatusBadge";
import { useToast } from "../../components/admin/useToast";

const DAY_TYPES = [
  {
    key: "monday",
    label: "Monday",
    pillar: "Motivation & Vision",
    color: "bg-mayden-coral-tint text-orange-700",
  },
  {
    key: "tuesday",
    label: "Tuesday",
    pillar: "Money Tactics",
    color: "bg-mayden-blue-tint text-blue-700",
  },
  {
    key: "wednesday",
    label: "Wednesday",
    pillar: "Nervous System Resets",
    color: "bg-mayden-pink-tint text-pink-700",
  },
  {
    key: "thursday",
    label: "Thursday",
    pillar: "Success Stories",
    color: "bg-mayden-purple-tint text-purple-700",
  },
  {
    key: "friday",
    label: "Friday",
    pillar: "Financial Wins",
    color: "bg-mayden-gold-tint text-amber-700",
  },
];

function formatRuntime(seconds) {
  if (!seconds) return "";
  const s = parseInt(seconds);
  const min = Math.floor(s / 60);
  const sec = s % 60;
  if (min === 0) return `${sec} sec`;
  if (sec === 0) return `${min} min`;
  return `${min} min ${sec} sec`;
}

function formatShort(dateStr) {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${d}`;
}

function formatLong(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m - 1]} ${d}, ${y}`;
}

function businessWeekStart(dateStr, weekOffset) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const mondayShift = dow === 0 ? -6 : 1 - dow;
  return new Date(
    Date.UTC(y, m - 1, d + mondayShift + weekOffset * 7) -
      BUSINESS_UTC_OFFSET_MIN * 60000,
  );
}

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
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2 py-1 text-xs rounded font-bold ${editor.isActive("bold") ? "bg-mayden-magenta text-white" : "text-gray-600 hover:bg-gray-200"}`}
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 text-xs rounded italic ${editor.isActive("italic") ? "bg-mayden-magenta text-white" : "text-gray-600 hover:bg-gray-200"}`}
        >
          I
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 text-xs rounded ${editor.isActive("bulletList") ? "bg-mayden-magenta text-white" : "text-gray-600 hover:bg-gray-200"}`}
        >
          â€¢ List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 text-xs rounded ${editor.isActive("orderedList") ? "bg-mayden-magenta text-white" : "text-gray-600 hover:bg-gray-200"}`}
        >
          1. List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-2 py-1 text-xs rounded ${editor.isActive("blockquote") ? "bg-mayden-magenta text-white" : "text-gray-600 hover:bg-gray-200"}`}
        >
          Quote
        </button>
        <button
          onClick={() => setShowLinkInput(!showLinkInput)}
          className={`px-2 py-1 text-xs rounded ${showLinkInput || editor.isActive("link") ? "bg-mayden-magenta text-white" : "text-gray-600 hover:bg-gray-200"}`}
        >
          <Link2 size={12} />
        </button>
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
          <button
            onClick={addLink}
            className="px-2 py-1 text-xs bg-mayden-magenta text-white rounded"
          >
            Add
          </button>
          <button
            onClick={() => {
              setShowLinkInput(false);
              setLinkUrl("");
            }}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-3 min-h-[120px] focus:outline-none"
      />
    </div>
  );
}

function WeekCalendar({ episodes, weekOffset, onPublish }) {
  const startOfWeek = businessWeekStart(toLocalDateStr(new Date()), weekOffset);

  const days = DAY_TYPES.map((dt, i) => {
    const date = new Date(startOfWeek);
    date.setUTCDate(date.getUTCDate() + i);
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
        <div
          key={day.key}
          className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm min-h-[180px]"
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${day.color}`}
            >
              {day.label}
            </span>
            <span className="text-xs text-gray-400">
              {formatShort(day.dateStr)}
            </span>
          </div>
          {day.episode ? (
            <div>
              <p className="text-sm font-medium text-mayden-dark line-clamp-2 mb-1">
                {day.episode.title}
              </p>
              <StatusBadge status={day.episode.status} />
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
  const [form, setForm] = useState({
    title: "",
    dayType: "monday",
    runTimeSeconds: "",
    showNotes: "",
  });
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [audioFiles, setAudioFiles] = useState({});
  const [saving, setSaving] = useState(false);
  const [playingPreview, setPlayingPreview] = useState(null);
  const [playingRowId, setPlayingRowId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState(false);
  const previewRef = useRef(null);
  const toast = useToast();

  const fetchEpisodes = () => {
    api
      .get("/admin/episodes")
      .then(({ data }) => setEpisodes(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchAudioFiles = () => {
    api
      .get("/admin/audio-files")
      .then(({ data }) => setAudioFiles(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchEpisodes();
    fetchAudioFiles();
  }, []);

  const getNextAvailableDate = (dayTypeKey, excludeDates) => {
    const idx = DAY_TYPES.findIndex((d) => d.key === dayTypeKey);
    if (idx === -1) return toLocalDateStr(new Date());
    const taken = new Set(
      episodes.map((e) => toLocalDateStr(new Date(e.publishDate))),
    );
    const excludes = excludeDates
      ? (Array.isArray(excludeDates) ? excludeDates : [excludeDates]).map((d) =>
          toLocalDateStr(new Date(d)),
        )
      : [];
    for (const d of excludes) taken.add(d);
    const start = businessToday();
    const dayOfWeek = businessDayOfWeek(start);
    const targetDay = idx + 1;
    let diff = targetDay - dayOfWeek;
    if (diff < 0) diff += 7;
    const candidate = new Date(start);
    candidate.setUTCDate(candidate.getUTCDate() + diff);
    while (taken.has(toLocalDateStr(candidate))) {
      candidate.setUTCDate(candidate.getUTCDate() + 7);
    }
    return toLocalDateStr(candidate);
  };

  const getWeeklyDatesForDayType = (dayTypeKey, count) => {
    const dates = [];
    for (let i = 0; i < count; i++) {
      dates.push(getNextAvailableDate(dayTypeKey, dates.slice()));
    }
    return dates;
  };

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
    fetchAudioFiles();
    const dayType = "monday";
    setForm({ title: "", dayType, runTimeSeconds: "", showNotes: "" });
    setSelectedAudio(null);
    setShowModal(true);
  };

  const openEdit = async (ep) => {
    setEditingEp(ep);
    fetchAudioFiles();
    setForm({
      title: ep.title,
      dayType: ep.dayType,
      runTimeSeconds: String(ep.runTimeSeconds || ""),
      showNotes: ep.showNotes || "",
    });
    setSelectedAudio(ep.audioUrl || null);
    setShowModal(true);
    if (ep.audioUrl && !ep.runTimeSeconds) {
      try {
        const { data } = await api.post(`/admin/episodes/${ep.id}/stream`);
        const duration = await detectAudioDuration(data.url);
        if (duration > 0)
          setForm((prev) => ({ ...prev, runTimeSeconds: String(duration) }));
      } catch {
        const duration = await detectAudioDuration(
          ep.previewAudioUrl || ep.audioUrl,
        );
        if (duration > 0)
          setForm((prev) => ({ ...prev, runTimeSeconds: String(duration) }));
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingEp) {
        const publishDate =
          form.dayType === editingEp.dayType
            ? toLocalDateStr(new Date(editingEp.publishDate))
            : getNextAvailableDate(
                form.dayType,
                toLocalDateStr(new Date(editingEp.publishDate)),
              );
        const fd = new FormData();
        fd.append("title", form.title);
        fd.append("dayType", form.dayType);
        fd.append("runTimeSeconds", form.runTimeSeconds);
        fd.append("showNotes", form.showNotes);
        fd.append("publishDate", publishDate);
        if (selectedAudio) fd.append("audioUrl", selectedAudio);
        await api.put(`/admin/episodes/${editingEp.id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setShowModal(false);
        fetchEpisodes();
        toast("Episode updated");
      } else {
        if (currentDayFiles.length === 0) {
          toast("No audio files available for this day type", "error");
          return;
        }
        const dates = getWeeklyDatesForDayType(
          form.dayType,
          currentDayFiles.length,
        );
        const episodes = [];
        for (let i = 0; i < currentDayFiles.length; i++) {
          const file = currentDayFiles[i];
          const duration = await detectAudioDuration(file.url);
          episodes.push({
            title: form.title,
            dayType: form.dayType,
            runTimeSeconds: duration > 0 ? String(duration) : "0",
            showNotes: form.showNotes,
            publishDate: dates[i],
            audioUrl: file.path,
          });
        }
        const { data } = await api.post("/admin/episodes/batch", { episodes });
        setShowModal(false);
        fetchEpisodes();
        toast(`${data.length} ${form.dayType} episodes scheduled`);
      }
    } catch (err) {
      toast(err.response?.data?.error || "Failed to save episode", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id) => {
    try {
      await api.post(`/admin/episodes/${id}/publish`);
      fetchEpisodes();
      toast("Episode published â€” subscribers notified");
    } catch (err) {
      toast(err.response?.data?.error || "Failed to publish", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/admin/episodes/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchEpisodes();
      toast("Episode deleted");
    } catch (err) {
      toast(err.response?.data?.error || "Failed to delete", "error");
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
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
      toast(`${toPublish.length} episodes published`);
    } catch (err) {
      toast(err.response?.data?.error || "Failed to publish", "error");
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
      toast(`${selectedIds.length} episodes deleted`);
    } catch (err) {
      toast(err.response?.data?.error || "Failed to delete", "error");
    }
  };

  const assignAudioInOrder = async (epIds, onlyMissing) => {
    let targets = epIds
      .map((id) => episodes.find((e) => e.id === id))
      .filter(Boolean);
    if (onlyMissing) targets = targets.filter((e) => !e.audioUrl);
    if (targets.length === 0) return 0;

    const byDay = {};
    for (const ep of targets) {
      (byDay[ep.dayType] = byDay[ep.dayType] || []).push(ep);
    }

    let assigned = 0;
    for (const dayType of Object.keys(byDay)) {
      const files = audioFiles[dayType] || [];
      if (files.length === 0) continue;
      const group = byDay[dayType].sort(
        (a, b) => new Date(a.publishDate) - new Date(b.publishDate),
      );
      for (let i = 0; i < group.length; i++) {
        const file = files[i % files.length];
        const duration = await detectAudioDuration(file.url);
        const fd = new FormData();
        fd.append("audioUrl", file.path);
        if (duration > 0) fd.append("runTimeSeconds", String(duration));
        await api.put(`/admin/episodes/${group[i].id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        assigned++;
      }
    }
    return assigned;
  };

  const handleBulkAssignAudio = async () => {
    try {
      const assigned = await assignAudioInOrder(selectedIds, false);
      setSelectedIds([]);
      fetchEpisodes();
      toast(
        assigned > 0
          ? `Audio assigned to ${assigned} episodes`
          : "No audio files available for the selected day(s)",
      );
    } catch (err) {
      toast(err.response?.data?.error || "Failed to assign audio", "error");
    }
  };

  const handleAssignMissingAudio = async (ids = null) => {
    try {
      const source =
        ids || episodes.filter((e) => !e.audioUrl).map((e) => e.id);
      const targets = source.filter(
        (id) => !episodes.find((e) => e.id === id)?.audioUrl,
      );
      if (targets.length === 0) {
        toast("No episodes are missing audio");
        return;
      }
      const assigned = await assignAudioInOrder(targets, true);
      setSelectedIds([]);
      fetchEpisodes();
      toast(
        assigned > 0
          ? `Audio assigned to ${assigned} episodes`
          : "No audio files available for those day(s)",
      );
    } catch (err) {
      toast(err.response?.data?.error || "Failed to assign audio", "error");
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

  const toggleRowPlay = async (ep) => {
    if (previewRef.current) {
      previewRef.current.pause();
      previewRef.current = null;
    }
    if (playingRowId === ep.id) {
      setPlayingRowId(null);
      return;
    }
    if (!ep.audioUrl) {
      openEdit(ep);
      return;
    }
    try {
      const { data } = await api.post(`/admin/episodes/${ep.id}/stream`);
      const audio = new Audio(data.url);
      audio.play();
      audio.onended = () => setPlayingRowId(null);
      previewRef.current = audio;
      setPlayingRowId(ep.id);
    } catch {
      const audio = new Audio(ep.previewAudioUrl || ep.audioUrl);
      audio.play();
      audio.onended = () => setPlayingRowId(null);
      previewRef.current = audio;
      setPlayingRowId(ep.id);
    }
  };

  const currentDayFiles = audioFiles[form.dayType] || [];
  const currentDayPillar =
    DAY_TYPES.find((d) => d.key === form.dayType)?.pillar || "";
  const batchCount = !editingEp ? currentDayFiles.length : 0;
  const batchDates = !editingEp
    ? getWeeklyDatesForDayType(form.dayType, batchCount)
    : [];

  if (loading) {
    return <Loader label="Loading episodes…" />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeading
        title="Episodes"
        subtitle="Create episodes with audio and show notes. They auto-publish on the scheduled date and notify subscribers."
        actions={
          <div className="flex items-center gap-2">
            {episodes.some((e) => !e.audioUrl) && (
              <button
                onClick={() => handleAssignMissingAudio()}
                className="flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-600"
              >
                <Music size={16} /> Assign Missing Audio
              </button>
            )}
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-full bg-mayden-magenta px-4 py-2 text-sm font-medium text-white shadow-md shadow-mayden-magenta/20 transition-colors hover:bg-mayden-magenta/90"
            >
              <Plus size={16} /> New Episode
            </button>
          </div>
        }
      />

      <div className="flex items-center gap-3">
        <button
          onClick={() => setWeekOffset(weekOffset - 1)}
          aria-label="Previous week"
          className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition-colors hover:border-mayden-magenta hover:text-mayden-magenta"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-gray-600 shadow-sm">
          <Calendar size={16} className="text-mayden-magenta" />
          <span>
            Week of{" "}
            {formatLong(
              toLocalDateStr(
                businessWeekStart(toLocalDateStr(new Date()), weekOffset),
              ),
            )}
          </span>
        </div>
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          aria-label="Next week"
          className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition-colors hover:border-mayden-magenta hover:text-mayden-magenta"
        >
          <ChevronRight size={18} />
        </button>
        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            className="text-xs font-medium text-mayden-magenta hover:underline"
          >
            Today
          </button>
        )}
      </div>

      <WeekCalendar
        episodes={episodes}
        weekOffset={weekOffset}
        onPublish={handlePublish}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-mayden-dark text-lg">
              All Episodes
            </h2>
            {episodes.length > 0 && (
              <button
                onClick={() =>
                  setSelectedIds((prev) =>
                    prev.length === episodes.length
                      ? []
                      : episodes.map((e) => e.id),
                  )
                }
                className="text-[10px] text-mayden-magenta hover:underline font-medium"
              >
                {selectedIds.length === episodes.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            )}
          </div>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">
                {selectedIds.length} selected
              </span>
              <button
                onClick={handleBulkAssignAudio}
                className="flex items-center gap-1 rounded-full bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-600"
              >
                <Music size={12} /> Assign Audio
              </button>
              <button
                onClick={() => handleAssignMissingAudio(selectedIds)}
                className="flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-600"
              >
                <Music size={12} /> Assign Missing
              </button>
              <button
                onClick={handleBulkPublish}
                className="flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-600"
              >
                <Send size={12} /> Publish
              </button>
              <button
                onClick={() => setBulkDeleteTarget(true)}
                className="flex items-center gap-1 rounded-full bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600"
              >
                <Trash2 size={12} /> Delete
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {(() => {
          const weekMap = {};
          for (const ep of episodes) {
            const d = new Date(ep.publishDate);
            const day = businessDayOfWeek(d);
            const mondayOffset = day === 0 ? -6 : 1 - day;
            const monday = new Date(ep.publishDate);
            monday.setUTCDate(monday.getUTCDate() + mondayOffset);
            const weekKey = toLocalDateStr(monday);
            if (!weekMap[weekKey]) weekMap[weekKey] = [];
            weekMap[weekKey].push(ep);
          }
          const weeks = Object.entries(weekMap).sort(([a], [b]) =>
            b.localeCompare(a),
          );

          if (weeks.length === 0) {
            return (
              <p className="rounded-2xl border border-gray-100 bg-white py-12 text-center text-gray-400">
                No episodes yet. Click "New Episode" to get started.
              </p>
            );
          }

          return weeks.map(([weekKey, weekEps]) => {
            const mondayStr = weekKey;
            const friday = new Date(`${mondayStr}T00:00:00Z`);
            friday.setUTCDate(friday.getUTCDate() + 4);
            const fridayStr = toLocalDateStr(friday);
            const weekLabel = `${formatShort(mondayStr)} â€“ ${formatLong(fridayStr)}`;

            const weekDayEps = DAY_TYPES.map((dt) => {
              const ep = weekEps.find((e) => e.dayType === dt.key);
              return { ...dt, episode: ep || null };
            });

            const weekSelected = weekDayEps.filter(
              (d) => d.episode && selectedIds.includes(d.episode.id),
            ).length;
            const weekTotal = weekDayEps.filter((d) => d.episode).length;
            const allWeekSelected = weekTotal > 0 && weekSelected === weekTotal;

            const toggleWeekSelect = () => {
              const ids = weekDayEps
                .filter((d) => d.episode)
                .map((d) => d.episode.id);
              if (allWeekSelected) {
                setSelectedIds((prev) =>
                  prev.filter((id) => !ids.includes(id)),
                );
              } else {
                setSelectedIds((prev) => [...new Set([...prev, ...ids])]);
              }
            };

            return (
              <div
                key={weekKey}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-gray-100 bg-mayden-gray/60 px-4 py-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleWeekSelect}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        allWeekSelected
                          ? "bg-mayden-magenta border-mayden-magenta"
                          : "border-gray-300 hover:border-mayden-magenta"
                      }`}
                    >
                      {allWeekSelected && (
                        <Check size={10} className="text-white" />
                      )}
                    </button>
                    <span className="font-medium text-xs text-mayden-dark">
                      Week of {weekLabel}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {weekSelected > 0
                      ? `${weekSelected}/${weekTotal} selected`
                      : `${weekTotal} eps`}
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {weekDayEps.map((day) => (
                    <div
                      key={day.key}
                      className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-50/50 ${day.episode && selectedIds.includes(day.episode.id) ? "bg-mayden-magenta/5" : ""}`}
                    >
                      <button
                        onClick={() =>
                          day.episode && toggleSelect(day.episode.id)
                        }
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                          day.episode && selectedIds.includes(day.episode.id)
                            ? "bg-mayden-magenta border-mayden-magenta"
                            : "border-gray-300 hover:border-mayden-magenta"
                        }`}
                      >
                        {day.episode &&
                          selectedIds.includes(day.episode.id) && (
                            <Check size={10} className="text-white" />
                          )}
                      </button>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 w-14 text-center ${day.color}`}
                      >
                        {day.label.slice(0, 3)}
                      </span>
                      {day.episode ? (
                        <>
                          <button
                            onClick={() => toggleRowPlay(day.episode)}
                            title={
                              day.episode.audioUrl
                                ? "Play audio"
                                : "No audio â€” edit to assign"
                            }
                            className={`shrink-0 p-1 rounded-full transition-colors ${
                              playingRowId === day.episode.id
                                ? "text-white bg-mayden-magenta"
                                : day.episode.audioUrl
                                  ? "text-mayden-magenta hover:bg-mayden-magenta/10"
                                  : "text-gray-300 hover:text-gray-400"
                            }`}
                          >
                            {playingRowId === day.episode.id ? (
                              <Pause size={12} />
                            ) : (
                              <Play size={12} />
                            )}
                          </button>
                          <span className="text-xs font-medium text-mayden-dark truncate flex-1 min-w-0">
                            {day.episode.title}
                          </span>
                          <StatusBadge status={day.episode.status} />
                          <span className="text-[10px] text-gray-400 shrink-0 flex items-center gap-1">
                            <Headphones size={10} />
                            {day.episode.listenCount || 0}
                          </span>
                          {day.episode.runTimeSeconds > 0 && (
                            <span className="text-[10px] text-gray-400 shrink-0">
                              {formatRuntime(day.episode.runTimeSeconds)}
                            </span>
                          )}
                          {!day.episode.audioUrl && (
                            <span className="text-[10px] text-amber-500 shrink-0">
                              No audio
                            </span>
                          )}
                          <div className="flex items-center gap-1 shrink-0">
                            {day.episode.status !== "published" && (
                              <button
                                onClick={() => handlePublish(day.episode.id)}
                                className="px-1.5 py-0.5 bg-emerald-500 text-white text-[10px] rounded hover:bg-emerald-600"
                              >
                                Publish
                              </button>
                            )}
                            <button
                              onClick={() => openEdit(day.episode)}
                              className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded hover:bg-gray-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteTarget(day.episode)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <span className="text-[10px] text-gray-300 flex-1 text-center">
                          No episode
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          });
        })()}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-mayden-dark">
                  {editingEp ? "Edit Episode" : "New Episode"}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editingEp
                    ? "Update episode details"
                    : "Pick a day type â€” episodes are created for every week the day has audio"}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Episode Focus
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. The Peace of Mind Fund"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20 focus:border-mayden-magenta"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Day Type
                  </label>
                  <select
                    value={form.dayType}
                    onChange={(e) =>
                      setForm({ ...form, dayType: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    {DAY_TYPES.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.label} â€” {d.pillar}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Pillar: {currentDayPillar}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Runtime
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={form.runTimeSeconds}
                      onChange={(e) =>
                        setForm({ ...form, runTimeSeconds: e.target.value })
                      }
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

              {!editingEp && batchCount > 0 && (
                <div className="bg-mayden-magenta/5 border border-mayden-magenta/20 rounded-lg px-4 py-3">
                  <p className="text-sm text-mayden-dark font-medium">
                    {batchCount} {form.dayType} episodes will be created
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    From {batchDates[0]} to {batchDates[batchDates.length - 1]}.
                    Each episode gets the next audio file in order (weeks with
                    existing episodes are skipped).
                  </p>
                </div>
              )}

              {!editingEp && batchCount === 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-gray-500">
                    No audio files available for this day. Add files to
                    server/storage/audio/Maiden/
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Audio â€” {currentDayPillar} ({form.dayType})
                </label>
                {currentDayFiles.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3">
                    No audio files available for this day. Add files to
                    server/storage/audio/Maiden/
                  </p>
                ) : (
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                    {currentDayFiles.map((file) => (
                      <div
                        key={file.path}
                        onClick={async () => {
                          if (selectedAudio === file.path) {
                            setSelectedAudio(null);
                          } else {
                            setSelectedAudio(file.path);
                            const duration = await detectAudioDuration(
                              file.url,
                            );
                            if (duration > 0)
                              setForm((prev) => ({
                                ...prev,
                                runTimeSeconds: String(duration),
                              }));
                          }
                        }}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                          selectedAudio === file.path
                            ? "bg-mayden-magenta/10 border-l-2 border-mayden-magenta"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <Music
                          size={14}
                          className={`flex-shrink-0 ${selectedAudio === file.path ? "text-mayden-magenta" : "text-gray-400"}`}
                        />
                        <span
                          className={`text-sm flex-1 truncate ${selectedAudio === file.path ? "text-mayden-magenta font-medium" : "text-gray-600"}`}
                        >
                          {file.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePreview(file);
                          }}
                          className="p-1 rounded hover:bg-gray-200"
                        >
                          {playingPreview === file.path ? (
                            <Pause size={12} />
                          ) : (
                            <Play size={12} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {selectedAudio && (
                  <p className="text-xs text-mayden-magenta mt-1.5">
                    Selected: {selectedAudio.split("/").pop()}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Show Notes
                </label>
                <p className="text-[10px] text-gray-400 mb-1.5">
                  Appears below the audio player for subscribers. Use the link
                  button to add clickable CTAs (e.g. "Open Mayden App").
                </p>
                <RichTextEditor
                  value={form.showNotes}
                  onChange={(val) => setForm({ ...form, showNotes: val })}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end p-5 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-full"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={
                  saving || !form.title || (!editingEp && batchCount === 0)
                }
                className="px-4 py-2 bg-mayden-magenta text-white text-sm font-medium rounded-full hover:bg-mayden-magenta/90 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingEp
                    ? "Update"
                    : `Schedule ${batchCount} Episodes`}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Episode"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.title}"? This cannot be undone.`
            : ""
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmModal
        open={bulkDeleteTarget}
        title={`Delete ${selectedIds.length} Episodes`}
        message={`Are you sure you want to delete ${selectedIds.length} episodes? This cannot be undone.`}
        confirmLabel="Delete All"
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteTarget(false)}
      />
    </div>
  );
}
