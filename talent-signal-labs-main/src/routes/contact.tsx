import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/cs/marketing-shell";
import { Mail, MessageSquare, Building2, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us | CareerSignal" },
      {
        name: "description",
        content:
          "Get in touch with the CareerSignal team for support, sales, or partnership questions.",
      },
      { property: "og:title", content: "Contact CareerSignal" },
      {
        property: "og:description",
        content: "Reach our support, sales, and partnerships teams.",
      },
    ],
  }),
  component: ContactPage,
});

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name must be less than 100 characters" }),
  email: z
    .string()
    .trim()
    .email({ message: "Enter a valid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  topic: z.enum(["support", "sales", "partnerships", "other"], {
    message: "Select a topic",
  }),
  message: z
    .string()
    .trim()
    .min(10, { message: "Message must be at least 10 characters" })
    .max(1000, { message: "Message must be less than 1000 characters" }),
});

type ContactValues = z.infer<typeof contactSchema>;

function ContactPage() {
  const [submitted, setSubmitted] = useState<ContactValues | null>(null);

  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", topic: undefined, message: "" },
    mode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = async (values: ContactValues) => {
    // Simulated send. Replace with a server function or email integration later.
    await new Promise((r) => setTimeout(r, 700));
    setSubmitted(values);
    toast.success("Message sent — we'll be in touch soon.");
    reset();
  };

  const messageLen = watch("message")?.length ?? 0;

  return (
    <MarketingShell>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Contact us
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          We usually reply within one business day. Pick the channel that fits
          your question best, or send a note below.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <ContactCard
            icon={<MessageSquare className="h-5 w-5" />}
            title="Support"
            href="mailto:support@careersignal.app"
            label="support@careersignal.app"
          />
          <ContactCard
            icon={<Building2 className="h-5 w-5" />}
            title="Sales"
            href="mailto:sales@careersignal.app"
            label="sales@careersignal.app"
          />
          <ContactCard
            icon={<Mail className="h-5 w-5" />}
            title="Partnerships"
            href="mailto:hello@careersignal.app"
            label="hello@careersignal.app"
          />
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-8">
          {submitted ? (
            <div className="flex flex-col items-start gap-4">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Thanks, {submitted.name.split(" ")[0]} — message received
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  We've logged your note about{" "}
                  <span className="font-medium text-foreground">
                    {topicLabel(submitted.topic)}
                  </span>
                  . A reply will land at{" "}
                  <span className="font-medium text-foreground">
                    {submitted.email}
                  </span>{" "}
                  within one business day.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setSubmitted(null)}
                className="mt-2"
              >
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  id="name"
                  label="Name"
                  required
                  error={errors.name?.message}
                >
                  <Input
                    id="name"
                    autoComplete="name"
                    aria-invalid={!!errors.name}
                    {...register("name")}
                  />
                </Field>
                <Field
                  id="email"
                  label="Email"
                  required
                  error={errors.email?.message}
                >
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                    {...register("email")}
                  />
                </Field>
              </div>

              <Field id="topic" label="Topic" required error={errors.topic?.message}>
                <Select
                  value={watch("topic")}
                  onValueChange={(v) =>
                    setValue("topic", v as ContactValues["topic"], {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger id="topic" aria-invalid={!!errors.topic}>
                    <SelectValue placeholder="Choose a topic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="partnerships">Partnerships</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field
                id="message"
                label="Message"
                required
                error={errors.message?.message}
                hint={`${messageLen}/1000`}
              >
                <Textarea
                  id="message"
                  rows={6}
                  maxLength={1000}
                  aria-invalid={!!errors.message}
                  {...register("message")}
                />
              </Field>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Send message
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>
    </MarketingShell>
  );
}

function topicLabel(t: ContactValues["topic"]) {
  return {
    support: "support",
    sales: "sales",
    partnerships: "partnerships",
    other: "your inquiry",
  }[t];
}

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function ContactCard({
  icon,
  title,
  href,
  label,
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent"
    >
      <div className="flex items-center gap-2 text-foreground">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="mt-3 text-sm font-medium text-foreground group-hover:text-primary">
        {label}
      </p>
    </a>
  );
}
