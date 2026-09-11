import type { Viewport } from "next"
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const ibmSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
})

const ibmMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
})

export const metadata = {
  title: "IT-THINGS.EXE - Tim TI",
  description: "Internal IT utility and team workspace — Looks old, works modern",
  icons: {
    icon: "/IT-THINGS-icon-pack/it-things-icon-pack/png-64/grid.png",
    shortcut: "/IT-THINGS-icon-pack/it-things-icon-pack/png-64/grid.png",
    apple: "/IT-THINGS-icon-pack/it-things-icon-pack/png-128/grid.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-content",
  themeColor: "#1E4E8C",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", ibmMono.variable, ibmSans.variable)}
    >
      <body className="font-sans antialiased bg-[#C4CCD3] text-[#14253D] selection:bg-[#3156A6] selection:text-white">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
