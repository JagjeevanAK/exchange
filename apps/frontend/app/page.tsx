'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/desk');
    }
  }, [isAuthenticated, isLoading, router]);

  if (!mounted || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-32 h-12 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  // Determine which logo to use based on the current theme
  const logoSrc = resolvedTheme === 'dark' ? '/dark-logo.svg' : '/light-logo.svg';

  return (
    <div className=" flex justify-center items-center h-screen flex-col">
      <Image src={logoSrc} alt="FutureX logo" width={350} height={50} priority />
      <div className="p-6">
        Please sign in or register for full access to FutureX content and services.
      </div>
      <div className="flex flex-col mt-8 gap-4">
        <Button
          variant="default"
          size="lg"
          className="w-50 rounded-sm text-md"
          onClick={() => router.push('/signin')}
        >
          Sign in
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-50 rounded-sm text-md"
          onClick={() => router.push('/signup')}
        >
          Register
        </Button>
      </div>
    </div>
  );
}
