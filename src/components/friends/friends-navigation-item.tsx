
"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function FriendsNavigationItem() {
  const pathname = usePathname();
  const isActive = pathname === '/chat/friends';

  return (
    <Button
      asChild
      variant={isActive ? "secondary" : "ghost"}
      className={cn(
        "w-full justify-start gap-2 text-sm",
        isActive && "bg-accent text-accent-foreground"
      )}
    >
      <Link href="/chat/friends">
        <Users className="h-5 w-5" />
        Friends
      </Link>
    </Button>
  );
}
