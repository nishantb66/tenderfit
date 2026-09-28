import Link from 'next/link';
import { Aperture } from 'lucide-react';
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 text-lg font-semibold tracking-[-0.06em] ${light ? 'text-white' : 'text-neutral-950'}`}
    >
      <span
        className={`grid size-8 place-items-center rounded-[10px] ${light ? 'bg-white text-neutral-950' : 'bg-neutral-950 text-white'}`}
      >
        <Aperture size={18} strokeWidth={2.3} />
      </span>
      tenderfit
      <span className="-ml-2 self-start text-[8px] font-bold tracking-normal">
        ®
      </span>
    </Link>
  );
}
