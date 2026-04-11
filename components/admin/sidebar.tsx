// components/admin/sidebar.tsx
// 後臺側邊導覽列元件
// 支援折疊模式與 hover 展開功能，含深色模式切換按鈕

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/lib/contexts/sidebar-context";
import { useAdminTheme } from "@/lib/contexts/admin-theme-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  BookOpen,
  Image,
  Users,
  ShoppingCart,
  BarChart3,
  Settings,
  MessageCircle,
  Ticket,
  Sun,
  Moon,
} from "lucide-react";
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion";
import { usePublicSiteSettings } from "@/hooks/use-public-site-settings";

// 側邊欄導覽項目
const sidebarItems = [
  {
    title: "儀表板",
    href: "/admin",
    icon: LayoutDashboard,
    adminOnly: false,
  },
  {
    title: "課程管理",
    href: "/admin/courses",
    icon: BookOpen,
    adminOnly: false,
  },
  {
    title: "留言管理",
    href: "/admin/comments",
    icon: MessageCircle,
    adminOnly: false,
  },
  {
    title: "媒體中心",
    href: "/admin/media",
    icon: Image,
    adminOnly: false,
  },
  {
    title: "學員管理",
    href: "/admin/users",
    icon: Users,
    adminOnly: false,
  },
  {
    title: "優惠券",
    href: "/admin/coupons",
    icon: Ticket,
    adminOnly: true,
  },
  {
    title: "訂單管理",
    href: "/admin/orders",
    icon: ShoppingCart,
    adminOnly: false,
  },
  {
    title: "銷售分析",
    href: "/admin/analytics",
    icon: BarChart3,
    adminOnly: false,
  },
  {
    title: "系統設定",
    href: "/admin/settings",
    icon: Settings,
    adminOnly: true,
  },
];

interface SidebarProps {
  className?: string;
  userRole?: string;
}

export function Sidebar({ className, userRole }: SidebarProps) {
  const pathname = usePathname();
  const { isCollapsed, isHoverExpanded, setHoverExpanded } = useSidebar();
  const { theme, toggleTheme } = useAdminTheme();
  const { siteName, brandSubtitle } = usePublicSiteSettings();

  // 計算實際顯示狀態：折疊且未 hover 時才真正折疊
  const isActuallyCollapsed = isCollapsed && !isHoverExpanded;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "relative flex flex-col bg-card border-r border-border transition-all duration-300 ease-in-out",
          isActuallyCollapsed ? "w-16" : "w-64",
          className
        )}
        onMouseEnter={() => {
          if (isCollapsed) {
            setHoverExpanded(true);
          }
        }}
        onMouseLeave={() => {
          if (isCollapsed) {
            setHoverExpanded(false);
          }
        }}
      >
        {/* Hover 展開時的 overlay 背景 */}
        {isCollapsed && isHoverExpanded && (
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setHoverExpanded(false)}
          />
        )}

        {/* Sidebar 內容 - hover 時使用 fixed positioning */}
        <div
          className={cn(
            "flex flex-col h-full bg-card",
            isCollapsed && isHoverExpanded
              ? "fixed left-0 top-0 w-64 z-50 shadow-xl border-r border-border"
              : ""
          )}
        >
          {/* Logo */}
          <div
            className={cn(
              "flex items-center h-16 border-b border-border transition-all duration-300",
              isActuallyCollapsed ? "px-3 justify-center" : "px-6"
            )}
          >
            <Link href="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#C41E3A] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <span
                className={cn(
                  "font-semibold text-foreground transition-all duration-300 whitespace-nowrap",
                  isActuallyCollapsed
                    ? "opacity-0 w-0 overflow-hidden"
                    : "opacity-100"
                )}
              >
                {siteName}
              </span>
            </Link>
          </div>

          {/* 導覽選單 */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {sidebarItems.filter((item) => !item.adminOnly || userRole === 'ADMIN').map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));

              const linkContent = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
                    isActuallyCollapsed
                      ? "px-2.5 py-2.5 justify-center"
                      : "px-3 py-2.5",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <AnimatePresence>
                    {!isActuallyCollapsed ? (
                      <motion.span
                        key={item.title}
                        initial={{ opacity: 0, width: 0, height: 0 }}
                        animate={{ opacity: 1, width: "auto", height: "auto" }}
                        exit={{ opacity: 0, width: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="whitespace-nowrap overflow-hidden"
                      >
                        {item.title}
                      </motion.span>
                    ) : (
                      <></>
                    )}
                  </AnimatePresence>
                </Link>
              );

              // 折疊時顯示 Tooltip
              if (isActuallyCollapsed) {
                return linkContent;
              }

              return linkContent;
            })}
          </nav>

          {/* 底部：主題切換 + 版本資訊 */}
          <div
            className={cn(
              "py-4 border-t border-border transition-all duration-300",
              isActuallyCollapsed ? "px-3" : "px-6"
            )}
          >
            <div className={cn(
              "flex items-center mb-3",
              isActuallyCollapsed ? "justify-center" : ""
            )}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    aria-label={theme === 'light' ? '切換至深色模式' : '切換至淺色模式'}
                  >
                    {theme === 'light' ? (
                      <Moon className="h-4 w-4" />
                    ) : (
                      <Sun className="h-4 w-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {theme === 'light' ? '深色模式' : '淺色模式'}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

export { sidebarItems };
