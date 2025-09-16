"use client"

import { useState } from "react"
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
import { User, Settings, LogOut, Crown, Shield, Eye, TrendingUp, Bell, HelpCircle } from "lucide-react"

export function DashboardHeader() {
  const { user, logout } = useAuth()
  const [notifications] = useState(3) // Mock notification count

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
    <header className="bg-slate-800/90 border-b border-slate-700 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Live Deriv Data Analysis</h1>
              <p className="text-xs text-slate-200">Professional Trading Platform</p>
            </div>
          </div>

          {/* User Info and Actions */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative text-slate-100 hover:text-white">
              <Bell className="h-5 w-5" />
              {notifications > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-600">{notifications}</Badge>
              )}
            </Button>

            {/* Help */}
            <Button variant="ghost" size="sm" className="text-slate-100 hover:text-white">
              <HelpCircle className="h-5 w-5" />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3 hover:bg-slate-700">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-600 text-white">
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden md:block">
                    <div className="text-sm font-medium text-white">{user.username}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <span className="flex items-center gap-1">
                          {getRoleIcon(user.role)}
                          <span className="text-slate-100">{user.role}</span>
                        </span>
                      </Badge>
                      <Badge className={`text-xs ${getSubscriptionColor(user.subscription)}`}>
                        {user.subscription}
                      </Badge>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700">
                <DropdownMenuLabel className="text-white">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.username}</p>
                    <p className="text-xs text-slate-200">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem className="text-slate-100 hover:text-white hover:bg-slate-700">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="text-slate-100 hover:text-white hover:bg-slate-700">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="text-slate-100 hover:text-white hover:bg-slate-700">
                  <Shield className="mr-2 h-4 w-4" />
                  Security
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem onClick={logout} className="text-red-400 hover:text-red-300 hover:bg-slate-700">
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
