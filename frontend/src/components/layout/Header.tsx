import { Bell, Cloud, CloudOff } from 'lucide-react';

interface HeaderProps {
  title: string;
  online?: boolean;
  showNotification?: boolean;
}

const Header = ({ title, online, showNotification = true }: HeaderProps) => {
  return (
    <header className="flex items-center justify-between px-5 h-16 w-full bg-[#121C2B] md:bg-white md:border-b md:border-outline-variant sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <span className="text-[20px] font-bold text-white md:text-primary tracking-tight">{title}</span>
        {online !== undefined &&
          (online ? (
            <Cloud className="w-4 h-4 text-success opacity-50" />
          ) : (
            <CloudOff className="w-4 h-4 text-error" />
          ))}
      </div>
      {showNotification && (
        <button className="w-10 h-10 rounded-full bg-white/10 md:bg-surface-container flex items-center justify-center text-white md:text-on-surface">
          <Bell className="w-5 h-5" />
        </button>
      )}
    </header>
  );
};

export default Header;
