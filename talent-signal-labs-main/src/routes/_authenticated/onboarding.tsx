import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ArrowLeft,
  Signal,
  Upload,
  Sparkles,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { completeOnboarding } from "@/lib/cv.functions";
import { usePaywall, parsePaywallError } from "@/components/cs/paywall-modal";

import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Get started — CareerSignal" }] }),
  component: OnboardingPage,
});

const GOALS = [
  { id: "new-role", label: "Land a new role", hint: "Active search, ready to apply." },
  { id: "explore", label: "Explore the market", hint: "See where you stand." },
  { id: "level-up", label: "Level up my CV", hint: "Improve before applying." },
  { id: "switch", label: "Switch industry / function", hint: "Pivot to something new." },
];

const MARKETS = ["Germany", "UK", "Netherlands", "Spain", "Portugal", "UAE", "Saudi Arabia", "Remote (EU)", "Remote (Global)"];
const WORK_MODES = ["Remote", "Hybrid", "Onsite"];
const SENIORITY = ["Junior", "Mid", "Senior", "Staff", "Manager", "Director"];

const STEPS = ["Goal", "CV", "Target role", "Markets", "Preferences", "Analyzing", "Done"] as const;

function OnboardingPage() {
  const navigate = useNavigate();
  const submit = useServerFn(completeOnboarding);
  const paywall = usePaywall();


  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<string>("");
  const [cvText, setCvText] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [storagePath, setStoragePath] = useState<string | undefined>();
  const [targetRole, setTargetRole] = useState("");
  const [seniority, setSeniority] = useState("Senior");
  const [markets, setMarkets] = useState<string[]>([]);
  const [workModes, setWorkModes] = useState<string[]>(["Remote", "Hybrid"]);
  const [needsVisa, setNeedsVisa] = useState(false);
  const [minSalary, setMinSalary] = useState<string>("");
  const [currency, setCurrency] = useState("EUR");
  const [notice, setNotice] = useState("1 month");
  const [submitting, setSubmitting] = useState(false);

  const progress = useMemo(() => Math.round((step / (STEPS.length - 1)) * 100), [step]);

  function toggle<T extends string>(arr: T[], val: T, setter: (v: T[]) => void) {
    setter(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  }

  async function handleFile(file: File) {
    setCvFile(file);
    setUploading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not signed in");
      const path = `${user.user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("cvs").upload(path, file, { upsert: false });
      if (error) throw error;
      setStoragePath(path);
      // If it's a plain text file, also read its content
      if (file.type.startsWith("text/") || /\.(txt|md)$/i.test(file.name)) {
        const txt = await file.text();
        setCvText(txt);
      } else if (!cvText) {
        toast.info("File uploaded. Please also paste your CV text below so AI can analyze it.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function run() {
    if (!targetRole || !goal || cvText.length < 50 || markets.length === 0) {
      toast.error("Please complete every step");
      return;
    }
    setStep(5);
    setSubmitting(true);
    try {
      await submit({
        data: {
          goal,
          cvText,
          cvFileName: cvFile?.name,
          storagePath,
          targetRole,
          targetSeniority: seniority,
          markets,
          workModes,
          needsVisa,
          minSalary: minSalary ? Number(minSalary) : undefined,
          salaryCurrency: currency,
          noticePeriod: notice,
        },
      });
      setStep(6);
    } catch (e) {
      const pw = parsePaywallError(e);
      if (pw) { paywall.open(pw); setStep(4); }
      else { toast.error(e instanceof Error ? e.message : "Something went wrong"); setStep(4); }

    } finally {
      setSubmitting(false);
    }
  }

  const canNext =
    (step === 0 && goal) ||
    (step === 1 && cvText.length >= 50) ||
    (step === 2 && targetRole.trim().length > 1) ||
    (step === 3 && markets.length > 0) ||
    step === 4;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Signal className="h-4 w-4" strokeWidth={2.5} />
            </span>
            CareerSignal
          </div>
          <div className="text-xs font-medium text-muted-foreground">
            Step {Math.min(step + 1, STEPS.length)} of {STEPS.length}
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {step === 0 && (
          <StepShell title="What brings you here?" subtitle="We'll tailor the experience to your goal.">
            <div className="grid gap-3 sm:grid-cols-2">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={cn(
                    "rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-sm",
                    goal === g.id ? "border-primary ring-2 ring-primary/20" : "border-border",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{g.label}</span>
                    {goal === g.id && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{g.hint}</p>
                </button>
              ))}
            </div>
          </StepShell>
        )}

        {step === 1 && (
          <StepShell title="Upload or paste your CV" subtitle="We'll parse it with AI and score it instantly. Your file stays private.">
            <Card className="flex flex-col items-center justify-center gap-2 border-dashed p-8 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">
                <Upload className="h-5 w-5" />
              </div>
              <Label htmlFor="cv-file" className="cursor-pointer text-sm font-medium text-primary">
                {uploading ? "Uploading…" : cvFile ? cvFile.name : "Choose a PDF, DOCX or TXT"}
              </Label>
              <input
                id="cv-file"
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <p className="text-xs text-muted-foreground">Stored encrypted in Lovable Cloud · max 10MB</p>
            </Card>
            <div className="mt-4">
              <Label htmlFor="cv-text" className="mb-1.5 block">Or paste your CV text</Label>
              <Textarea
                id="cv-text"
                rows={10}
                placeholder="Paste your full CV content here — experience, skills, education…"
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">{cvText.length} characters · need at least 50 to analyze</p>
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title="What role are you targeting?" subtitle="Be specific. We'll score every job against this target.">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="role">Target role</Label>
                <Input
                  id="role"
                  placeholder="e.g. Senior AI Engineer"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Seniority</Label>
                <div className="flex flex-wrap gap-2">
                  {SENIORITY.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSeniority(s)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm transition-colors",
                        seniority === s
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:bg-accent",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell title="Which markets are you open to?" subtitle="Pick all that apply. We'll prioritize jobs accordingly.">
            <div className="flex flex-wrap gap-2">
              {MARKETS.map((m) => {
                const on = markets.includes(m);
                return (
                  <button
                    key={m}
                    onClick={() => toggle(markets, m, setMarkets)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-accent",
                    )}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex items-center justify-between rounded-lg border border-border bg-card p-4">
              <div>
                <div className="text-sm font-medium">I need visa sponsorship</div>
                <div className="text-xs text-muted-foreground">We'll surface visa-friendly roles.</div>
              </div>
              <Switch checked={needsVisa} onCheckedChange={setNeedsVisa} />
            </div>
          </StepShell>
        )}

        {step === 4 && (
          <StepShell title="Final preferences" subtitle="Tune your matches. You can change all of this later.">
            <div className="grid gap-4">
              <div>
                <Label className="mb-1.5 block">Work mode</Label>
                <div className="flex flex-wrap gap-2">
                  {WORK_MODES.map((m) => (
                    <button
                      key={m}
                      onClick={() => toggle(workModes, m, setWorkModes)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm transition-colors",
                        workModes.includes(m)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:bg-accent",
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="sal">Min salary (optional)</Label>
                  <Input id="sal" type="number" placeholder="60000" value={minSalary} onChange={(e) => setMinSalary(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="cur">Currency</Label>
                  <Input id="cur" value={currency} onChange={(e) => setCurrency(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="notice">Notice period</Label>
                <Input id="notice" value={notice} onChange={(e) => setNotice(e.target.value)} />
              </div>
            </div>
          </StepShell>
        )}

        {step === 5 && (
          <StepShell title="Analyzing your CV…" subtitle="This usually takes 10–20 seconds.">
            <Card className="flex flex-col items-center gap-3 p-10 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Parsing experience & skills</p>
                <p className="text-sm text-muted-foreground">Scoring across 8 dimensions</p>
                <p className="text-sm text-muted-foreground">Matching to {markets.join(", ")}</p>
              </div>
            </Card>
          </StepShell>
        )}

        {step === 6 && (
          <StepShell title="You're all set." subtitle="Your dashboard is ready with your first results.">
            <Card className="flex flex-col items-center gap-4 p-10 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                <Sparkles className="h-7 w-7" />
              </div>
              <div>
                <p className="text-base font-semibold">First analysis complete</p>
                <p className="mt-1 text-sm text-muted-foreground">Open your dashboard to see your CV score, top job matches, and next best actions.</p>
              </div>
              <Button size="lg" onClick={() => navigate({ to: "/app" })}>
                Open dashboard <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Card>
          </StepShell>
        )}

        {step < 5 && (
          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            {step < 4 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                Continue <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={run} disabled={submitting}>
                Analyze my CV <Sparkles className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {step >= 1 && step <= 4 && goal && (
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">Goal: {GOALS.find((g) => g.id === goal)?.label}</Badge>
            {targetRole && <Badge variant="outline">{targetRole} · {seniority}</Badge>}
            {markets.length > 0 && <Badge variant="outline">{markets.length} markets</Badge>}
          </div>
        )}
      </main>
    </div>
  );
}

function StepShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
