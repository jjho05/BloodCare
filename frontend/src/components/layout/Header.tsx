import { Bell, Cloud, CloudOff } from 'lucide-react';

interface HeaderProps {
  title: string;
  online?: boolean;
  showNotification?: boolean;
}

const Header = ({ title, online, showNotification = true }: HeaderProps) => {
  return (
    <header className="glass-header ios-blur flex items-center justify-between px-6 h-18 w-full sticky top-0 z-40">
      <div className="flex items-center gap-2.5">
        <span className="text-2xl font-black text-primary tracking-tighter">{title}</span>
        {online !== undefined && (
          <div className={`w-2 h-2 rounded-full ${online ? 'bg-success animate-pulse' : 'bg-error'}`} />
        )}
      </div>
      <div className="flex items-center gap-3">
        {online !== undefined && (
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">
            {online ? 'Sincronizado' : 'Offline'}
          </span>
        )}
        {showNotification && (
          <button className="w-11 h-11 rounded-2xl bg-primary/5 flex items-center justify-center text-primary active:scale-90 transition-all">
            <Bell className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
