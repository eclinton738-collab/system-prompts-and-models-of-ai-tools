"use client";

import Image, { type ImageProps } from "next/image";
import { useDataSaver } from "@/lib/data-saver";

/**
 * Use this instead of next/image everywhere. Lazy-loads, serves AVIF/WebP,
 * and drops to low quality at half the width when Data saver is on.
 */
export function AclImage({ sizes = "100vw", alt, ...props }: ImageProps) {
  const saver = useDataSaver();
  return (
    <Image
      {...props}
      alt={alt}
      quality={saver ? 30 : 70}
      sizes={saver ? `calc(${sizes.split(",").pop()?.trim() ?? "100vw"} / 2)` : sizes}
    />
  );
}
