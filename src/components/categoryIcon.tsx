import {
  Apple,
  Carrot,
  Milk,
  Fish,
  Croissant,
  Wheat,
  Snowflake,
  CupSoda,
  Cookie,
  EggFried,
  SprayCan,
  HeartPulse,
  Baby,
  PawPrint,
  Package,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* Maps category `icon` names (data/categories.ts) to concrete lucide icons.
   Explicit map keeps tree-shaking and type-safety vs. dynamic lookup. */
const ICONS: Record<string, LucideIcon> = {
  Apple,
  Carrot,
  Milk,
  Fish,
  Croissant,
  Wheat,
  Snowflake,
  CupSoda,
  Cookie,
  EggFried,
  SprayCan,
  HeartPulse,
  Baby,
  PawPrint,
  Package,
};

export function CategoryIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Icon = ICONS[name] ?? Package;
  return <Icon size={size} />;
}
