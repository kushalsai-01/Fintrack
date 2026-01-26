import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Target,
  Wallet,
  CreditCard,
  TrendingUp,
  Bell,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  FileText,
  Bot,
  Landmark,
  Scale,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Transactions', href: '/transactions', icon: Receipt },
  { name: 'Budgets', href: '/budgets', icon: Wallet },
  { name: 'Categories', href: '/categories', icon: PieChart },
  { name: 'Goals', href: '/goals', icon: Target },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp },
];

const financeNavItems: NavItem[] = [
  { name: 'Bills', href: '/bills', icon: CreditCard },
  { name: 'Investments', href: '/investments', icon: Landmark },
  { name: 'Debts', href: '/debts', icon: Scale },
];

const toolsNavItems: NavItem[] = [
  { name: 'AI Advisor', href: '/advisor', icon: Bot },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Insights', href: '/insights', icon: Sparkles },
];

export function Sidebar({ collapsed, onCollapse, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.href;
    const Icon = item.icon;

    return (
      <NavLink
        key={item.href}
        to={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground',
          collapsed && 'justify-center px-2'
        )}
        onClick={onMobileClose}
      >
        <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
        {!collapsed && (
          <>
            <span className="flex-1">{item.name}</span>
            {item.badge && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  const renderNavSection = (title: string, items: NavItem[]) => (
    <div className="space-y-1">
      {!collapsed && (
        <h4 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          {title}
        </h4>
      )}
      {items.map(renderNavItem)}
    </div>
  );

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-40 h-screen bg-card border-r border-border transition-all duration-300',
        collapsed ? 'w-20' : 'w-64',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">FinTrack Pro</span>
          </div>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <Wallet className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
        
        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={onMobileClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {renderNavSection('Main', mainNavItems)}
        {renderNavSection('Finance', financeNavItems)}
        {renderNavSection('Tools', toolsNavItems)}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-4 space-y-1">
        {renderNavItem({ name: 'Notifications', href: '/notifications', icon: Bell })}
        {renderNavItem({ name: 'Settings', href: '/settings', icon: Settings })}
        {renderNavItem({ name: 'Help', href: '/help', icon: HelpCircle })}
      </div>

      {/* Collapse button */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute -right-3 top-20 bg-background border border-border rounded-full shadow-md hidden lg:flex"
        onClick={() => onCollapse(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>
    </aside>
  );
}

export default Sidebar;
