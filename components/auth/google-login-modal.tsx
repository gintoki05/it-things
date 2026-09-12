"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth"
import { Lock, Mail, Key, User, Eye, EyeOff, AlertTriangle, AlertCircle, CheckCircle2, ShieldCheck, ArrowLeft, KeyRound, X } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

interface GoogleLoginModalProps {
  isOpen?: boolean
  onClose?: () => void
}

type AuthMethod = "password" | "google"
type PasswordMode = "signin" | "signup" | "forgot" | "reset_confirm"

export function GoogleLoginModal({ isOpen, onClose }: GoogleLoginModalProps) {
  const {
    user,
    isLoading,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    resetPasswordForEmail,
    updatePassword,
    isRecoveryMode,
    setIsRecoveryMode,
    signInAsGuest,
    isSupabaseConnected,
  } = useAuth()

  // State
  const [activeTab, setActiveTab] = React.useState<AuthMethod>("password")
  const [passwordMode, setPasswordMode] = React.useState<PasswordMode>("signin")

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [name, setName] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [infoMessage, setInfoMessage] = React.useState<string | null>(null)

  // Auto-switch to reset_confirm if recovery mode is active
  React.useEffect(() => {
    if (isRecoveryMode) {
      setActiveTab("password")
      setPasswordMode("reset_confirm")
      setErrorMessage(null)
      setInfoMessage("Sesi pemulihan aktif. Silakan masukkan kata sandi baru untuk akun Anda.")
    }
  }, [isRecoveryMode])

  // Show if explicitly opened via isOpen, OR if user is not logged in and not loading, OR if in recovery mode
  const shouldShow = Boolean(isOpen || (!user && !isLoading) || isRecoveryMode)
  if (!shouldShow || isLoading) return null

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setInfoMessage(null)

    if (passwordMode === "signin") {
      if (!email.trim() || !password) {
        setErrorMessage("Email dan kata sandi wajib diisi.")
        return
      }
    } else if (passwordMode === "signup") {
      if (!email.trim() || !password) {
        setErrorMessage("Email dan kata sandi wajib diisi.")
        return
      }
      if (password.length < 6) {
        setErrorMessage("Kata sandi minimal 6 karakter.")
        return
      }
      if (!name.trim()) {
        setErrorMessage("Nama lengkap / username wajib diisi.")
        return
      }
    } else if (passwordMode === "forgot") {
      if (!email.trim()) {
        setErrorMessage("Alamat email wajib diisi.")
        return
      }
    } else if (passwordMode === "reset_confirm") {
      if (!newPassword || newPassword.length < 6) {
        setErrorMessage("Kata sandi baru minimal 6 karakter.")
        return
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage("Konfirmasi kata sandi baru tidak cocok.")
        return
      }
    }

    setIsSubmitting(true)
    try {
      if (passwordMode === "signin") {
        await signInWithPassword(email, password)
        onClose?.()
      } else if (passwordMode === "signup") {
        const res = await signUpWithPassword(email, password, name)
        setPasswordMode("signin")
        setPassword("")
        setName("")
        if (res?.needsEmailConfirmation) {
          setInfoMessage("Akun berhasil dibuat! Silakan periksa email Anda untuk konfirmasi, lalu masuk.")
        } else {
          onClose?.()
        }
      } else if (passwordMode === "forgot") {
        await resetPasswordForEmail(email)
        setInfoMessage(`Tautan pemulihan kata sandi telah dikirim ke ${email.trim()}. Silakan buka kotak masuk atau folder spam email Anda, lalu klik tautan untuk mengatur kata sandi baru!`)
      } else if (passwordMode === "reset_confirm") {
        await updatePassword(newPassword)
        setInfoMessage("Kata sandi berhasil diperbarui! Silakan lanjutkan penggunaan akun Anda.")
        setIsRecoveryMode(false)
        setPasswordMode("signin")
        setPassword("")
        setNewPassword("")
        setConfirmPassword("")
        onClose?.()
      }
    } catch (err: unknown) {
      console.error(err)
      const rawMsg = err instanceof Error ? err.message : "Gagal memproses autentikasi."
      let friendlyMsg = rawMsg
      if (rawMsg.includes("Invalid login credentials")) {
        friendlyMsg = "Email atau kata sandi salah. Silakan periksa kembali."
      } else if (rawMsg.includes("User already registered")) {
        friendlyMsg = "Email ini sudah terdaftar. Silakan pilih tab 'Masuk'."
      } else if (rawMsg.includes("Password should be at least")) {
        friendlyMsg = "Kata sandi minimal 6 karakter."
      } else if (rawMsg.includes("Token has expired") || rawMsg.includes("invalid token") || rawMsg.includes("otp_expired")) {
        friendlyMsg = "Kode OTP atau tautan pemulihan sudah kedaluwarsa atau tidak valid."
      }
      setErrorMessage(friendlyMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setErrorMessage(null)
      setInfoMessage(null)
      setIsSubmitting(true)
      await signInWithGoogle()
      onClose?.()
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : "Gagal menghubungkan ke Google OAuth."
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGuestLogin = () => {
    signInAsGuest()
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] overflow-y-auto flex items-center justify-center p-3 sm:p-4 select-none min-h-full">
      <div className="retro-window-frame max-w-md w-full my-auto rounded-[4px] overflow-hidden shadow-[6px_6px_0px_rgba(0,0,0,0.35)] flex flex-col max-h-[90dvh] bg-[#D4DDE6] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287]">
        
        {/* Title Bar */}
        <div className="retro-titlebar px-3 py-1.5 flex items-center justify-between font-mono text-xs font-bold text-white bg-gradient-to-r from-[#102A45] via-[#1E4E8C] to-[#2E6FB5] shrink-0">
          <div className="flex items-center gap-2">
            <Lock className="size-3.5 text-blue-200" />
            <span>SECURITY_GATE.EXE — AUTENTIKASI PENGGUNA</span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="size-7 sm:size-4 min-w-[28px] sm:min-w-0 min-h-[28px] sm:min-h-0 bg-[#D4DDE6] text-[#14253D] hover:bg-[#C53030] hover:text-white flex items-center justify-center border border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] font-mono text-xs sm:text-[10px] font-bold active:translate-y-px cursor-pointer touch-manipulation ml-2"
            >
              <X className="size-3.5 sm:size-3" />
            </button>
          )}
        </div>

        {/* Navigation Tabs (Windows 98 Tab Style) */}
        <div className="flex items-center px-3 pt-2 bg-[#D4DDE6] border-b border-[#A4B5C6] gap-1 font-mono text-xs shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab("password")
              setErrorMessage(null)
              setInfoMessage(null)
            }}
            className={`px-3 py-1.5 rounded-t-[3px] border-t-2 border-l-2 border-r-2 font-bold cursor-pointer transition-all ${
              activeTab === "password"
                ? "bg-white text-[#102A45] border-t-white border-l-white border-r-[#5E7287] -mb-[1px] z-10"
                : "bg-[#C4D0DC] text-gray-700 border-transparent hover:bg-[#B8C6D4]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Mail className="size-3.5 text-[#1E4E8C]" />
              Email & Sandi
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("google")
              setErrorMessage(null)
              setInfoMessage(null)
            }}
            className={`px-3 py-1.5 rounded-t-[3px] border-t-2 border-l-2 border-r-2 font-bold cursor-pointer transition-all ${
              activeTab === "google"
                ? "bg-white text-[#102A45] border-t-white border-l-white border-r-[#5E7287] -mb-[1px] z-10"
                : "bg-[#C4D0DC] text-gray-700 border-transparent hover:bg-[#B8C6D4]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <svg className="size-3.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              Google OAuth
            </span>
          </button>
        </div>

        {/* Content Container */}
        <div className="p-4 sm:p-5 bg-white space-y-4 overflow-y-auto flex-1">
          
          {/* TAB 1: EMAIL & PASSWORD */}
          {activeTab === "password" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
              {/* Mode: Sign In / Sign Up */}
              {(passwordMode === "signin" || passwordMode === "signup") && (
                <>
                  {/* Toggle Submode: Masuk vs Daftar */}
                  <div className="flex items-center justify-between p-1 bg-[#EEF2F6] border border-[#A4B5C6] rounded-[2px] font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordMode("signin")
                        setErrorMessage(null)
                        setInfoMessage(null)
                      }}
                      className={`flex-1 py-1 text-center font-bold rounded-[2px] transition-all cursor-pointer ${
                        passwordMode === "signin"
                          ? "bg-[#1E4E8C] text-white shadow-sm"
                          : "text-gray-600 hover:text-[#102A45]"
                      }`}
                    >
                      Masuk Akun
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordMode("signup")
                        setErrorMessage(null)
                        setInfoMessage(null)
                      }}
                      className={`flex-1 py-1 text-center font-bold rounded-[2px] transition-all cursor-pointer ${
                        passwordMode === "signup"
                          ? "bg-[#1E4E8C] text-white shadow-sm"
                          : "text-gray-600 hover:text-[#102A45]"
                      }`}
                    >
                      Daftar Baru
                    </button>
                  </div>

                  {/* Privacy Notice (Safe from Google access) */}
                  <div className="p-2 bg-emerald-50 border border-emerald-300 rounded-[2px] text-[10px] text-emerald-800 font-sans flex items-start gap-1.5">
                    <ShieldCheck className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Aman & Mandiri:</strong> Akun ini disimpan langsung di database internal suite. Tidak terhubung atau meminta akses ke akun Google Anda.
                    </span>
                  </div>

                  {/* Input Nama (hanya jika Daftar) */}
                  {passwordMode === "signup" && (
                    <div className="space-y-1">
                      <label className="block text-[11px] font-mono font-bold text-[#14253D]">
                        Nama Lengkap / Username:
                      </label>
                      <div className="relative">
                        <User className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="cth. Username Kamu"
                          className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white text-[#14253D] font-mono border-2 border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Input Email */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono font-bold text-[#14253D]">
                      Alamat Email:
                    </label>
                    <div className="relative">
                      <Mail className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@email.com"
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white text-[#14253D] font-mono border-2 border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
                      />
                    </div>
                  </div>

                  {/* Input Sandi */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-mono font-bold text-[#14253D]">
                        Kata Sandi:
                      </label>
                      {passwordMode === "signin" && (
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordMode("forgot")
                            setErrorMessage(null)
                            setInfoMessage(null)
                          }}
                          className="text-[10px] font-mono text-[#1E4E8C] hover:underline cursor-pointer font-bold"
                        >
                          Lupa kata sandi?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Key className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={passwordMode === "signup" ? "Minimal 6 karakter" : "Masukkan kata sandi"}
                        className="w-full pl-8 pr-8 py-1.5 text-xs bg-white text-[#14253D] font-mono border-2 border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !isSupabaseConnected}
                    className="w-full py-2 px-4 rounded-[2px] border border-[#102A45] bg-[#1E4E8C] hover:bg-[#153A6B] active:translate-y-px text-white font-mono text-xs font-bold shadow-[1px_1px_0px_#102A45] transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span>MEMPROSES...</span>
                    ) : passwordMode === "signin" ? (
                      <span>MASUK KE SISTEM</span>
                    ) : (
                      <span>BUAT AKUN BARU</span>
                    )}
                  </button>
                </>
              )}

              {/* Mode: Lupa Kata Sandi (Forgot Password) */}
              {passwordMode === "forgot" && (
                <>
                  <div className="flex items-center justify-between pb-1 border-b border-[#A4B5C6] font-mono">
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordMode("signin")
                        setErrorMessage(null)
                        setInfoMessage(null)
                      }}
                      className="flex items-center gap-1 text-xs text-[#1E4E8C] hover:underline font-bold cursor-pointer"
                    >
                      <ArrowLeft className="size-3.5" />
                      <span>Kembali ke Masuk</span>
                    </button>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                      Pemulihan Sandi
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-600 font-sans leading-relaxed">
                    Masukkan alamat email akun Kamu. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi ke email tersebut.
                  </p>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono font-bold text-[#14253D]">
                      Alamat Email:
                    </label>
                    <div className="relative">
                      <Mail className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@email.com"
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white text-[#14253D] font-mono border-2 border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !isSupabaseConnected}
                    className="w-full py-2 px-4 rounded-[2px] border border-[#102A45] bg-[#1E4E8C] hover:bg-[#153A6B] active:translate-y-px text-white font-mono text-xs font-bold shadow-[1px_1px_0px_#102A45] transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <span>MENGIRIM TAUTAN...</span> : <span>KIRIM TAUTAN PEMULIHAN</span>}
                  </button>
                </>
              )}

              {/* Mode: Reset Konfirmasi via Link Email */}
              {passwordMode === "reset_confirm" && (
                <>
                  <div className="p-2.5 bg-blue-50 border border-blue-300 rounded-[2px] text-xs text-blue-900 font-mono flex items-start gap-2">
                    <KeyRound className="size-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Sesi Pemulihan Terbuka</strong>
                      <p className="text-[11px] text-blue-800 mt-0.5 font-sans">
                        Tautan verifikasi valid. Silakan buat kata sandi baru untuk akun Anda.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono font-bold text-[#14253D]">
                      Kata Sandi Baru:
                    </label>
                    <div className="relative">
                      <Key className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full pl-8 pr-8 py-1.5 text-xs bg-white text-[#14253D] font-mono border-2 border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono font-bold text-[#14253D]">
                      Konfirmasi Kata Sandi Baru:
                    </label>
                    <div className="relative">
                      <Key className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ketik ulang kata sandi baru"
                        className="w-full pl-8 pr-8 py-1.5 text-xs bg-white text-[#14253D] font-mono border-2 border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || !isSupabaseConnected}
                    className="w-full py-2 px-4 rounded-[2px] border border-[#102A45] bg-[#1E4E8C] hover:bg-[#153A6B] active:translate-y-px text-white font-mono text-xs font-bold shadow-[1px_1px_0px_#102A45] transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <span>MEMPERBARUI...</span> : <span>PERBARUI KATA SANDI</span>}
                  </button>
                </>
              )}
            </form>
          )}

          {/* TAB 2: GOOGLE OAUTH */}
          {activeTab === "google" && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 bg-[#EEF2F6] border border-[#95A5B5] rounded-[3px]">
                <div className="size-9 bg-white border border-[#7D8E9E] rounded-[2px] flex items-center justify-center text-lg shrink-0">
                  🌐
                </div>
                <div className="text-[11px] font-sans text-gray-700">
                  Login instan 1-klik menggunakan akun Google Anda. Hanya membaca nama & foto profil publik.
                </div>
              </div>

              <button
                type="button"
                disabled={isSubmitting || !isSupabaseConnected}
                onClick={handleGoogleLogin}
                className="w-full py-2.5 px-4 rounded-[2px] border border-[#7D8E9E] bg-[#EEF2F6] hover:bg-[#E2E8F0] active:translate-y-px text-[#14253D] font-mono text-xs font-bold flex items-center justify-center gap-2.5 shadow-[1px_1px_0px_#7D8E9E] transition-all disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>{isSubmitting ? "MENGHUBUNGKAN GOOGLE..." : "Masuk dengan Google"}</span>
              </button>
            </div>
          )}

          {/* Feedback Messages */}
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <div>
                <AlertTitle>[AUTH ERROR]</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </div>
            </Alert>
          )}

          {infoMessage && (
            <div className="p-2.5 bg-blue-50 border border-blue-300 text-blue-900 font-mono text-[11px] rounded flex items-start gap-2">
              <CheckCircle2 className="size-4 text-blue-600 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {!isSupabaseConnected && (
            <Alert variant="warning">
              <AlertTriangle className="size-4" />
              <div>
                <AlertTitle>[CONFIG WAJIB]: SUPABASE BELUM TERHUBUNG</AlertTitle>
                <AlertDescription>
                  Kredensial Supabase belum terisi di <code className="font-bold">.env.local</code>.
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Guest / Demo Option Divider */}
          <div className="pt-2 border-t border-[#A4B5C6]/60">
            <button
              type="button"
              onClick={handleGuestLogin}
              className="w-full py-1.5 px-3 rounded-[2px] border border-dashed border-[#7D8E9E] hover:bg-gray-50 text-gray-600 font-mono text-[11px] text-center active:translate-y-px cursor-pointer"
            >
              Mode Peninjauan / Tamu Internal (Tanpa Login)
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
