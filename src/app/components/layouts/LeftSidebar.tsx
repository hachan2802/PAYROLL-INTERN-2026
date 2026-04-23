/* eslint-disable @typescript-eslint/no-unused-vars */
import { Link, useLocation } from 'react-router';
import {
  ListChecks,
  Users,
  ChevronRight,
  Calculator,
  RefreshCw,
  Flower2,
  LayoutDashboard,
  ShieldCheck,
  CreditCard,
  BarChart3,
  Database,
  Settings2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onCloseMobile?: () => void;
  onOpenSettings?: () => void;
}

const navItems = [
  { to: '/timesheet-summary', icon: BarChart3, label: 'Summary' },
  { to: '/config/centers', icon: LayoutDashboard, label: 'Centers Config' },
  { to: '/config/ae', icon: Users, label: 'AE Config' },
];

export function LeftSidebar({
  isCollapsed,
  onToggle,
  onCloseMobile,
  onOpenSettings,
}: SidebarProps) {
  const location = useLocation();

  return (
    <motion.div
      className="relative h-full shrink-0 flex flex-col z-50 bg-transparent w-[80px]"
    >

      {/* Logo Section */}
      <div
        style={{ padding: '12px', marginBottom: '12px' }}
        className="flex items-center justify-center w-full relative z-10 bg-transparent"
      >
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0 border-2 border-border shadow-[2px_2px_0px_rgba(0,0,0,0.1)] relative">
          <Calculator className="w-6 h-6 text-primary-foreground" />
        </div>
        
        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden absolute top-0 right-0 bg-destructive text-white p-1 rounded-bl-lg"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Nav Sections */}
      <div 
        style={{ width: '80px', paddingLeft: '8px', paddingRight: '8px' }}
        className="flex-1 overflow-y-auto custom-scrollbar relative z-10 flex flex-col items-center gap-4 py-4"
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Tooltip key={item.to} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to={item.to}
                  style={{ width: '56px', height: '56px' }}
                  className={`relative flex items-center justify-center rounded-2xl transition-all duration-300 group ${
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/20 ring-1 ring-primary/20'
                      : 'bg-transparent text-slate-500 hover:bg-primary/5 hover:text-primary'
                  }`}
                >
                  <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary'} transition-colors`} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-primary text-white font-bold text-[0.65rem] uppercase px-3 py-1.5 rounded-lg border-none">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Settings at Bottom */}
      <div className="mt-auto p-4 w-full flex flex-col items-center relative z-10 pb-8">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={onOpenSettings}
              style={{ width: '56px', height: '56px' }}
              className="flex items-center justify-center rounded-2xl transition-colors duration-300 text-slate-500 hover:bg-primary/5 hover:text-primary"
            >
              <Settings2 className="w-5 h-5 shrink-0" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-primary text-white font-bold text-[0.65rem] uppercase px-3 py-1.5 rounded-lg border-none">
            Settings
          </TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
  );
}
