import { User } from '@/lib/types';

interface HeaderProps {
  title: string;
  user?: User | null;
}

export default function Header({ title, user }: HeaderProps) {
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <div className="header">
      <div className="header-title">{title}</div>
      <div className="header-user">
        {user && <span>{user.name}</span>}
        <div className="avatar">{initials}</div>
      </div>
    </div>
  );
}
