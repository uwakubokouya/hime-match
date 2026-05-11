"use client";
import { useUser } from "@/providers/UserProvider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from 'next/link';
import { Lock, ArrowRight, UserPlus, ArrowLeft } from 'lucide-react';
import LoginModal from "@/components/auth/LoginModal";

const protectedRoutes = ['/mypage/settings', '/mypage/system-settings', '/mypage/notifications', '/reserve'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isMounted, isLoading, logout } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthRoute = pathname === '/login' || pathname === '/register';
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  useEffect(() => {
    if (!isMounted || isLoading) return;
    
    if (user && isAuthRoute) {
      router.replace('/');
    }
  }, [user, isMounted, isLoading, router, pathname, isProtectedRoute, isAuthRoute]);

  if (!isMounted || (isProtectedRoute && isLoading)) {
    return <div className="min-h-screen bg-white flex items-center justify-center"></div>;
  }

  if (isProtectedRoute && !user) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('authRedirect', pathname);
    }
    
    return (
      <>
        <div className="pointer-events-none select-none filter blur-[3px] opacity-70 transition-all duration-500">
          {children}
        </div>
        <LoginModal 
          onClose={() => router.back()} 
          isDismissible={false} 
          hideCloseButton={false}
        />
      </>
    );
  }

  return <>{children}</>;
}
