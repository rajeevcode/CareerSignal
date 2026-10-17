import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Copy, Trash2, FileSignature } from "lucide-react";
import { AppShell } from "@/components/cs/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  generateCoverLetter,
  listCoverLetters,
  deleteCoverLetter,
} from "@/lib/cover-letter.functions";

export const Route = createFileRoute("/_authenticated/cover-letters")({
  head: () => ({ meta: [{ title: "Cover Letters — CareerSignal" }] }),
  component: CoverLettersPage,
  errorComponent: ({ error, reset }) => (
    <AppShell>
      <Card className="p-8 text-center">
        <h2 className="text-lg font-semibold">Couldn't load cover letters</h2>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </Card>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <Card className="p-8 text-center text-sm text-muted-foreground">Not found.</Card>
    </AppShell>
  ),
});

function CoverLettersPage() {
  const qc = useQueryClient();
  const genFn = useServerFn(generateCoverLetter);
  const listFn = useServerFn(listCoverLetters);
  const delFn = useServerFn(deleteCoverLetter);

  const { data: list } = useQuery({ queryKey: ["cover-letters"], queryFn: () => listFn() });

  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jdText, setJdText] = useState("");
  const [tone, setTone] = useState<"concise" | "warm" | "formal" | "enthusiastic">("warm");

  const gen = useMutation({
    mutationFn: () =>
      genFn({
        data: {
          jobTitle: jobTitle.trim() || undefined,
          companyName: companyName.trim() || undefined,
          jdText: jdText.trim() || undefined,
          tone,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cover-letters"] });
      toast.success("Cover letter generated");
      setJdText("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cover-letters"] });
      toast.success("Deleted");
    },
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Cover Letters</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate tailored cover letters from your CV in seconds.
          </p>
        </header>

        <Card className="p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Job title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            <Input placeholder="Company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <Textarea
            className="mt-3"
            rows={6}
            placeholder="Paste the job description for best results…"
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {(["concise", "warm", "formal", "enthusiastic"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`rounded-full border px-3 py-1 text-xs capitalize transition ${
                    tone === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <Button onClick={() => gen.mutate()} disabled={gen.isPending} className="gap-2">
              <Sparkles className="h-4 w-4" /> {gen.isPending ? "Writing..." : "Generate"}
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          {(list ?? []).map((cl) => (
            <Card key={cl.id} className="p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileSignature className="h-4 w-4" />
                  <Badge variant="secondary" className="capitalize">{cl.tone ?? "warm"}</Badge>
                  <span>{new Date(cl.created_at).toLocaleString()}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(cl.content); toast.success("Copied"); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => del.mutate(cl.id)}>
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                </div>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">{cl.content}</pre>
            </Card>
          ))}
          {(!list || list.length === 0) && (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No cover letters yet. Generate your first above.
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
