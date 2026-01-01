"use client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { User, Settings, LogOut, Crown, Shield, Eye, Download, TrendingUp } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import Image from "next/image"

export function DashboardHeader() {
  const { user, logout } = useAuth()

  if (!user) return null

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4" />
      case "trader":
        return <TrendingUp className="h-4 w-4" />
      case "viewer":
        return <Eye className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getSubscriptionColor = (subscription: string) => {
    switch (subscription) {
      case "enterprise":
        return "bg-purple-600"
      case "premium":
        return "bg-blue-600"
      case "free":
        return "bg-gray-600"
      default:
        return "bg-gray-600"
    }
  }

  return (
    <header className="bg-card border-b border-border backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <Image src="/deriv-logo.png" alt="Deriv Pro Logo" width={40} height={40} className="rounded-lg" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm md:text-base font-bold text-foreground whitespace-nowrap">
                  Live Deriv Data Analysis
                </h1>
                <div className="flex items-center gap-1 sm:gap-1.5 border-l border-border pl-1.5 sm:pl-2 h-3 sm:h-4">
                  <span className="text-[8px] sm:text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium">
                    Powered by
                  </span>
                  <Image
                    src="/deriv-powered-by.png"
                    alt="Deriv Logo"
                    width={48}
                    height={16}
                    className="opacity-90 object-contain w-8 sm:w-12 h-auto"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Professional Trading Platform</p>
            </div>
          </div>

          {/* User Info and Actions */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Download Guide */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open("/api/generate-pdf", "_blank")}
              title="Download User Guide"
            >
              <Download className="h-5 w-5" />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3 hover:bg-accent">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden md:block">
                    <div className="text-sm font-medium text-foreground">{user.username}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <span className="flex items-center gap-1">
                          {getRoleIcon(user.role)}
                          <span>{user.role}</span>
                        </span>
                      </Badge>
                      <Badge className={`text-xs ${getSubscriptionColor(user.subscription)}`}>
                        {user.subscription}
                      </Badge>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.username}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Shield className="mr-2 h-4 w-4" />
                  Security
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
