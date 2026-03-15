"use client";

import Link from "next/link";
import NProgress from "nprogress";
import { useRouter } from "next/navigation";

interface LinkWithProgressProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  replace?: boolean;
}

export default function LinkWithProgress({
  href,
  children,
  className,
  replace,
}: LinkWithProgressProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    NProgress.start();
    if (replace) {
      router.replace(href);
    } else {
      router.push(href);
    }
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}