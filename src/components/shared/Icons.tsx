import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 16, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  );
}

export function LockIcon(p: IconProps) {
  return <Icon {...p}><rect x="3" y="7" width="10" height="8" rx="1.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></Icon>;
}
export function UnlockIcon(p: IconProps) {
  return <Icon {...p}><rect x="3" y="7" width="10" height="8" rx="1.5"/><path d="M5 7V5a3 3 0 0 1 5.83-1"/></Icon>;
}
export function BoltIcon(p: IconProps) {
  return <Icon {...p}><path d="M9 2 4 9h5l-2 5 5-7H7z"/></Icon>;
}
export function PlusIcon(p: IconProps) {
  return <Icon {...p}><path d="M8 3v10M3 8h10"/></Icon>;
}
export function ChevronRightIcon(p: IconProps) {
  return <Icon {...p}><path d="M6 3l5 5-5 5"/></Icon>;
}
export function ChevronDownIcon(p: IconProps) {
  return <Icon {...p}><path d="M3 6l5 5 5-5"/></Icon>;
}
export function FlameIcon(p: IconProps) {
  return <Icon {...p}><path d="M8 14c-3.314 0-5-1.686-5-4 0-2 1.5-3.5 3-4.5-.5 1 0 2 1 2.5C7.5 5 9 2 10 1c0 2 1 3 2 4.5.5.5 1 1 1 2.5 0 3.314-1.686 4-5 6z"/></Icon>;
}
export function BellIcon(p: IconProps) {
  return <Icon {...p}><path d="M8 2a5 5 0 0 1 5 5v2.5l1 1.5H2l1-1.5V7a5 5 0 0 1 5-5z"/><path d="M6 13a2 2 0 0 0 4 0"/></Icon>;
}
export function TrophyIcon(p: IconProps) {
  return <Icon {...p}><path d="M4 2h8v5a4 4 0 0 1-8 0V2z"/><path d="M2 4H4M12 4h2"/><path d="M8 11v3"/><path d="M5 14h6"/></Icon>;
}
export function ClockIcon(p: IconProps) {
  return <Icon {...p}><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/></Icon>;
}
export function CloseIcon(p: IconProps) {
  return <Icon {...p}><path d="M4 4l8 8M12 4l-8 8"/></Icon>;
}
export function WarnIcon(p: IconProps) {
  return <Icon {...p}><path d="M8 2 1 14h14L8 2z"/><path d="M8 7v3"/><circle cx="8" cy="12" r=".5" fill="currentColor"/></Icon>;
}
export function SearchIcon(p: IconProps) {
  return <Icon {...p}><circle cx="7" cy="7" r="4"/><path d="M11 11l3 3"/></Icon>;
}
export function SwapIcon(p: IconProps) {
  return <Icon {...p}><path d="M3 5h10M3 5l3-3M3 5l3 3"/><path d="M13 11H3M13 11l-3 3M13 11l-3-3"/></Icon>;
}
export function MenuIcon(p: IconProps) {
  return <Icon {...p}><path d="M2 5h12M2 8h12M2 11h12"/></Icon>;
}
export function UserIcon(p: IconProps) {
  return <Icon {...p}><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5"/></Icon>;
}
export function ChevronLeftIcon(p: IconProps) {
  return <Icon {...p}><path d="M10 3L5 8l5 5"/></Icon>;
}
export function SettingsIcon(p: IconProps) {
  return <Icon {...p}><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/></Icon>;
}
export function ShieldIcon(p: IconProps) {
  return <Icon {...p}><path d="M8 2L3 4v4c0 3 2.5 5.5 5 6 2.5-.5 5-3 5-6V4L8 2z"/></Icon>;
}
export function UsersIcon(p: IconProps) {
  return <Icon {...p}><circle cx="6" cy="5" r="2.5"/><path d="M1 13c0-2.761 2.239-4 5-4"/><circle cx="11" cy="6" r="2"/><path d="M9 14c0-2.209 1.343-3.5 3-3.5s3 1.291 3 3.5"/></Icon>;
}
export function ShareIcon(p: IconProps) {
  return <Icon {...p}><path d="M10 2l4 4-4 4"/><path d="M14 6H6a4 4 0 0 0-4 4v2"/></Icon>;
}
