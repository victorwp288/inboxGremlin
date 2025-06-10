"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User, Settings } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";

export function HeaderAuth() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (loading) {
    return <div className="w-20 h-8 bg-muted animate-pulse rounded"></div>;
  }

  if (user) {
    const initials = user.user_metadata?.full_name
      ? user.user_metadata.full_name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
      : user.email?.charAt(0).toUpperCase() || "U";

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={user.user_metadata?.avatar_url}
                alt={user.user_metadata?.full_name || user.email}
              />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1 leading-none">
              {user.user_metadata?.full_name && (
                <p className="font-medium">{user.user_metadata.full_name}</p>
              )}
              <p className="w-[200px] truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Link href="/login">
        <Button variant="ghost" size="sm">
          Sign in
        </Button>
      </Link>
      <Link href="/signup">
        <Button
          variant="outline"
          size="sm"
          className="border-brand-500 text-brand-600 hover:bg-brand-500 hover:text-white"
        >
          Sign up
        </Button>
      </Link>
    </div>
  );
}
