"use client"

import * as React from "react"
import { Trophy, X, Flame, Award, Medal, Crown, Target, RefreshCw } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { RetroActionButton } from "@/components/ui/retro-action-button"
import {
  fetchBilliardLeaderboardAction,
  type BilliardLeaderboardEntry,
} from "@/app/actions/billiard"
import { playRetroNotificationSound } from "@/lib/sound-effects"
import { cn } from "@/lib/utils"

interface BilliardLeaderboardProps {
  onClose: () => void
}

export function BilliardLeaderboard({ onClose }: BilliardLeaderboardProps) {
  const { user, isGuest } = useAuth()
  const [entries, setEntries] = React.useState<BilliardLeaderboardEntry[]>([])
  const [myStats, setMyStats] = React.useState<BilliardLeaderboardEntry | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const isUserAuthenticated = Boolean(user && !isGuest)

  const loadLeaderboard = React.useCallback(async (showNotification = false) => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const token =
        (await supabase?.auth.getSession())?.data.session?.access_token ?? null
      const result = await fetchBilliardLeaderboardAction(token)
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

    // Realtime subscription ke tabel billiard_leaderboard
    const client = supabase
    if (client) {
      const channel = client
        .channel("billiard-leaderboard-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "billiard_leaderboard",
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
            <span className="tracking-wide">KLASEMEN_JUARA_POOL98.EXE — 8-BALL POOL</span>
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
              onClick={onClose}
              className="w-5 h-5 bg-[#C0C0C0] text-black font-mono font-bold flex items-center justify-center border-t border-l border-white border-r border-b border-[#808080] hover:bg-red-600 hover:text-white active:translate-y-px"
              title="Tutup Klasemen"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Sub-header Banner */}
        <div className="bg-[#D4D0C8] px-4 py-2 border-b border-[#808080] flex items-center justify-between">
          <div>
            <h3 className="font-black text-xs text-[#000080] tracking-wide flex items-center gap-1.5">
              <span>PAPAN KLASEMEN 8-BALL TIM IT</span>
              <span className="text-[10px] font-normal text-gray-600 font-mono">
                ({entries.length} Pemain Tercatat)
              </span>
            </h3>
            <p className="text-[11px] text-gray-600">
              Peringkat pemain dihitung dari jumlah kemenangan & rating poin turnamen
            </p>
          </div>
          <div className="text-right font-mono text-[10px] text-gray-500">
            Auto-Sync Realtime
          </div>
        </div>

        {/* Body Container */}
        <div className="p-3 overflow-y-auto flex-1 space-y-3 retro-scrollbar">
          {/* Top 3 Podium (Jika sudah ada minimal 1 data) */}
          {topThree.length > 0 && (
            <div className="grid grid-cols-3 gap-2 bg-gradient-to-b from-[#1b2434] to-[#0f1520] p-3 rounded border border-[#3E5270] shadow-inner text-white">
              {/* Rank 2 (Perak) */}
              <div className="flex flex-col items-center justify-end text-center p-2 rounded bg-white/5 border border-gray-400/20 order-1">
                {topThree[1] ? (
                  <>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 text-gray-900 font-black flex items-center justify-center text-xs shadow mb-1 border border-white">
                      🥈
                    </div>
                    <span className="font-bold text-xs truncate max-w-full text-gray-200">
                      {topThree[1].userName}
                    </span>
                    <span className="text-[10px] text-yellow-400 font-mono font-bold mt-0.5">
                      {topThree[1].wins} Menang
                    </span>
                    <span className="text-[9px] text-gray-400 font-mono">
                      WR {topThree[1].winRate}% • 🔥 {topThree[1].winStreak}
                    </span>
                  </>
                ) : (
                  <div className="text-[10px] text-gray-500 italic">Posisi Kosong</div>
                )}
              </div>

              {/* Rank 1 (Emas - Center) */}
              <div className="flex flex-col items-center justify-end text-center p-2.5 rounded bg-yellow-500/10 border-2 border-yellow-400/60 order-2 shadow-lg scale-105">
                <Crown className="w-4 h-4 text-yellow-400 mb-0.5 animate-bounce" />
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 text-black font-black flex items-center justify-center text-sm shadow-md mb-1 border border-white">
                  🥇
                </div>
                <span className="font-black text-xs truncate max-w-full text-yellow-300">
                  {topThree[0].userName}
                </span>
                <span className="text-[11px] text-yellow-400 font-mono font-black mt-0.5">
                  {topThree[0].wins} Menang
                </span>
                <span className="text-[9px] text-amber-200 font-mono">
                  WR {topThree[0].winRate}% • 🔥 {topThree[0].winStreak}
                </span>
              </div>

              {/* Rank 3 (Perunggu) */}
              <div className="flex flex-col items-center justify-end text-center p-2 rounded bg-white/5 border border-amber-700/20 order-3">
                {topThree[2] ? (
                  <>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-white font-black flex items-center justify-center text-xs shadow mb-1 border border-white">
                      🥉
                    </div>
                    <span className="font-bold text-xs truncate max-w-full text-amber-200">
                      {topThree[2].userName}
                    </span>
                    <span className="text-[10px] text-yellow-400 font-mono font-bold mt-0.5">
                      {topThree[2].wins} Menang
                    </span>
                    <span className="text-[9px] text-gray-400 font-mono">
                      WR {topThree[2].winRate}% • 🔥 {topThree[2].winStreak}
                    </span>
                  </>
                ) : (
                  <div className="text-[10px] text-gray-500 italic">Posisi Kosong</div>
                )}
              </div>
            </div>
          )}

          {/* User's Personal Stats Banner */}
          <div className="p-2.5 bg-white border-2 border-[#808080] shadow flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded bg-[#000080] text-white font-black flex items-center justify-center text-sm shadow shrink-0">
                {myRank ? `#${myRank}` : "—"}
              </div>
              <div className="min-w-0">
                <div className="font-black text-xs text-[#000080] truncate flex items-center gap-1.5">
                  <span>{isUserAuthenticated ? (myStats?.userName || user?.email) : "Tamu / Offline"}</span>
                  {isUserAuthenticated && (
                    <span className="text-[9px] bg-blue-100 text-blue-800 px-1 rounded font-mono font-normal">
                      Akun Tim
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-600 font-mono">
                  {myStats ? (
                    <span>
                      {myStats.wins} Menang • {myStats.losses} Kalah • WR {myStats.winRate}% • Rating {myStats.ratingPoints}
                    </span>
                  ) : isUserAuthenticated ? (
                    <span>Belum ada rekor tanding. Mainkan game biliar untuk masuk klasemen!</span>
                  ) : (
                    <span>Login dengan akun tim untuk mencatat statistikmu secara permanen.</span>
                  )}
                </div>
              </div>
            </div>

            {myStats && myStats.winStreak > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-300 rounded font-mono font-bold text-xs text-amber-800 shrink-0">
                <Flame className="w-3.5 h-3.5 text-orange-600 fill-orange-500 animate-pulse" />
                <span>Streak {myStats.winStreak}x</span>
              </div>
            )}
          </div>

          {/* Tabel Klasemen Lengkap */}
          <div className="border-2 border-[#808080] bg-white shadow overflow-hidden">
            <div className="max-h-64 overflow-y-auto overflow-x-auto retro-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#D4D0C8] border-b-2 border-[#808080] text-gray-700 font-bold sticky top-0 z-10 select-none text-[11px]">
                  <tr>
                    <th className="py-1.5 px-2.5 text-center w-12">#</th>
                    <th className="py-1.5 px-3">Pemain</th>
                    <th className="py-1.5 px-2.5 text-center">Menang</th>
                    <th className="py-1.5 px-2.5 text-center">Main</th>
                    <th className="py-1.5 px-2.5 text-center">Win Rate</th>
                    <th className="py-1.5 px-2.5 text-center">Bola Masuk</th>
                    <th className="py-1.5 px-2.5 text-center">Streak</th>
                    <th className="py-1.5 px-3 text-right">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-mono text-[11px]">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500 font-sans text-xs">
                        {isLoading ? (
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-[#000080]" />
                            <span>Memuat data klasemen...</span>
                          </div>
                        ) : errorMsg ? (
                          <span className="text-red-600">{errorMsg}</span>
                        ) : (
                          "Belum ada data klasemen. Jadilah juara pertama dengan memenangkan pertandingan!"
                        )}
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry, idx) => {
                      const rank = idx + 1
                      const isMe = entry.userId === user?.id
                      return (
                        <tr
                          key={entry.userId}
                          className={cn(
                            "hover:bg-yellow-50 transition-colors",
                            isMe && "bg-blue-50/80 font-bold text-[#000080]"
                          )}
                        >
                          <td className="py-1.5 px-2.5 text-center font-bold">
                            {rank === 1 ? (
                              <span className="text-amber-500 font-black">🥇 1</span>
                            ) : rank === 2 ? (
                              <span className="text-gray-400 font-black">🥈 2</span>
                            ) : rank === 3 ? (
                              <span className="text-amber-700 font-black">🥉 3</span>
                            ) : (
                              rank
                            )}
                          </td>
                          <td className="py-1.5 px-3 font-sans flex items-center gap-1.5">
                            <span className="font-bold truncate max-w-[140px]">
                              {entry.userName}
                            </span>
                            {isMe && (
                              <span className="px-1 py-0.2 rounded bg-[#000080] text-white text-[8px] uppercase tracking-wider shrink-0 font-mono">
                                Kamu
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-2.5 text-center font-bold text-green-700">
                            {entry.wins}
                          </td>
                          <td className="py-1.5 px-2.5 text-center text-gray-600">
                            {entry.matchesPlayed}
                          </td>
                          <td className="py-1.5 px-2.5 text-center font-bold">
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[10px]",
                                entry.winRate >= 60
                                  ? "bg-green-100 text-green-800"
                                  : entry.winRate >= 40
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-700"
                              )}
                            >
                              {entry.winRate}%
                            </span>
                          </td>
                          <td className="py-1.5 px-2.5 text-center text-gray-700">
                            {entry.ballsPocketed}
                          </td>
                          <td className="py-1.5 px-2.5 text-center">
                            {entry.winStreak > 0 ? (
                              <span className="text-orange-600 font-bold flex items-center justify-center gap-0.5">
                                <Flame className="w-3 h-3 fill-current" />
                                <span>{entry.winStreak}</span>
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 text-right font-black text-amber-700">
                            ⭐ {entry.ratingPoints}
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

        {/* Footer Bar */}
        <div className="p-2.5 bg-[#D4D0C8] border-t border-[#808080] flex items-center justify-between">
          <div className="text-[10px] text-gray-600 font-mono">
            Poin dihitung: +25 saat menang • -15 saat kalah
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1 bg-[#C0C0C0] text-black font-bold rounded-[2px] border-2 border-white shadow hover:bg-gray-300 active:translate-y-px text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
