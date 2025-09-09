'use client';
import { useEffect, useState } from 'react';

export default function DelayedReveal({
  delayMs = 2000,
  children,
}: {
  delayMs?: number;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(id);
  }, [delayMs]);

  if (!visible) return null;
  return <>{children}</>;
}