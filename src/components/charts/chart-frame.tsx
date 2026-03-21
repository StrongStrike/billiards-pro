"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export function ChartFrame({
  height,
  className,
  children,
}: {
  height: number;
  className?: string;
  children: (size: { width: number; height: number }) => React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const update = () => {
      const nextWidth = Math.floor(node.getBoundingClientRect().width);
      if (nextWidth > 0) {
        setWidth(nextWidth);
      }
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("w-full", className)} style={{ height }}>
      {width > 0 ? children({ width, height }) : null}
    </div>
  );
}
