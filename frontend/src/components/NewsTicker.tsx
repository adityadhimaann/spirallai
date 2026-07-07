import { motion } from "framer-motion";

const TICKER_ITEMS = [
  "NVIDIA reaches $3T market cap amid AI boom",
  "Federal Reserve holds interest rates steady",
  "Apple announces new AI features for iOS 18",
  "Tesla shares surge on delivery numbers",
  "Bitcoin surpasses $70,000 mark again",
  "Microsoft expands partnership with OpenAI",
  "Amazon reports record prime day sales",
  "S&P 500 hits new all-time high"
];

export function NewsTicker() {
  return (
    <div className="w-full overflow-hidden border-b border-border/40 bg-background/50 backdrop-blur py-2 flex items-center absolute top-16 z-10 hidden md:flex">
      <div className="flex whitespace-nowrap px-4 text-xs font-medium tracking-wide text-muted-foreground/80">
        <span className="text-primary mr-4 font-bold">LATEST:</span>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <motion.div
          className="flex whitespace-nowrap gap-12 text-xs text-foreground/70"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 30 }}
        >
          {/* Double the array for seamless infinite scroll */}
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/50"></span>
              {item}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
