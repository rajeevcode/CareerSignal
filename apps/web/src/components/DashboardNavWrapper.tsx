'use client';

import { DashboardNav as Nav } from '@/components/DashboardNav';

export function DashboardNavWrapper({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}

export { Nav as DashboardNav };
