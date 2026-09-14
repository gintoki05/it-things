"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import {
  fetchFeedbacksAction,
  createFeedbackAction,
  toggleFeedbackUpvoteAction,
  updateFeedbackStatusAction,
  deleteFeedbackAction,
  type FeedbackItem,
  type FeedbackCategory,
  type FeedbackUrgency,
  type FeedbackStatus,
} from "@/app/actions/feedback"
import { RetroActionButton } from "@/components/ui/retro-action-button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { UserAvatar } from "@/components/retro/user-avatar"
import { playRetroNotificationSound } from "@/lib/sound-effects"
import {
  Lightbulb,
  Bug,
  MessageSquare,
  ThumbsUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  EyeOff,
  UserCheck,
  ShieldCheck,
  Filter,
  Check,
  Sparkles,
} from "lucide-react"

const CATEGORY_MAP: Record<
  FeedbackCategory,
  { label: string; icon: React.ReactNode; badgeClass: string }
> = {
  feature: {
    label: "Ide Fitur",
    icon: <Lightbulb className="size-3 text-amber-600" />,
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
  },
  bug: {
    label: "Lapor Bug",
    icon: <Bug className="size-3 text-rose-600" />,
    badgeClass: "bg-rose-100 text-rose-900 border-rose-300",
  },
  suggestion: {
    label: "Saran Tim",
    icon: <MessageSquare className="size-3 text-blue-600" />,
    badgeClass: "bg-blue-100 text-blue-900 border-blue-300",
  },
}

const URGENCY_MAP: Record<
  FeedbackUrgency,
  { label: string; badgeClass: string }
> = {
  low: {
    label: "Santai",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
  },
  normal: {
    label: "Penting",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
  },
  urgent: {
    label: "Darurat",
    badgeClass: "bg-red-100 text-red-800 border-red-400 font-bold animate-pulse",
  },
}

const STATUS_MAP: Record<
  FeedbackStatus,
  { label: string; icon: React.ReactNode; badgeClass: string }
> = {
  new: {
    label: "Baru",
    icon: <Sparkles className="size-3 text-amber-500" />,
    badgeClass: "bg-amber-50 text-amber-900 border-amber-300",
  },
  in_review: {
    label: "Ditinjau",
    icon: <Clock className="size-3 text-blue-500" />,
    badgeClass: "bg-blue-50 text-blue-900 border-blue-300",
  },
  in_progress: {
    label: "Diproses",
    icon: <Clock className="size-3 text-purple-600" />,
    badgeClass: "bg-purple-50 text-purple-900 border-purple-300",
  },
  resolved: {
    label: "Selesai",
    icon: <CheckCircle2 className="size-3 text-emerald-600" />,
    badgeClass: "bg-emerald-50 text-emerald-900 border-emerald-300 font-bold",
  },
  closed: {
    label: "Ditutup",
    icon: <Check className="size-3 text-gray-500" />,
    badgeClass: "bg-gray-100 text-gray-600 border-gray-300",
  },
}

