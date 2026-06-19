import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketingShell } from "@/components/cs/marketing-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Loader2, ShieldCheck, Save, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  PolicyBody,
  type PolicyRow,
  type PolicySlug,
} from "@/components/cs/policy";

export const Route = createFileRoute("/_authenticated/admin-policies")({
  head: () => ({
    meta: [
      { title: "Edit site policies — Admin | CareerSignal" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPoliciesPage,
});

const SLUGS: PolicySlug[] = ["copyright", "terms", "privacy"];

function AdminPoliciesPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        if (!cancelled) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }
      const { data: roleData } = await supabase.rpc("has_role", {
        _user_id: uid,
        _role: "admin",
      });
      const { data: rows } = await supabase
        .from("site_policies")
        .select("slug,title,body,updated_at")
        .in("slug", SLUGS);
      if (cancelled) return;
      setIsAdmin(!!roleData);
      setPolicies((rows as PolicyRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <MarketingShell>
        <div className="mx-auto max-w-4xl px-4 py-24 sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading admin tools…
          </div>
        </div>
      </MarketingShell>
    );
  }

  if (!isAdmin) {
    return (
      <MarketingShell>
        <section className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
            Admin access required
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your account doesn't have permission to edit site policies. Contact
            an administrator if you believe this is a mistake.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/">Back to home</Link>
          </Button>
        </section>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Pencil className="h-4 w-4" />
          Admin · Site policies
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Edit site policies
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Update the Copyright, Terms of Service, and Privacy Policy copy.
          Changes go live immediately — no redeploy required. Markdown is
          supported (headings, lists, links, bold).
        </p>

        <Tabs defaultValue="copyright" className="mt-8">
          <TabsList>
            {SLUGS.map((s) => (
              <TabsTrigger key={s} value={s} className="capitalize">
                {s}
              </TabsTrigger>
            ))}
          </TabsList>
          {SLUGS.map((slug) => {
            const row = policies.find((p) => p.slug === slug);
            return (
              <TabsContent key={slug} value={slug} className="mt-6">
                {row ? (
                  <PolicyEditor
                    initial={row}
                    onSaved={(updated) =>
                      setPolicies((prev) =>
                        prev.map((p) => (p.slug === updated.slug ? updated : p)),
                      )
                    }
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No row found for "{slug}".
                  </p>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </section>
    </MarketingShell>
  );
}

function PolicyEditor({
  initial,
  onSaved,
}: {
  initial: PolicyRow;
  onSaved: (row: PolicyRow) => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [saving, setSaving] = useState(false);

  const dirty = title !== initial.title || body !== initial.body;

  const onSave = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("site_policies")
      .update({
        title: title.trim(),
        body,
        updated_by: userData.user?.id ?? null,
      })
      .eq("slug", initial.slug)
      .select("slug,title,body,updated_at")
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${initial.slug} policy saved`);
    onSaved(data as PolicyRow);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${initial.slug}-title`}>Title</Label>
          <Input
            id={`${initial.slug}-title`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
        </div>

        <Tabs defaultValue="edit">
          <TabsList>
            <TabsTrigger value="edit">
              <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="mr-1 h-3.5 w-3.5" /> Preview
            </TabsTrigger>
          </TabsList>
          <TabsContent value="edit" className="mt-3">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={20}
              className="font-mono text-sm"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {body.length} characters · Markdown supported.
            </p>
          </TabsContent>
          <TabsContent value="preview" className="mt-3">
            <div className="rounded-lg border border-border bg-background p-5">
              <PolicyBody body={body} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {dirty ? "Unsaved changes" : "All changes saved"}
        </p>
        <Button onClick={onSave} disabled={saving || !dirty}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save policy
        </Button>
      </div>
    </div>
  );
}
