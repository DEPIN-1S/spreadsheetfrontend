import { useState } from "react";

export default function SheetImage({ src, className, alt = "", compact = false }) {
    const [missing, setMissing] = useState(false);

    if (!src || missing) {
        return (
            <div
                className={
                    compact
                        ? "h-8 w-14 flex items-center justify-center rounded border border-red-100 bg-red-50 text-[9px] leading-tight text-red-400 text-center px-0.5"
                        : "absolute inset-0 flex items-center justify-center bg-gray-100 text-xs italic text-red-400"
                }
            >
                File missing
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            loading="lazy"
            onError={() => setMissing(true)}
        />
    );
}