export function FeedbackApp() {
  const { user, isGuest, isAdmin } = useAuth()
  const [activeTab, setActiveTab] = React.useState<"list" | "form">("list")

  // List data state
  const [feedbacks, setFeedbacks] = React.useState<FeedbackItem[]>([])
  const [isLoading, setIsLoading] = React.useState<boolean>(true)
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all")
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all")
  const [sortBy, setSortBy] = React.useState<"top" | "newest">("top")

  // Form input state
  const [formCategory, setFormCategory] = React.useState<FeedbackCategory>("feature")
  const [formUrgency, setFormUrgency] = React.useState<FeedbackUrgency>("normal")
  const [formTitle, setFormTitle] = React.useState<string>("")
  const [formDesc, setFormDesc] = React.useState<string>("")
  const [formAnonymous, setFormAnonymous] = React.useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false)
  const [formMessage, setFormMessage] = React.useState<{ text: string; isError?: boolean } | null>(null)

  // Admin status update modal state
  const [editingFeedback, setEditingFeedback] = React.useState<FeedbackItem | null>(null)
  const [adminStatus, setAdminStatus] = React.useState<FeedbackStatus>("in_review")
  const [adminNote, setAdminNote] = React.useState<string>("")
  const [isAdminUpdating, setIsAdminUpdating] = React.useState<boolean>(false)

  // Delete confirm dialog
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false)

  // Load Feedbacks
  const loadFeedbacks = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token || null
      const res = await fetchFeedbacksAction({
        category: selectedCategory,
        status: selectedStatus,
        sortBy,
        currentUserId: user?.id || null,
        token,
      })
      if (res.data) {
        setFeedbacks(res.data)
      }
    } catch (err) {
      console.error("Error loading feedbacks:", err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCategory, selectedStatus, sortBy, user?.id])

  React.useEffect(() => {
    loadFeedbacks()
  }, [loadFeedbacks])

  // Realtime subscription
  React.useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    const channel = supabase
      .channel("feedback-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feedbacks" },
        () => {
          loadFeedbacks()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feedback_upvotes" },
        () => {
          loadFeedbacks()
        }
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [loadFeedbacks])

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isGuest || !user) {
      setFormMessage({ text: "Anda sedang dalam Mode Tamu. Masuk dengan akun Google untuk mengirim saran.", isError: true })
      return
    }

    const trimmedTitle = formTitle.trim()
    const trimmedDesc = formDesc.trim()

    if (!trimmedTitle || !trimmedDesc) {
      setFormMessage({ text: "Judul dan rincian saran tidak boleh kosong!", isError: true })
      return
    }

    setIsSubmitting(true)
    setFormMessage(null)

    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token || null
      const res = await createFeedbackAction({
        title: trimmedTitle,
        description: trimmedDesc,
        category: formCategory,
        urgency: formUrgency,
        isAnonymous: formAnonymous,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatarUrl,
        token,
      })

      if (res.success && res.data) {
        playRetroNotificationSound()
        // Reset form
        setFormTitle("")
        setFormDesc("")
        setFormAnonymous(false)
        setActiveTab("list")
        setFeedbacks((prev) => [res.data!, ...prev])
      } else {
        setFormMessage({ text: res.error || "Gagal mengirim masukan. Coba lagi.", isError: true })
      }
    } catch (err: unknown) {
      setFormMessage({ text: err instanceof Error ? err.message : "Terjadi kesalahan.", isError: true })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Upvote
  const handleToggleUpvote = async (feedback: FeedbackItem) => {
    if (isGuest || !user) {
      alert("Silakan masuk dengan akun Google untuk memberikan dukungan (upvote).")
      return
    }

    const currentHasUpvoted = feedback.hasUpvoted
    const currentCount = feedback.upvoteCount
    const newHasUpvoted = !currentHasUpvoted
    const newCount = newHasUpvoted ? currentCount + 1 : Math.max(0, currentCount - 1)

    // Optimistic UI
    setFeedbacks((prev) =>
      prev.map((item) =>
        item.id === feedback.id
          ? { ...item, hasUpvoted: newHasUpvoted, upvoteCount: newCount }
          : item
      )
    )

    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token || null
      const res = await toggleFeedbackUpvoteAction({
        feedbackId: feedback.id,
        userId: user.id,
        token,
      })

      if (!res.success) {
        // Rollback on failure
        setFeedbacks((prev) =>
          prev.map((item) =>
            item.id === feedback.id
              ? { ...item, hasUpvoted: currentHasUpvoted, upvoteCount: currentCount }
              : item
          )
        )
      } else {
        playRetroNotificationSound()
      }
    } catch {
      // Rollback
      setFeedbacks((prev) =>
        prev.map((item) =>
          item.id === feedback.id
            ? { ...item, hasUpvoted: currentHasUpvoted, upvoteCount: currentCount }
            : item
        )
      )
    }
  }

  // Handle Admin Status Update
  const handleSaveAdminStatus = async () => {
    if (!editingFeedback) return
    setIsAdminUpdating(true)

    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token || null
      const res = await updateFeedbackStatusAction({
        feedbackId: editingFeedback.id,
        status: adminStatus,
        adminNote: adminNote.trim() || null,
        token,
      })

      if (res.success) {
        playRetroNotificationSound()
        setFeedbacks((prev) =>
          prev.map((item) =>
            item.id === editingFeedback.id
              ? { ...item, status: adminStatus, adminNote: adminNote.trim() || null }
              : item
          )
        )
        setEditingFeedback(null)
      } else {
        alert(res.error || "Gagal memperbarui status masukan")
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsAdminUpdating(false)
    }
  }

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!deletingId || !user) return
    setIsDeleting(true)

    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token || null
      const res = await deleteFeedbackAction({
        feedbackId: deletingId,
        userId: user.id,
        isAdmin,
        token,
      })

      if (res.success) {
        setFeedbacks((prev) => prev.filter((item) => item.id !== deletingId))
        setDeletingId(null)
      } else {
        alert(res.error || "Gagal menghapus masukan")
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus")
    } finally {
      setIsDeleting(false)
    }
  }

  const resolvedCount = feedbacks.filter((f) => f.status === "resolved").length

  return (
    <div className="flex flex-col h-full bg-[#D4DDE6] text-[#14253D] select-none font-sans text-xs">
      {/* Top Retro Header Bar */}
      <div className="p-2 sm:p-2.5 bg-gradient-to-r from-[#102A45] to-[#1E4E8C] text-white flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#5E7287]">
        <div className="flex items-center gap-2">
          <span className="text-xl">💡</span>
          <div>
            <h1 className="font-bold text-xs sm:text-sm tracking-wide flex items-center gap-1.5 leading-tight font-mono">
              FEEDBACK.EXE
              <span className="bg-amber-400 text-slate-950 font-bold text-[9px] px-1 py-0.2 rounded leading-none">
                v2.0
              </span>
            </h1>
            <p className="text-[10px] text-blue-200 opacity-90 hidden sm:block">
              Kotak Saran, Ide Fitur, dan Pelaporan Masalah Internal IT
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-mono">
          <div className="bg-black/30 border border-white/20 px-2 py-0.5 rounded flex items-center gap-1.5">
            <span>Total Masukan:</span>
            <span className="font-bold text-amber-300">{feedbacks.length}</span>
          </div>
          <div className="bg-black/30 border border-white/20 px-2 py-0.5 rounded flex items-center gap-1.5 hidden sm:flex">
            <span>Selesai:</span>
            <span className="font-bold text-emerald-300">{resolvedCount}</span>
          </div>
        </div>
      </div>

      {/* Win98 Tab Bar */}
      <div className="flex items-center gap-1 px-2 pt-2 border-b border-[#A4B5C6] bg-[#D4DDE6] shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          className={`px-3 py-1.5 text-[11px] font-bold rounded-t-[3px] border-t-2 border-l-2 border-r-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "list"
              ? "bg-[#E8EEF5] text-[#14253D] border-t-white border-l-white border-r-[#5E7287] -mb-[1px] pb-2 z-10 shadow-xs"
              : "bg-[#CAD6E2] text-gray-700 border-transparent hover:bg-[#DCE5EF]"
          }`}
        >
          <span>📋</span>
          <span>Daftar Masukan ({feedbacks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("form")}
          className={`px-3 py-1.5 text-[11px] font-bold rounded-t-[3px] border-t-2 border-l-2 border-r-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "form"
              ? "bg-[#E8EEF5] text-[#14253D] border-t-white border-l-white border-r-[#5E7287] -mb-[1px] pb-2 z-10 shadow-xs"
              : "bg-[#CAD6E2] text-gray-700 border-transparent hover:bg-[#DCE5EF]"
          }`}
        >
          <span>➕</span>
          <span>Kirim Masukan Baru</span>
        </button>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 min-h-0 bg-[#E8EEF5] p-2 sm:p-3 overflow-y-auto retro-scrollbar">
        {activeTab === "list" ? (
          <div className="space-y-2.5 max-w-4xl mx-auto">
            {/* Filter & Sorting Controls */}
            <div className="p-2 bg-white/70 border border-[#A4B5C6] rounded-[3px] flex flex-wrap items-center justify-between gap-2 shadow-2xs">
              {/* Category Filter */}
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1 mr-1">
                  <Filter className="size-3" /> Filter:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded-[2px] border ${
                    selectedCategory === "all"
                      ? "bg-[#1E4E8C] text-white border-[#102A45] font-bold"
                      : "bg-white text-gray-700 hover:bg-gray-100 border-[#A4B5C6]"
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory("feature")}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded-[2px] border ${
                    selectedCategory === "feature"
                      ? "bg-amber-600 text-white border-amber-800 font-bold"
                      : "bg-white text-gray-700 hover:bg-gray-100 border-[#A4B5C6]"
                  }`}
                >
                  💡 Ide
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory("bug")}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded-[2px] border ${
                    selectedCategory === "bug"
                      ? "bg-rose-600 text-white border-rose-800 font-bold"
                      : "bg-white text-gray-700 hover:bg-gray-100 border-[#A4B5C6]"
                  }`}
                >
                  🐛 Bug
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory("suggestion")}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded-[2px] border ${
                    selectedCategory === "suggestion"
                      ? "bg-blue-600 text-white border-blue-800 font-bold"
                      : "bg-white text-gray-700 hover:bg-gray-100 border-[#A4B5C6]"
                  }`}
                >
                  💬 Saran
                </button>
              </div>

              {/* Sort & Status Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-white border border-[#A4B5C6] px-1.5 py-0.5 text-[10px] rounded-[2px] font-mono text-gray-700"
                >
                  <option value="all">Semua Status</option>
                  <option value="new">Baru</option>
                  <option value="in_review">Ditinjau</option>
                  <option value="in_progress">Diproses</option>
                  <option value="resolved">Selesai</option>
                  <option value="closed">Ditutup</option>
                </select>

                <div className="flex items-center border border-[#A4B5C6] rounded-[2px] overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => setSortBy("top")}
                    className={`px-2 py-0.5 text-[10px] font-mono font-medium transition-colors ${
                      sortBy === "top" ? "bg-[#1E4E8C] text-white" : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Terpopuler
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy("newest")}
                    className={`px-2 py-0.5 text-[10px] font-mono font-medium transition-colors ${
                      sortBy === "newest" ? "bg-[#1E4E8C] text-white" : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Terbaru
                  </button>
                </div>

                <RetroActionButton
                  action="refresh"
                  size="xs"
                  visual="icon"
                  isLoading={isLoading}
                  onClick={() => loadFeedbacks()}
                  tooltip="Muat ulang daftar masukan"
                />
              </div>
            </div>

            {/* Empty State */}
            {!isLoading && feedbacks.length === 0 && (
              <div className="p-8 text-center bg-white/60 border border-[#A4B5C6] rounded-[3px] space-y-2">
                <div className="text-3xl">📭</div>
                <div className="font-bold text-xs text-gray-700">Belum ada feedback yang sesuai.</div>
                <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                  Jadilah yang pertama mengirim ide fitur, lapor bug, atau saran untuk tim IT!
                </p>
                <div className="pt-2">
                  <RetroActionButton
                    action="add"
                    label="Tulis Masukan Pertama"
                    onClick={() => setActiveTab("form")}
                    size="sm"
                  />
                </div>
              </div>
            )}

            {/* List of Feedback Cards */}
            <div className="space-y-2">
              {feedbacks.map((item) => {
                const categoryConfig = CATEGORY_MAP[item.category] || CATEGORY_MAP.suggestion
                const urgencyConfig = URGENCY_MAP[item.urgency] || URGENCY_MAP.normal
                const statusConfig = STATUS_MAP[item.status] || STATUS_MAP.new
                const isAuthor = Boolean(user && user.id === item.createdById)
                const canManage = Boolean(isAdmin || isAuthor)

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-white border border-[#A4B5C6] rounded-[3px] shadow-[1px_1px_0px_#A4B5C6] space-y-2 hover:border-[#7D8E9E] transition-all"
                  >
                    {/* Card Header: Category, Urgency, Status & Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1 border-b border-gray-100">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Category Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-bold border rounded-[2px] ${categoryConfig.badgeClass}`}
                        >
                          {categoryConfig.icon}
                          <span>{categoryConfig.label}</span>
                        </span>

                        {/* Urgency Badge */}
                        <span
                          className={`px-1.5 py-0.5 text-[9px] font-mono border rounded-[2px] ${urgencyConfig.badgeClass}`}
                        >
                          {urgencyConfig.label}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono border rounded-[2px] ${statusConfig.badgeClass}`}
                        >
                          {statusConfig.icon}
                          <span>{statusConfig.label}</span>
                        </span>
                      </div>

                      {/* Author / Date & Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                          {item.isAnonymous ? (
                            <span className="flex items-center gap-1 text-gray-600 italic bg-gray-100 px-1 rounded border border-gray-200">
                              <EyeOff className="size-2.5" /> Anonim
                            </span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <UserAvatar src={item.createdByAvatar} name={item.createdByName} size="size-4" textClass="text-[8px]" />
                              <span className="font-medium text-gray-700">{item.createdByName}</span>
                            </div>
                          )}
                          <span className="text-gray-300">•</span>
                          <span className="font-mono text-[9px]">
                            {new Date(item.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>

                        {/* Admin Change Status Button */}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingFeedback(item)
                              setAdminStatus(item.status)
                              setAdminNote(item.adminNote || "")
                            }}
                            className="px-1.5 py-0.5 text-[9px] font-mono font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-300 rounded cursor-pointer transition-colors"
                            title="Tanggapi / Ubah Status (Admin)"
                          >
                            Tanggapi
                          </button>
                        )}

                        {/* Delete Button (Author or Admin) */}
                        {canManage && (
                          <RetroActionButton
                            action="delete"
                            size="xs"
                            visual="icon"
                            onClick={() => setDeletingId(item.id)}
                            tooltip="Hapus masukan"
                          />
                        )}
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-1">
                      <h2 className="font-bold text-[12px] sm:text-xs text-[#14253D] leading-snug">
                        {item.title}
                      </h2>
                      <p className="text-[11px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {item.description}
                      </p>
                    </div>

                    {/* Admin Note if present */}
                    {item.adminNote && (
                      <div className="p-2 bg-[#F0F7FF] border border-[#BCE0FD] rounded-[2px] text-[10px] space-y-0.5">
                        <div className="font-bold text-[#0D47A1] flex items-center gap-1">
                          <ShieldCheck className="size-3" /> Tanggapan Admin IT:
                        </div>
                        <p className="text-gray-800 leading-normal pl-4 border-l-2 border-[#1E4E8C]">
                          {item.adminNote}
                        </p>
                      </div>
                    )}

                    {/* Footer / Upvote Action Bar */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => handleToggleUpvote(item)}
                        disabled={isGuest}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] font-mono text-[11px] transition-all cursor-pointer ${
                          item.hasUpvoted
                            ? "bg-[#1E4E8C] text-white border-2 border-t-black border-l-black border-r-white border-b-white font-bold shadow-inner"
                            : "bg-[#D4DDE6] text-[#14253D] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] hover:bg-[#E2EAF1] active:translate-y-px"
                        } ${isGuest ? "opacity-60 cursor-not-allowed" : ""}`}
                        title={
                          isGuest
                            ? "Mode Tamu: Tidak dapat upvote"
                            : item.hasUpvoted
                            ? "Batalkan upvote Anda"
                            : "Dukung ide/masukan ini"
                        }
                      >
                        <ThumbsUp className={`size-3 ${item.hasUpvoted ? "fill-white" : ""}`} />
                        <span>Dukung</span>
                        <span
                          className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                            item.hasUpvoted ? "bg-white/20 text-white" : "bg-white text-[#1E4E8C] border border-[#A4B5C6]"
                          }`}
                        >
                          {item.upvoteCount}
                        </span>
                      </button>

                      {item.hasUpvoted && (
                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                          <Check className="size-3" /> Anda mendukung ini
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* Form Tab: Kirim Masukan Baru */
          <div className="max-w-xl mx-auto p-4 bg-white border border-[#A4B5C6] rounded-[3px] shadow-[2px_2px_0px_#A4B5C6] space-y-4">
            <div className="border-b border-[#A4B5C6] pb-2">
              <h2 className="font-bold text-xs sm:text-sm text-[#14253D] flex items-center gap-1.5 font-mono">
                <span>📝</span> FORMULIR MASUKAN & KELUHAN IT
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Punya ide fitur baru, kendala error/bug, atau saran perbaikan fasilitas? Sampaikan langsung di sini.
              </p>
            </div>

            {/* Guest Warning */}
            {isGuest && (
              <div className="p-2 bg-amber-50 border border-amber-300 rounded text-[11px] text-amber-900 flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Akses Terbatas:</strong> Anda saat ini login sebagai Tamu (Read-Only). Masuk dengan akun Google untuk mengirimkan masukan.
                </span>
              </div>
            )}

            {/* Notification alert */}
            {formMessage && (
              <div
                className={`p-2 rounded text-[11px] flex items-center gap-1.5 border ${
                  formMessage.isError
                    ? "bg-rose-50 border-rose-300 text-rose-800"
                    : "bg-emerald-50 border-emerald-300 text-emerald-800"
                }`}
              >
                <span>{formMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Category Selector */}
              <div className="space-y-1">
                <label className="font-bold text-[11px] text-gray-700 block">
                  Kategori Masukan: <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormCategory("feature")}
                    className={`p-2 rounded-[2px] border text-left flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      formCategory === "feature"
                        ? "bg-amber-50 border-amber-500 text-amber-950 font-bold ring-1 ring-amber-400"
                        : "bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-700"
                    }`}
                  >
                    <Lightbulb className="size-4 text-amber-600" />
                    <span className="text-[10px]">Ide Fitur</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormCategory("bug")}
                    className={`p-2 rounded-[2px] border text-left flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      formCategory === "bug"
                        ? "bg-rose-50 border-rose-500 text-rose-950 font-bold ring-1 ring-rose-400"
                        : "bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-700"
                    }`}
                  >
                    <Bug className="size-4 text-rose-600" />
                    <span className="text-[10px]">Lapor Bug</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormCategory("suggestion")}
                    className={`p-2 rounded-[2px] border text-left flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      formCategory === "suggestion"
                        ? "bg-blue-50 border-blue-500 text-blue-950 font-bold ring-1 ring-blue-400"
                        : "bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-700"
                    }`}
                  >
                    <MessageSquare className="size-4 text-blue-600" />
                    <span className="text-[10px]">Saran Tim</span>
                  </button>
                </div>
              </div>

              {/* Urgency Level */}
              <div className="space-y-1">
                <label className="font-bold text-[11px] text-gray-700 block">
                  Tingkat Urgensi:
                </label>
                <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
                  <button
                    type="button"
                    onClick={() => setFormUrgency("low")}
                    className={`py-1 px-2 border rounded-[2px] text-center cursor-pointer transition-colors ${
                      formUrgency === "low"
                        ? "bg-[#1E4E8C] text-white font-bold border-[#102A45]"
                        : "bg-white text-gray-700 hover:bg-gray-100 border-[#A4B5C6]"
                    }`}
                  >
                    Santai
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormUrgency("normal")}
                    className={`py-1 px-2 border rounded-[2px] text-center cursor-pointer transition-colors ${
                      formUrgency === "normal"
                        ? "bg-[#1E4E8C] text-white font-bold border-[#102A45]"
                        : "bg-white text-gray-700 hover:bg-gray-100 border-[#A4B5C6]"
                    }`}
                  >
                    Penting
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormUrgency("urgent")}
                    className={`py-1 px-2 border rounded-[2px] text-center cursor-pointer transition-colors ${
                      formUrgency === "urgent"
                        ? "bg-red-700 text-white font-bold border-red-900"
                        : "bg-white text-gray-700 hover:bg-gray-100 border-[#A4B5C6]"
                    }`}
                  >
                    Darurat (Bug Parah)
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="font-bold text-[11px] text-gray-700 block">
                  Judul Ringkas: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Tambahin filter status di tabel Kas, atau Tombol Vote kadang glitch"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  maxLength={120}
                  className="w-full bg-white border border-[#A4B5C6] p-2 text-xs rounded-[2px] focus:outline-hidden focus:border-[#1E4E8C] shadow-inner"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-bold text-[11px] text-gray-700 block">
                  Rincian Masukan / Kronologi Masalah: <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Jelaskan detail ide fitur atau kronologi error yang dialami..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  maxLength={1000}
                  className="w-full bg-white border border-[#A4B5C6] p-2 text-xs rounded-[2px] focus:outline-hidden focus:border-[#1E4E8C] shadow-inner font-sans leading-normal"
                />
                <div className="text-right text-[10px] text-gray-400 font-mono">
                  {formDesc.length}/1000 karakter
                </div>
              </div>

              {/* Anonymous Checkbox */}
              <div className="p-2.5 bg-[#F4F7FA] border border-[#CAD6E2] rounded-[2px] flex items-center justify-between gap-3 cursor-pointer">
                <label
                  htmlFor="anonymous-toggle"
                  className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-gray-800"
                >
                  <input
                    id="anonymous-toggle"
                    type="checkbox"
                    checked={formAnonymous}
                    onChange={(e) => setFormAnonymous(e.target.checked)}
                    className="size-4 accent-[#1E4E8C] rounded-[2px] cursor-pointer"
                  />
                  <div>
                    <span className="font-bold">Kirim secara Anonim</span>
                    <p className="text-[10px] text-gray-500">
                      Nama dan foto profil Anda akan disembunyikan dari semua pengguna.
                    </p>
                  </div>
                </label>
                <span className="text-lg">{formAnonymous ? "🥷" : "👤"}</span>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveTab("list")}
                  className="px-3 py-1.5 border border-[#A4B5C6] bg-white hover:bg-gray-100 text-gray-700 rounded-[2px] font-bold text-[11px] cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || isGuest}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#1E4E8C] hover:bg-[#153A6B] text-white font-bold text-[11px] rounded-[2px] border-2 border-t-white border-l-white border-r-[#102A45] border-b-[#102A45] shadow-xs active:translate-y-px cursor-pointer ${
                    isSubmitting || isGuest ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <Send className="size-3.5" />
                  <span>{isSubmitting ? "Mengirim..." : "Kirim Feedback"}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Admin Status & Notes Modal */}
      {editingFeedback && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-3 select-none">
          <div className="retro-window-frame max-w-md w-full rounded-[3px] overflow-hidden bg-[#D4DDE6] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-xl flex flex-col">
            {/* Titlebar */}
            <div className="p-1.5 bg-[#1E4E8C] text-white flex items-center justify-between">
              <span className="font-bold text-xs font-mono flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-amber-300" /> TANGGAPAN_ADMIN.EXE
              </span>
              <button
                type="button"
                onClick={() => setEditingFeedback(null)}
                className="size-5 bg-[#C53030] hover:bg-red-700 text-white font-bold flex items-center justify-center rounded-[2px] text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3 bg-white space-y-3">
              <div>
                <div className="text-[10px] text-gray-500 font-mono uppercase">Judul Feedback:</div>
                <div className="font-bold text-xs text-[#14253D]">{editingFeedback.title}</div>
              </div>

              {/* Status Selector */}
              <div className="space-y-1">
                <label className="font-bold text-[11px] text-gray-700 block">
                  Ubah Status Pengerjaan:
                </label>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                  {(["new", "in_review", "in_progress", "resolved", "closed"] as FeedbackStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setAdminStatus(st)}
                        className={`py-1 px-2 border rounded-[2px] text-left flex items-center gap-1.5 cursor-pointer transition-colors ${
                          adminStatus === st
                            ? "bg-[#1E4E8C] text-white font-bold border-[#102A45]"
                            : "bg-white text-gray-700 hover:bg-gray-100 border-[#A4B5C6]"
                        }`}
                      >
                        {STATUS_MAP[st].icon}
                        <span>{STATUS_MAP[st].label}</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Admin Note textarea */}
              <div className="space-y-1">
                <label className="font-bold text-[11px] text-gray-700 block">
                  Catatan / Balasan Admin (Ditampilkan ke tim):
                </label>
                <textarea
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Contoh: Sudah diperbaiki di update terbaru v2.3.22, terima kasih laporannya!"
                  className="w-full bg-white border border-[#A4B5C6] p-2 text-xs rounded-[2px] focus:outline-hidden focus:border-[#1E4E8C] shadow-inner font-sans"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingFeedback(null)}
                  className="px-3 py-1 border border-[#A4B5C6] bg-white hover:bg-gray-100 text-gray-700 rounded-[2px] font-bold text-[11px] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveAdminStatus}
                  disabled={isAdminUpdating}
                  className="px-3 py-1 bg-[#1E4E8C] hover:bg-[#153A6B] text-white rounded-[2px] font-bold text-[11px] border border-[#102A45] cursor-pointer"
                >
                  {isAdminUpdating ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="HAPUS_FEEDBACK.EXE"
        message="Apakah Anda yakin ingin menghapus masukan ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus Masukan"
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  )
}
