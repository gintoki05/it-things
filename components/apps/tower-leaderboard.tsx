"use client"

import * as React from "react"
import { Save, X, Trophy, Check } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { RetroActionButton } from "@/components/ui/retro-action-button"
import { fetchTowerLeaderboardAction, submitTowerScoreAction } from "@/app/actions/tower"
import { playRetroNotificationSound } from "@/lib/sound-effects"
import type { TowerEntry } from "@/lib/tower/leaderboard"
import { cn } from "@/lib/utils"

export function TowerLeaderboard({ score, floors, muted, onClose }: { score: number; floors: number; muted: boolean; onClose: () => void }) {
  const { user, isGuest } = useAuth()
  const [entries, setEntries] = React.useState<TowerEntry[]>([])
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState("")
  const [date, setDate] = React.useState("")
  const [saved, setSaved] = React.useState(false)
  const pending = React.useRef(false)
  const generation = React.useRef(0)
  const allowed = !!user && !isGuest

  const saveScore = React.useCallback(async (targetScore: number, targetFloors: number) => {
    if (!user || !allowed || pending.current || !targetScore) return
    pending.current = true
    setBusy(true)
    const request = generation.current
    setMessage("Menyimpan skor...")
    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token ?? null
      const result = await submitTowerScoreAction(token, targetScore, targetFloors)
      if (request !== generation.current) return
      if (result.error) {
        setMessage(result.error)
      } else {
        setEntries(result.entries)
        setDate(result.date)
        setSaved(true)
        setMessage("Rekor harian berhasil tersimpan ke klasemen!")
        if (!muted) playRetroNotificationSound(0.1)
      }
    } catch {
      if (request === generation.current) setMessage("Skor belum tersimpan. Coba lagi saat koneksi pulih.")
    } finally {
      pending.current = false
      if (request === generation.current) setBusy(false)
    }
  }, [allowed, muted, user])

  const load = React.useCallback(async () => {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    const request = generation.current
    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token
      const result = await fetchTowerLeaderboardAction(token)
      if (request !== generation.current) return
      setEntries(result.entries)
      setDate(result.date)
      setMessage(result.error ?? "")

      // Check if user's current device score should be auto-synced
      const existing = result.entries.find(entry => entry.userId === user?.id)
      if (existing && existing.score >= score) {
        setSaved(true)
      } else if (token && score > 0 && floors > 0 && (!existing || score > existing.score)) {
        // Automatically submit user's score to daily leaderboard
        const submitResult = await submitTowerScoreAction(token, score, floors)
        if (request === generation.current && !submitResult.error) {
          setEntries(submitResult.entries)
          setDate(submitResult.date)
          setSaved(true)
          setMessage("Rekor skor kamu otomatis tersimpan ke klasemen!")
          if (!muted) playRetroNotificationSound(0.1)
        }
      }
    } catch {
      if (request === generation.current) setMessage("Koneksi terputus. Coba segarkan klasemen.")
    } finally {
      pending.current = false
      if (request === generation.current) setBusy(false)
    }
  }, [floors, muted, score, user?.id])

  React.useEffect(() => {
    const epoch = generation.current
    const timer = setTimeout(() => { if (allowed) void load() }, 0)
    return () => { clearTimeout(timer); generation.current = epoch + 1 }
  }, [allowed, load])

  const myEntry = entries.find(entry => entry.userId === user?.id)
  const myRank = myEntry ? entries.findIndex(entry => entry.userId === user?.id) + 1 : null

  return (
    <section aria-label="Klasemen Tower harian" className="absolute inset-0 z-10 flex flex-col bg-[#ece9d8] p-3 font-mono text-xs select-none">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#808080] pb-2">
        <div className="flex items-center gap-1.5 font-bold text-[#000080]">
          <Trophy className="w-4 h-4 text-amber-600" />
          <span>KLASEMEN HARI INI</span>
        </div>
        <RetroActionButton action="custom" icon={X} aria-label="Tutup klasemen" tooltip="Kembali ke game" onClick={onClose} className="min-h-8 min-w-8" />
      </div>

      <div className="flex items-center justify-between py-1.5 text-[10px] text-[#475569] border-b border-gray-300">
        <span>Tanggal: {date || "Hari ini"}</span>
        <span>Reset: 00.00 WIB</span>
      </div>

      {!allowed ? (
        <div className="py-6 px-2 text-center space-y-2">
          <p className="font-bold text-gray-800">Login Diperlukan</p>
          <p className="text-gray-600 leading-relaxed text-[11px]">
            Kamu login sebagai Tamu atau belum login. Login dengan akun tim IT untuk mencatatkan skormu di klasemen harian.
          </p>
        </div>
      ) : (
        <>
          {/* User Score Summary Card if recorded */}
          {myEntry && (
            <div className="my-2 p-2 bg-[#dbeafe] border border-blue-400 rounded-[2px] text-[11px] text-blue-950 flex items-center justify-between shadow-sm">
              <span className="flex items-center gap-1 font-bold">
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                <span>Peringkatmu: #{myRank}</span>
              </span>
              <span className="font-extrabold text-blue-900">
                {myEntry.score.toLocaleString("id-ID")} Poin ({myEntry.floors} Lt)
              </span>
            </div>
          )}

          {/* Table */}
          <div className="min-h-0 flex-1 overflow-auto my-1 border border-[#808080] bg-white shadow-inner">
            {entries.length ? (
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="bg-[#d4d0c8] border-b border-[#808080] text-gray-800 font-bold sticky top-0">
                    <th className="py-1.5 px-2 w-8">#</th>
                    <th className="py-1.5">Pemain</th>
                    <th className="py-1.5 text-right">Lantai</th>
                    <th className="py-1.5 pr-2 text-right">Skor</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => {
                    const isMe = entry.userId === user?.id
                    return (
                      <tr
                        key={entry.userId}
                        className={cn(
                          "border-b border-gray-200 transition-colors",
                          isMe ? "bg-amber-100/80 font-bold text-blue-950" : "hover:bg-gray-50 text-gray-700"
                        )}
                      >
                        <td className="py-2 px-2 tabular-nums">
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                        </td>
                        <td className="max-w-[120px] truncate" title={entry.name}>
                          {entry.name} {isMe && <span className="text-[10px] text-blue-700">(kamu)</span>}
                        </td>
                        <td className="text-right tabular-nums">{entry.floors}F</td>
                        <td className="pr-2 text-right font-bold tabular-nums text-emerald-800">
                          {entry.score.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-gray-500 text-[11px] space-y-1">
                <p>{busy ? "Memuat klasemen..." : message ? message : "Belum ada skor tercatat hari ini."}</p>
                {!busy && <p className="text-gray-400">Jadilah yang pertama mencatat rekor!</p>}
              </div>
            )}
          </div>

          {message && <p role="status" className="py-1 text-[10px] text-gray-600 leading-tight truncate">{message}</p>}

          <div className="flex shrink-0 items-center justify-between gap-2 pt-2 border-t border-gray-300">
            <RetroActionButton
              action="refresh"
              visual="button"
              label="Segarkan"
              isLoading={busy}
              onClick={() => void load()}
              className="min-h-9"
            />

            {score > 0 && (!myEntry || score > myEntry.score) && (
              <RetroActionButton
                action="add"
                visual="button"
                icon={saved ? Check : Save}
                label={saved ? "Tersimpan" : `Simpan (${score.toLocaleString("id-ID")})`}
                disabled={busy || saved}
                onClick={() => void saveScore(score, floors)}
                className="min-h-9 font-bold"
              />
            )}
          </div>
        </>
      )}
    </section>
  )
}
