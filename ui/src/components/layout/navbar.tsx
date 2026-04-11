import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full z-[100] border-b border-[#222] bg-[#040404]/80 backdrop-blur-md">
      <div className="container md:ml-24 px-6 lg:px-24 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white hover:text-accent transition-colors">
          <ShieldAlert className="w-5 h-5 text-accent" />
          <span className="font-bold tracking-widest text-sm uppercase">AI BOUNCER</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-widest text-[#888]">
          <Link href="/scanner" className="hover:text-accent transition-colors">
            Scanner
          </Link>
          <Link href="/red-team" className="hover:text-accent transition-colors">
            Red Team
          </Link>
          <Link href="/vibe-check" className="hover:text-accent transition-colors">
            Vibe-Check
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            href="/scanner" 
            className="px-6 py-2.5 bg-accent text-black font-bold text-xs uppercase tracking-widest rounded-full hover:bg-[#ff7841] transition-colors"
          >
            Launch Setup
          </Link>
        </div>
      </div>
    </nav>
  );
}
