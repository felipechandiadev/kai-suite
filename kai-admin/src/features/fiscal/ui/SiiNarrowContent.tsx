import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function SiiNarrowContent({ children }: Props) {
  return <div className="mx-auto w-full max-w-4xl">{children}</div>;
}
