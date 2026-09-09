"use client"

import * as React from "react"
import { AuthProvider, useAuth } from "@/lib/auth"
import { GoogleLoginModal } from "@/components/auth/google-login-modal"
import { usePantryStore, PantryItem } from "@/lib/pantry-store"
import { detectEmoji } from "@/lib/emoji-helper"
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Lock, 
  Star, 
  Home, 
  ListOrdered, 
  Users, 
  Archive, 
  Calendar, 
  Plus, 
  Monitor, 
  Folder,
  LogOut
} from "lucide-react"

function PantryDesktop() {
  const { user, signOut, isSupabaseConnected } = useAuth()
  const currentMonth = "2026-09"
  const { items, isLoading, isUsingSupabase, toggleVote, addItem, refresh } = usePantryStore(currentMonth)

  const [newItemName, setNewItemName] = React.useState("")
  const [activeNav, setActiveNav] = React.useState<"home" | "list" | "members" | "archive">("home")
  const [time, setTime] = React.useState("10:24")

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }))
    }
    updateTime()
    const timer = setInterval(updateTime, 10000)
    return () => clearInterval(timer)
  }, [])

  // Dynamic Statistics
  const totalItemsCount = items.length
  const totalVotesCount = items.reduce((acc, curr) => acc + (curr.voters?.length || 0), 0)
  const uniqueVoterNames = React.useMemo(() => {
    const set = new Set<string>()
    items.forEach((item) => {
      ;(item.voters || []).forEach((v) => {
        if (v && v.name) set.add(v.name)
      })
    })
    return Array.from(set)
  }, [items])
  const activeParticipantsCount = Math.max(uniqueVoterNames.length, 8)

  // Top Item
  const topItem = React.useMemo(() => {
    if (items.length === 0) return null
    return [...items].sort((a, b) => (b.voters?.length || 0) - (a.voters?.length || 0))[0]
  }, [items])

  // Handle Voting
  const handleVote = (itemId: string) => {
    if (!user) return
    toggleVote(itemId, {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
    })
  }

  // Handle Add Item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim() || !user) return

    const emoji = detectEmoji(newItemName.trim())
    addItem(
      newItemName.trim(),
      "Usulan tim " + user.name,
      emoji,
      {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
      }
    )
    setNewItemName("")
  }

  return (
    <div className="min-h-screen bg-[#BDC6CE] p-2 sm:p-4 md:p-6 flex flex-col justify-between font-sans select-none">
      {/* Google Login Modal Popup */}
      <GoogleLoginModal />

      {/* Outer Window Container (90s Desktop Web App) */}
      <div className="max-w-[1240px] w-full mx-auto bg-[#E5E9EE] border border-[#7B8B9B] shadow-[2px_2px_0px_rgba(0,0,0,0.15)] rounded-[4px] overflow-hidden flex flex-col">
        
        {/* ======================================================== */}
        {/* BROWSER CHROME HEADER */}
        {/* ======================================================== */}
        <div className="bg-[#D3DCE4] border-b border-[#96A6B6] px-3 py-1.5 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            {/* Window Traffic Lights */}
            <div className="flex items-center gap-1.5 mr-2">
              <span className="size-3 rounded-full bg-[#E85E55] border border-[#C54139] inline-block" />
              <span className="size-3 rounded-full bg-[#E5BF3B] border border-[#BF9C28] inline-block" />
              <span className="size-3 rounded-full bg-[#5BC248] border border-[#449A32] inline-block" />
            </div>

            {/* Browser Tab */}
            <div className="retro-browser-tab bg-[#E5E9EE] px-3 py-1 flex items-center gap-2 text-xs font-mono font-medium text-[#1A2E46] border border-[#95A5B5] border-b-0 shadow-sm">
              <img src="/it-things-icon.png" alt="icon" className="size-3.5 object-contain" />
              <span>IT-THINGS.EXE — Tim TI</span>
              <span className="text-[#6D7D8E] hover:text-black ml-2 cursor-pointer font-bold">×</span>
            </div>
            <button className="text-sm font-bold text-[#6D7D8E] hover:text-black px-1.5">+</button>
          </div>

          {/* User Account / Profile Chip in Top Right */}
          <div className="flex items-center gap-2 text-xs text-[#526374]">
            {user ? (
              <div className="flex items-center gap-2 bg-[#E5E9EE] border border-[#95A5B5] px-2 py-0.5 rounded-[3px]">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="size-4 rounded-full border border-white"
                  />
                ) : (
                  <div className="size-4 rounded-full bg-[#2E5AA8] text-white flex items-center justify-center font-bold text-[9px]">
                    {user.name.charAt(0)}
                  </div>
                )}
                <span className="font-mono text-[11px] font-bold text-[#14253D] truncate max-w-[120px]">
                  {user.name}
                </span>
                <button
                  type="button"
                  onClick={() => signOut()}
                  title="Keluar / Ganti Akun"
                  className="text-[#647586] hover:text-[#B84B4B] ml-1"
                >
                  <LogOut className="size-3" />
                </button>
              </div>
            ) : (
              <div className="size-5 rounded-full bg-[#20364F] text-white flex items-center justify-center font-bold text-[10px]">
                IT
              </div>
            )}
          </div>
        </div>

        {/* Address Bar */}
        <div className="bg-[#E5E9EE] border-b border-[#96A6B6] px-3 py-1.5 flex items-center gap-2 select-none text-xs">
          <div className="flex items-center gap-1 text-[#647586]">
            <button className="p-1 hover:bg-[#D4DDE6] rounded-[2px]"><ArrowLeft className="size-3.5" /></button>
            <button className="p-1 hover:bg-[#D4DDE6] rounded-[2px]"><ArrowRight className="size-3.5" /></button>
            <button 
              onClick={() => refresh()} 
              title="Refresh Realtime" 
              className="p-1 hover:bg-[#D4DDE6] rounded-[2px]"
            >
              <RotateCw className="size-3.5" />
            </button>
          </div>

          <div className="flex-1 bg-white border border-[#95A5B5] rounded-[2px] px-2.5 py-1 flex items-center justify-between font-mono text-xs text-[#20364F]">
            <div className="flex items-center gap-2 truncate">
              <Lock className="size-3 text-[#398E5E]" />
              <span className="text-[#398E5E] font-semibold">https://</span>
              <span>it-things.exe</span>
            </div>
            <Star className="size-3.5 text-[#95A5B5] hover:text-[#2E5AA8] cursor-pointer" />
          </div>
        </div>

        {/* ======================================================== */}
        {/* APP HEADER: IT-THINGS.EXE & IT DEPARTMENT CARD */}
        {/* ======================================================== */}
        <div className="p-4 sm:p-5 border-b border-[#96A6B6] bg-[#E5E9EE]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Left Brand: Custom Pixel Basket Icon + Title */}
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="size-14 sm:size-16 shrink-0 flex items-center justify-center border-2 border-[#14253D] bg-white p-0.5 shadow-[2px_2px_0px_#14253D] rounded-[2px] overflow-hidden">
                <img
                  src="/it-things-icon.png"
                  alt="IT-THINGS"
                  className="size-full object-contain"
                />
              </div>

              <div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h1 className="font-mono text-2xl sm:text-3xl font-extrabold tracking-wider text-[#14253D]">
                    IT-THINGS.EXE
                  </h1>
                  <span className="font-mono text-xs text-[#526374] font-semibold">
                    v1.0.0
                  </span>
                </div>
                <p className="font-sans text-xs sm:text-sm font-semibold text-[#14253D] mt-0.5">
                  List belanja bulanan tim TI
                </p>
                <div className="font-mono text-[11px] sm:text-xs text-[#526374] mt-0.5 flex items-center gap-1">
                  <span>&gt;&gt; Makan enak, ngoding lebih semangat!</span>
                  <span className="font-bold text-[#2E5AA8]">\(\^o\^)/</span>
                </div>
              </div>
            </div>

            {/* Right Card: IT Department & System Status */}
            <div className="flex items-center gap-3 border border-[#95A5B5] bg-[#F2F5F8] p-2.5 rounded-[3px] shadow-sm self-start md:self-auto">
              <div className="size-10 border border-[#95A5B5] bg-white flex items-center justify-center p-1 shrink-0">
                <Monitor className="size-6 text-[#2E5AA8]" />
              </div>
              <div className="text-[11px] font-mono leading-tight pr-3 border-r border-[#CBD5E1]">
                <div className="font-bold text-[#14253D]">IT DEPARTMENT</div>
                <div className="text-[#526374]">Good Food</div>
                <div className="text-[#526374]">Better Code</div>
                <div className="text-[#526374]">Happier Team</div>
              </div>
              <div className="text-[10px] font-mono leading-normal text-[#14253D]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#526374]">SYS:</span>
                  {isUsingSupabase ? (
                    <span className="text-[#1F9254] font-bold">● ONLINE (SYNCED)</span>
                  ) : (
                    <span className="text-[#D9A028] font-bold">● LOCAL BUFFER</span>
                  )}
                </div>
                <div>USERS: <span className="font-bold">{activeParticipantsCount}</span></div>
                <div>MONTH: <span className="font-bold">SEP 2026</span></div>
                <div className="text-[#526374] text-[9px] mt-0.5">&gt; it-things.exe running...</div>
              </div>
            </div>

          </div>
        </div>

        {/* ======================================================== */}
        {/* DESKTOP TOOLBAR NAVIGATION */}
        {/* ======================================================== */}
        <div className="bg-[#D8E0E8] border-b border-[#96A6B6] px-3 py-1 flex flex-wrap items-center justify-between gap-2 select-none">
          <div className="flex items-center gap-1 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveNav("home")}
              className={`px-3 py-1 rounded-[2px] flex items-center gap-1.5 border transition-all ${
                activeNav === "home"
                  ? "bg-[#E5E9EE] border-[#7D8E9E] font-bold text-[#14253D] shadow-sm"
                  : "border-transparent text-[#526374] hover:bg-[#CAD4DE]"
              }`}
            >
              <Home className="size-3.5 text-[#2E5AA8]" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveNav("list")}
              className={`px-3 py-1 rounded-[2px] flex items-center gap-1.5 border transition-all ${
                activeNav === "list"
                  ? "bg-[#E5E9EE] border-[#7D8E9E] font-bold text-[#14253D] shadow-sm"
                  : "border-transparent text-[#526374] hover:bg-[#CAD4DE]"
              }`}
            >
              <ListOrdered className="size-3.5" />
              <span>Daftar Belanja</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveNav("members")}
              className={`px-3 py-1 rounded-[2px] flex items-center gap-1.5 border transition-all ${
                activeNav === "members"
                  ? "bg-[#E5E9EE] border-[#7D8E9E] font-bold text-[#14253D] shadow-sm"
                  : "border-transparent text-[#526374] hover:bg-[#CAD4DE]"
              }`}
            >
              <Users className="size-3.5" />
              <span>Peserta</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveNav("archive")}
              className={`px-3 py-1 rounded-[2px] flex items-center gap-1.5 border transition-all ${
                activeNav === "archive"
                  ? "bg-[#E5E9EE] border-[#7D8E9E] font-bold text-[#14253D] shadow-sm"
                  : "border-transparent text-[#526374] hover:bg-[#CAD4DE]"
              }`}
            >
              <Archive className="size-3.5" />
              <span>Arsip</span>
            </button>
          </div>

          <div className="font-mono text-[11px] text-[#526374] pr-2 hidden sm:block">
            // INTERNAL TOOL - FOR A HAPPIER IT TEAM :)
          </div>
        </div>

        {/* ======================================================== */}
        {/* MAIN DESKTOP 3-COLUMN WORKSPACE */}
        {/* ======================================================== */}
        <div className="p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)_250px] gap-3.5 items-start">
          
          {/* ============================================== */}
          {/* LEFT COLUMN: BULAN INI & PESAN SISTEM */}
          {/* ============================================== */}
          <div className="space-y-3.5">
            {/* Window: BULAN INI */}
            <div className="retro-window-frame rounded-[3px] overflow-hidden">
              <div className="retro-titlebar px-2.5 py-1 flex items-center justify-between font-mono text-xs font-bold text-[#14253D]">
                <span>BULAN INI</span>
                <div className="flex items-center gap-1 text-[10px]">
                  <span>_</span>
                  <span>□</span>
                  <span>×</span>
                </div>
              </div>

              <div className="p-3.5 bg-white space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-[2px] border border-[#7D8E9E] bg-[#EEF2F6] flex items-center justify-center shrink-0">
                    <Calendar className="size-5 text-[#2E5AA8]" />
                  </div>
                  <div>
                    <h2 className="font-mono text-base font-bold text-[#14253D]">
                      September 2026
                    </h2>
                  </div>
                </div>

                <div className="text-xs text-[#526374] font-mono leading-tight">
                  <div>Periode belanja:</div>
                  <div className="font-bold text-[#14253D] text-xs mt-0.5">1 - 30 September 2026</div>
                </div>

                <div className="p-2.5 rounded-[3px] bg-[#D4F3DE] border border-[#8CD3A5] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#1F9254]">
                    <span className="size-2 rounded-full bg-[#1F9254]" />
                    <span>Sedang berlangsung</span>
                  </div>
                  <div className="text-[11px] text-[#296D45] leading-snug">
                    Ayo isi kebutuhan bulan ini!
                  </div>
                </div>
              </div>
            </div>

            {/* Window: PESAN SISTEM */}
            <div className="retro-window-frame rounded-[3px] overflow-hidden">
              <div className="retro-titlebar px-2.5 py-1 flex items-center justify-between font-mono text-xs font-bold text-[#14253D]">
                <span>PESAN SISTEM</span>
                <div className="flex items-center gap-1 text-[10px]">
                  <span>_</span>
                  <span>□</span>
                  <span>×</span>
                </div>
              </div>

              <div className="p-3 bg-white space-y-2.5 text-xs text-[#14253D]">
                <div className="space-y-1 text-[11px] leading-relaxed">
                  <div className="flex items-start gap-1.5">
                    <span className="font-mono text-[#526374]">&gt;</span>
                    <span>Diskusi lebih mudah daripada di WhatsApp.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-mono text-[#526374]">&gt;</span>
                    <span>Satu klik, satu suara (1-person-1-vote).</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-mono text-[#526374]">&gt;</span>
                    <span>
                      {topItem ? `"${topItem.name}" sementara memimpin.` : "Pantry siap diisi."} ✨
                    </span>
                  </div>
                </div>

                {/* ASCII Art Cat / Coffee */}
                <div className="pt-2 border-t border-[#DDE3EA] flex items-end justify-between font-mono text-xs">
                  <div className="leading-none text-[11px] text-[#14253D]">
                    <div>&nbsp;^___^</div>
                    <div>(&nbsp;•&nbsp;•&nbsp;)</div>
                    <div>/&nbsp;&nbsp;⊃&nbsp;☕</div>
                  </div>
                  <div className="text-[10px] text-[#526374] text-right font-sans font-semibold">
                    Selamat<br />belanja!
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================== */}
          {/* CENTER COLUMN: DAFTAR BELANJA TABLE */}
          {/* ============================================== */}
          <div className="retro-window-frame rounded-[3px] overflow-hidden flex flex-col">
            <div className="retro-titlebar px-3 py-1 flex items-center justify-between font-mono text-xs font-bold text-[#14253D]">
              <span>DAFTAR BELANJA — SEPTEMBER 2026</span>
              <div className="flex items-center gap-1 text-[10px]">
                <span>_</span>
                <span>□</span>
                <span>×</span>
              </div>
            </div>

            <div className="bg-white p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
              
              {/* Table Header */}
              <div className="grid grid-cols-[28px_minmax(0,1fr)_120px_54px] gap-2 px-2 pb-1.5 border-b border-[#95A5B5] font-mono text-xs font-bold text-[#14253D]">
                <div className="text-center">#</div>
                <div>Item</div>
                <div className="text-center">Suara</div>
                <div className="text-center">Aksi</div>
              </div>

              {/* Items List */}
              <div className="divide-y divide-[#E2E8F0]">
                {items.map((item, idx) => {
                  const votersList = item.voters || []
                  const hasVoted = user ? votersList.some((v) => v.id === user.id) : false

                  return (
                    <div
                      key={item.id}
                      className="py-2.5 px-2 grid grid-cols-[28px_minmax(0,1fr)_120px_54px] gap-2 items-center hover:bg-[#F4F7FA] transition-colors"
                    >
                      {/* # Number */}
                      <div className="font-mono text-xs font-bold text-[#526374] text-center">
                        {idx + 1}
                      </div>

                      {/* Item + Icon + Description */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-9 rounded-[2px] border border-[#95A5B5] bg-[#FAFBFD] flex items-center justify-center text-lg shrink-0 shadow-sm">
                          {item.emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-xs sm:text-sm text-[#14253D] truncate">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-[#526374] truncate">
                            {item.detail}
                          </div>
                        </div>
                      </div>

                      {/* Suara (Vote Count & Voter Avatars) */}
                      <div className="flex items-center justify-center gap-2 font-mono">
                        <span className="text-base font-bold text-[#14253D]">
                          {votersList.length}
                        </span>
                        
                        {/* Mini Avatars Stack */}
                        <div className="hidden sm:flex items-center -space-x-1.5">
                          {votersList.slice(0, 4).map((voter) => (
                            <div
                              key={voter.id}
                              title={voter.name}
                              className="size-5 rounded-full border border-white bg-[#3B5B84] text-white flex items-center justify-center text-[9px] font-bold shadow-xs overflow-hidden"
                            >
                              {voter.avatarUrl ? (
                                <img
                                  src={voter.avatarUrl}
                                  alt={voter.name}
                                  className="size-full object-cover"
                                />
                              ) : (
                                voter.name?.charAt(0) || "?"
                              )}
                            </div>
                          ))}
                          {votersList.length > 4 && (
                            <span className="text-[10px] text-[#526374] font-bold pl-2">
                              +{votersList.length - 4}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Aksi (+1 Button) */}
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleVote(item.id)}
                          className={`w-11 h-7 rounded-[2px] font-mono text-xs font-bold transition-all flex items-center justify-center ${
                            hasVoted
                              ? "bg-[#3156A6] text-white border border-[#203B76]"
                              : "retro-button-3d"
                          }`}
                          title={hasVoted ? "Klik untuk membatalkan suara" : "Beri suara [+1]"}
                        >
                          {hasVoted ? "✓" : "+1"}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Bottom Form: + Tambah item baru (Smart Emoji) */}
              <form
                onSubmit={handleAddItem}
                className="pt-3 border-t border-[#95A5B5] flex flex-wrap sm:flex-nowrap items-center gap-2"
              >
                <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#14253D] whitespace-nowrap">
                  <span className="text-[#2E5AA8]">+</span>
                  <span>Tambah item baru</span>
                </div>

                <input
                  type="text"
                  placeholder="Contoh: Gula, Biskuit, Kopi Tubruk..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="flex-1 min-w-[160px] h-8 px-2.5 rounded-[2px] border border-[#95A5B5] bg-white text-xs font-sans text-[#14253D] focus:outline-none focus:ring-1 focus:ring-[#2E5AA8]"
                />

                <button
                  type="submit"
                  className="h-8 px-3.5 rounded-[2px] bg-[#2E5AA8] hover:bg-[#234785] text-white font-mono text-xs font-bold border border-[#1B3B73] shadow-sm active:translate-y-px whitespace-nowrap"
                >
                  + Add Item
                </button>
              </form>

            </div>
          </div>

          {/* ============================================== */}
          {/* RIGHT COLUMN: PESERTA, STATISTIK, CATATAN */}
          {/* ============================================== */}
          <div className="space-y-3.5">
            {/* Window: PESERTA */}
            <div className="retro-window-frame rounded-[3px] overflow-hidden">
              <div className="retro-titlebar px-2.5 py-1 flex items-center justify-between font-mono text-xs font-bold text-[#14253D]">
                <span>PESERTA ({activeParticipantsCount})</span>
                <div className="flex items-center gap-1 text-[10px]">
                  <span>_</span>
                  <span>□</span>
                  <span>×</span>
                </div>
              </div>

              <div className="p-3 bg-white space-y-3">
                <div className="grid grid-cols-4 gap-2 text-center">
                  {uniqueVoterNames.slice(0, 8).map((name) => (
                    <div key={name} className="flex flex-col items-center space-y-1">
                      <div className="size-8 rounded-full bg-[#4D77A7] text-white flex items-center justify-center font-bold text-xs shadow-xs border border-white">
                        {name.charAt(0)}
                      </div>
                      <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-[#14253D]">
                        <span className="size-1.5 rounded-full bg-[#1F9254]" />
                        <span className="truncate max-w-[42px]">{name}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#DDE3EA]">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        navigator.clipboard.writeText(window.location.href)
                        alert("Link IT-THINGS.EXE telah disalin ke clipboard!")
                      }
                    }}
                    className="w-full py-1.5 retro-button-3d rounded-[2px] font-mono text-[11px] font-semibold text-[#14253D] flex items-center justify-center gap-1"
                  >
                    <span>+</span>
                    <span>Undang rekan tim (Salin Link)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Window: STATISTIK */}
            <div className="retro-window-frame rounded-[3px] overflow-hidden">
              <div className="retro-titlebar px-2.5 py-1 flex items-center justify-between font-mono text-xs font-bold text-[#14253D]">
                <span>STATISTIK</span>
                <div className="flex items-center gap-1 text-[10px]">
                  <span>_</span>
                  <span>□</span>
                  <span>×</span>
                </div>
              </div>

              <div className="p-3 bg-white grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[#526374]">
                    <Calendar className="size-3.5 text-[#2E5AA8]" />
                    <span className="text-[10px]">Total item</span>
                  </div>
                  <div className="text-base font-bold text-[#14253D]">{totalItemsCount}</div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[#526374]">
                    <Users className="size-3.5 text-[#2E5AA8]" />
                    <span className="text-[10px]">Peserta aktif</span>
                  </div>
                  <div className="text-base font-bold text-[#14253D]">{activeParticipantsCount}</div>
                </div>

                <div className="space-y-0.5 border-t border-[#DDE3EA] pt-2">
                  <div className="flex items-center gap-1.5 text-[#526374]">
                    <span className="text-xs">💬</span>
                    <span className="text-[10px]">Total suara</span>
                  </div>
                  <div className="text-base font-bold text-[#14253D]">{totalVotesCount}</div>
                </div>

                <div className="space-y-0.5 border-t border-[#DDE3EA] pt-2">
                  <div className="flex items-center gap-1.5 text-[#526374]">
                    <span className="text-xs">☕</span>
                    <span className="text-[10px]">Niat jajan</span>
                  </div>
                  <div className="text-base font-bold text-[#14253D]">100%</div>
                </div>
              </div>
            </div>

            {/* Window: CATATAN (Yellow Sticky Note) */}
            <div className="retro-window-frame rounded-[3px] overflow-hidden">
              <div className="retro-titlebar px-2.5 py-1 flex items-center justify-between font-mono text-xs font-bold text-[#14253D]">
                <span>CATATAN</span>
                <div className="flex items-center gap-1 text-[10px]">
                  <span>_</span>
                  <span>□</span>
                  <span>×</span>
                </div>
              </div>

              <div className="p-3.5 bg-[#FFF8C5] border-t border-[#F3E58D] text-xs font-mono space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[#3B341F] leading-snug font-medium">
                    Belanja bareng,<br />
                    perut senang,<br />
                    server pun tenang.
                  </div>
                  <div className="text-lg">🤖</div>
                </div>

                <div className="text-[11px] text-[#6A6040] pt-1">
                  - Tim TI, Always Hungry _
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer Credit Line */}
        <div className="py-2 text-center font-mono text-[10px] text-[#526374] border-t border-[#96A6B6] bg-[#E5E9EE]">
          *** IT-THINGS.EXE - BUILT WITH ☕ AND &lt;3 BY IT TEAM ***
        </div>

      </div>

      {/* ======================================================== */}
      {/* 90s RETRO SYSTEM TASKBAR (DESKTOP BOTTOM) */}
      {/* ======================================================== */}
      <div className="max-w-[1240px] w-full mx-auto mt-2 bg-[#D3DCE4] border border-[#7D8E9E] rounded-[3px] px-2 py-1 flex items-center justify-between text-xs font-mono select-none">
        <div className="flex items-center gap-1.5">
          <button className="retro-button-3d px-2.5 py-0.5 font-bold flex items-center gap-1 rounded-[2px]">
            <span className="size-2 bg-[#2E5AA8] inline-block" />
            <span>Start</span>
          </button>

          <div className="px-2.5 py-0.5 bg-[#E5E9EE] border border-[#7D8E9E] rounded-[2px] font-bold flex items-center gap-1.5 text-[#14253D] shadow-inner">
            <img src="/it-things-icon.png" alt="icon" className="size-3.5 object-contain" />
            <span>IT-THINGS.EXE</span>
          </div>

          <div className="hidden sm:flex px-2.5 py-0.5 bg-transparent hover:bg-[#CAD4DE] rounded-[2px] items-center gap-1.5 text-[#526374]">
            <Folder className="size-3 text-[#D9A028]" />
            <span>Happy IT Team</span>
          </div>
        </div>

        <div className="flex items-center gap-2 border border-[#95A5B5] px-2 py-0.5 bg-[#E5E9EE] rounded-[2px] text-[11px] text-[#14253D]">
          <span>SEP 2026</span>
          <span className="font-bold">{time}</span>
        </div>
      </div>

    </div>
  )
}

export default function Page() {
  return (
    <AuthProvider>
      <PantryDesktop />
    </AuthProvider>
  )
}
