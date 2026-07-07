import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Check } from "lucide-react";

export type UserProfile = {
  name: string;
  interests: string[];
};

interface Props {
  onComplete: (profile: UserProfile) => void;
}

const AVAILABLE_INTERESTS = [
  "AI & Machine Learning",
  "Healthcare & Biotech",
  "Fintech",
  "SaaS",
  "Crypto & Web3",
  "E-commerce",
  "Consumer Tech",
  "Enterprise Software",
];

export function OnboardingModal({ onComplete }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    // Check local storage
    const stored = localStorage.getItem("spiral_user_profile");
    if (!stored) {
      setIsOpen(true);
    } else {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.name && parsed.interests) {
          onComplete(parsed);
        } else {
          setIsOpen(true);
        }
      } catch {
        setIsOpen(true);
      }
    }
  }, []);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest],
    );
  };

  const handleNext = () => {
    if (name.trim()) setStep(2);
  };

  const handleFinish = () => {
    if (selectedInterests.length > 0) {
      const profile: UserProfile = { name: name.trim(), interests: selectedInterests };
      localStorage.setItem("spiral_user_profile", JSON.stringify(profile));
      setIsOpen(false);
      onComplete(profile);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border/60 bg-card p-8 shadow-2xl"
          >
            {/* Background elements */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-[60px]" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-[60px]" />

            <div className="relative z-10 flex flex-col">
              <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>

              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <h2 className="mb-2 text-3xl font-semibold tracking-tight">Welcome to Spiral</h2>
                  <p className="mb-8 text-muted-foreground">
                    Before we begin researching, what should we call you?
                  </p>

                  <input
                    type="text"
                    autoFocus
                    placeholder="Enter your name..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-lg outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  />

                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={handleNext}
                      disabled={!name.trim()}
                      className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Continue <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <h2 className="mb-2 text-3xl font-semibold tracking-tight">
                    What are you interested in?
                  </h2>
                  <p className="mb-6 text-muted-foreground">
                    Select a few sectors to personalize your research suggestions.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_INTERESTS.map((interest) => {
                      const isSelected = selectedInterests.includes(interest);
                      return (
                        <button
                          key={interest}
                          onClick={() => toggleInterest(interest)}
                          className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(var(--primary),0.2)]"
                              : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                          {interest}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-10 flex justify-between">
                    <button
                      onClick={() => setStep(1)}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleFinish}
                      disabled={selectedInterests.length === 0}
                      className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] cursor-pointer"
                    >
                      Start Researching
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
