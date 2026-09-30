"use client"

import * as React from "react"
import { Trophy, X, Flame, Award, Medal, Crown, Target, Crosshair, Skull } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { RetroActionButton } from "@/components/ui/retro-action-button"
import {
  fetchDoodleLeaderboardAction,
  type DoodleLeaderboardEntry,
} from "@/app/actions/doodle"
import { playRetroNotificationSound } from "@/lib/sound-effects"
import { cn } from "@/lib/utils"

interface DoodleLeaderboardProps {
  onClose: () => void
}

export function DoodleLeaderboard({ onClose }: DoodleLeaderboardProps) {
  const { user, isGuest } = useAuth()
  const [entries, setEntries] = React.useState<DoodleLeaderboardEntry[]>([])
  const [myStats, setMyStats] = React.useState<DoodleLeaderboardEntry | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  // Local storage fallback data
  const localBestScore = React.useMemo(() => {
    if (typeof window === "undefined") return 0
    return Number(localStorage.getItem("doodle_best") || 0)
  }, [])
  const localCheckpoint = React.useMemo(() => {
    if (typeof window === "undefined") return 1
    return Number(localStorage.getItem("doodle_checkpoint") || 1)
  }, [])

  const loadLeaderboard = React.useCallback(async (showNotification = false) => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const token =
        (await supabase?.auth.getSession())?.data.session?.access_token ?? null
      const result = await fetchDoodleLeaderboardAction(token)
      if (result.error) {
        setErrorMsg(result.error)
      } else {
        setEntries(result.entries)
        if (result.myStats) setMyStats(result.myStats)
        if (showNotification) playRetroNotificationSound(0.1)
      }
    } catch {
      setErrorMsg("Gagal menghubungi server klasemen.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadLeaderboard(false)

    // Realtime subscription ke tabel doodle_leaderboard
    const client = supabase
    if (client) {
      const channel = client
        .channel("doodle-leaderboard-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "doodle_leaderboard",
          },
          () => {
            void loadLeaderboard(false)
          }
        )
        .subscribe()

      return () => {
        client.removeChannel(channel)
      }
    }
  }, [loadLeaderboard])

  const myRank = myStats
    ? entries.findIndex((e) => e.userId === myStats.userId) + 1
    : null

  const topThree = entries.slice(0, 3)

  return (
    <div className="fixed inset-0 z-[999] bg-black/65 flex items-center justify-center p-3 animate-in fade-in select-none">
      <div className="retro-window-frame max-w-2xl w-full bg-[#ECE9D8] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-black font-sans">
        {/* Window Title Bar */}
        <div className="bg-[#000080] text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs select-none shadow">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-300 fill-yellow-300" />
            <span className="tracking-wide">KLASEMEN_DOODLE_SOLO.EXE — WAVE SURVIVAL</span>
          </div>
          <div className="flex items-center gap-1">
            <RetroActionButton
              action="refresh"
              visual="icon"
              tooltip="Segarkan Data Klasemen"
              isLoading={isLoading}
              onClick={() => loadLeaderboard(true)}
              className="w-5 h-5 bg-[#C0C0C0] text-black"
            />
            <button
              type="button"
              onClick={onClose}
              className="w-5 h-5 bg-[#C0C0C0] border border-t-white border-l-white border-r-black border-b-black flex items-center justify-center text-black font-bold active:border-t-black active:border-l-black active:border-r-white active:border-b-white"
              title="Tutup (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3 overflow-y-auto flex-1 flex flex-col gap-3">
          {/* Top Info Banner */}
          <div className="bg-amber-100/80 border border-amber-300 p-2.5 rounded text-xs flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <div>
                <b className="text-amber-900 block font-bold text-sm">Papan Peringkat Solo Wave Survival</b>
                <span className="text-amber-800 text-[11px]">
                  Bertahan dari gelombang musuh gambar, capai wave tertinggi & raih skor legendaris!
                </span>
              </div>
            </div>
            {localBestScore > 0 && (
              <div className="text-right pl-2 border-l border-amber-300/80 hidden sm:block">
                <span className="text-[10px] text-amber-700 block uppercase font-bold">Rekor Lokal Kamu</span>
                <b className="text-xs text-amber-950 font-bold">Skor: {localBestScore.toLocaleString("id-ID")}</b>
                {localCheckpoint > 1 && (
                  <span className="text-[10px] text-red-600 block font-bold">Wave {localCheckpoint}+</span>
                )}
              </div>
            )}
          </div>

          {/* Database Notice if Table not migrated yet */}
          {errorMsg && (
            <div className="bg-blue-50 border border-blue-200 p-2 text-xs text-blue-900 rounded flex items-center gap-2">
              <span className="text-base">ℹ️</span>
              <div className="flex-1">
                <b>Status Online:</b> {errorMsg} Rekor sesi solo kamu tetap tersimpan secara lokal di perangkat ini.
              </div>
            </div>
          )}

          {/* Top 3 Podium (If data available) */}
          {topThree.length > 0 && (
            <div className="grid grid-cols-3 gap-2 py-1 items-end">
              {/* Rank 2 (Silver) */}
              {topThree[1] ? (
                <div className="bg-gradient-to-t from-slate-200 to-slate-100 border-2 border-slate-400 p-2 rounded flex flex-col items-center text-center shadow-sm relative h-[140px] justify-between">
                  <div className="absolute -top-3 bg-slate-300 border border-slate-500 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs text-slate-800 shadow">
                    🥈
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-300 border-2 border-slate-400 flex items-center justify-center font-bold text-slate-700 text-sm overflow-hidden mt-1">
                    {topThree[1].userAvatar ? (
                      <img src={topThree[1].userAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      topThree[1].userName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="w-full">
                    <b className="text-xs font-bold truncate block text-slate-900" title={topThree[1].userName}>
                      {topThree[1].userName}
                    </b>
                    <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded inline-block mt-0.5">
                      WAVE {topThree[1].highestWave}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-700 font-bold">
                    {topThree[1].highestScore.toLocaleString("id-ID")} pts
                  </div>
                </div>
              ) : <div />}

              {/* Rank 1 (Gold - Master) */}
              {topThree[0] ? (
                <div className="bg-gradient-to-t from-amber-200 to-amber-100 border-2 border-amber-500 p-2.5 rounded flex flex-col items-center text-center shadow-md relative h-[162px] justify-between">
                  <div className="absolute -top-3.5 bg-yellow-400 border border-amber-600 rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm shadow">
                    👑
                  </div>
                  <div className="w-12 h-12 rounded-full bg-yellow-300 border-2 border-amber-500 flex items-center justify-center font-bold text-amber-900 text-base overflow-hidden mt-1 shadow-inner">
                    {topThree[0].userAvatar ? (
                      <img src={topThree[0].userAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      topThree[0].userName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="w-full">
                    <b className="text-xs font-black truncate block text-amber-950" title={topThree[0].userName}>
                      {topThree[0].userName}
                    </b>
                    <span className="bg-red-600 text-yellow-200 text-[11px] font-black px-2 py-0.5 rounded shadow inline-block mt-0.5">
                      WAVE {topThree[0].highestWave}
                    </span>
                  </div>
                  <div className="text-xs text-amber-900 font-black">
                    {topThree[0].highestScore.toLocaleString("id-ID")} pts
                  </div>
                </div>
              ) : <div />}

              {/* Rank 3 (Bronze) */}
              {topThree[2] ? (
                <div className="bg-gradient-to-t from-orange-200 to-orange-100 border-2 border-orange-400 p-2 rounded flex flex-col items-center text-center shadow-sm relative h-[130px] justify-between">
                  <div className="absolute -top-3 bg-orange-300 border border-orange-500 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs text-orange-900 shadow">
                    🥉
                  </div>
                  <div className="w-9 h-9 rounded-full bg-orange-300 border-2 border-orange-400 flex items-center justify-center font-bold text-orange-800 text-xs overflow-hidden mt-1">
                    {topThree[2].userAvatar ? (
                      <img src={topThree[2].userAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      topThree[2].userName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="w-full">
                    <b className="text-xs font-bold truncate block text-orange-950" title={topThree[2].userName}>
                      {topThree[2].userName}
                    </b>
                    <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded inline-block mt-0.5">
                      WAVE {topThree[2].highestWave}
                    </span>
                  </div>
                  <div className="text-[11px] text-orange-900 font-bold">
                    {topThree[2].highestScore.toLocaleString("id-ID")} pts
                  </div>
                </div>
              ) : <div />}
            </div>
          )}

          {/* Ranking Table */}
          <div className="border-2 border-[#808080] border-r-white border-b-white bg-white overflow-hidden flex flex-col">
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#ECE9D8] border-b border-[#808080] sticky top-0 z-10 font-bold">
                  <tr>
                    <th className="p-1.5 text-center w-8">#</th>
                    <th className="p-1.5">Doodler</th>
                    <th className="p-1.5 text-center">Wave Max</th>
                    <th className="p-1.5 text-right">Skor Max</th>
                    <th className="p-1.5 text-center">Kills</th>
                    <th className="p-1.5 text-center">Headshots</th>
                    <th className="p-1.5 text-center">Match</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-gray-500">
                        {isLoading ? "Memuat data klasemen..." : "Belum ada catatan skor solo. Jadilah yang pertama!"}
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry, idx) => {
                      const isMe = myStats?.userId === entry.userId
                      const rank = idx + 1
                      return (
                        <tr
                          key={entry.userId}
                          className={cn(
                            "hover:bg-blue-50/70 transition-colors",
                            isMe && "bg-blue-100/80 font-bold"
                          )}
                        >
                          <td className="p-1.5 text-center font-bold">
                            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
                          </td>
                          <td className="p-1.5 font-medium flex items-center gap-1.5 truncate max-w-[150px]">
                            {entry.userAvatar ? (
                              <img src={entry.userAvatar} alt="" className="w-4 h-4 rounded-full flex-shrink-0" />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-blue-200 text-[10px] flex items-center justify-center font-bold flex-shrink-0">
                                {entry.userName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="truncate">{entry.userName}</span>
                            {isMe && <span className="text-[10px] text-blue-600 font-bold">(Kamu)</span>}
                          </td>
                          <td className="p-1.5 text-center">
                            <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold text-[11px] border border-red-200">
                              WAVE {entry.highestWave}
                            </span>
                          </td>
                          <td className="p-1.5 text-right font-mono font-bold text-blue-900">
                            {entry.highestScore.toLocaleString("id-ID")}
                          </td>
                          <td className="p-1.5 text-center text-gray-700">
                            {entry.totalKills.toLocaleString("id-ID")}
                          </td>
                          <td className="p-1.5 text-center text-red-600 font-semibold">
                            {entry.totalHeadshots.toLocaleString("id-ID")}
                          </td>
                          <td className="p-1.5 text-center text-gray-500">
                            {entry.gamesPlayed}x
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer: User Rank Summary & Close Button */}
        <div className="bg-[#ECE9D8] border-t border-[#808080] p-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {myStats ? (
              <span className="text-gray-800">
                Peringkat Kamu: <b className="text-blue-900">#{myRank || "-"}</b> &nbsp;·&nbsp; Wave Max:{" "}
                <b className="text-red-600">Wave {myStats.highestWave}</b> &nbsp;·&nbsp; Skor:{" "}
                <b>{myStats.highestScore.toLocaleString("id-ID")}</b>
              </span>
            ) : (
              <span className="text-gray-600">
                Mainkan mode <b>Solo Wave</b> untuk mencatatkan namamu di papan klasemen!
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1 bg-[#C0C0C0] border-2 border-t-white border-l-white border-r-black border-b-black font-bold active:border-t-black active:border-l-black active:border-r-white active:border-b-white"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
