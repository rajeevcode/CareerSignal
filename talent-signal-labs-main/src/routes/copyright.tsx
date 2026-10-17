import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/cs/marketing-shell";
import {
  Copyright,
  ShieldCheck,
  Mail,
  Loader2,
  CheckCircle2,
  Scale,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { usePolicy, PolicyBody, PolicyLoading } from "@/components/cs/policy";

export const Route = createFileRoute("/copyright")({
  head: () => ({
    meta: [
      { title: "Copyright & DMCA Policy | CareerSignal" },
      {
        name: "description",
        content:
          "How CareerSignal protects its design and software, our DMCA designated agent, and a DMCA takedown form.",
      },
      { property: "og:title", content: "Copyright & DMCA Policy — CareerSignal" },
      {
        property: "og:description",
        content:
          "Ownership, permitted use, DMCA designated agent details, and a structured takedown form.",
      },
    ],
  }),
  component: CopyrightPage,
});

const dmcaSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full legal name").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  address: z.string().trim().min(5, "Enter a mailing address").max(300),
  rightsHolder: z
    .string()
    .trim()
    .min(2, "Identify the copyright owner")
    .max(200),
  workDescription: z
    .string()
    .trim()
    .min(10, "Describe the copyrighted work")
    .max(1000),
  infringingUrls: z
    .string()
    .trim()
    .min(8, "List at least one URL or location")
    .max(2000),
  additionalInfo: z.string().trim().max(2000).optional().or(z.literal("")),
  goodFaith: z.literal(true, {
    message: "You must confirm the good-faith statement",
  }),
  accuracy: z.literal(true, {
    message: "You must confirm the accuracy statement",
  }),
  signature: z
    .string()
    .trim()
    .min(2, "Type your full name as an electronic signature")
    .max(120),
});

type DmcaValues = z.infer<typeof dmcaSchema>;

function CopyrightPage() {
  const { data: policy, loading } = usePolicy("copyright");
  return (
    <MarketingShell>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Copyright className="h-4 w-4" />
          {policy?.title ?? "Copyright & DMCA Policy"}
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Protecting our design and software
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          This page is maintained by the CareerSignal team to explain how our
          brand, interface, code, and content are protected, and how to submit
          a DMCA takedown notice. It is informational and is not legal advice.
        </p>

        <div className="mt-10 space-y-6">
          <article className="rounded-2xl border border-border bg-card p-6 sm:p-7">
            {loading ? (
              <PolicyLoading />
            ) : policy ? (
              <PolicyBody body={policy.body} />
            ) : (
              <p className="text-sm text-muted-foreground">Policy unavailable.</p>
            )}
          </article>

          <Card
            icon={<Scale className="h-5 w-5" />}
            title="DMCA designated agent"
          >
            <p>
              In accordance with the U.S. Digital Millennium Copyright Act
              (17 U.S.C. § 512), CareerSignal has designated the following
              agent to receive notifications of claimed infringement. Notices
              that do not substantially comply with 17 U.S.C. § 512(c)(3) may
              not be effective.
            </p>
            <dl className="mt-4 grid gap-x-6 gap-y-2 rounded-lg border border-border bg-background p-4 text-sm sm:grid-cols-[140px_1fr]">
              <dt className="font-medium text-foreground">Agent</dt>
              <dd className="text-muted-foreground">
                DMCA Designated Agent, CareerSignal
              </dd>
              <dt className="font-medium text-foreground">Email</dt>
              <dd className="text-muted-foreground">
                <a
                  href="mailto:dmca@careersignal.app"
                  className="text-primary hover:underline"
                >
                  dmca@careersignal.app
                </a>
              </dd>
              <dt className="font-medium text-foreground">Mailing address</dt>
              <dd className="text-muted-foreground">
                CareerSignal — Attn: DMCA Agent
                <br />
                [Street address]
                <br />
                [City, State, ZIP, Country]
              </dd>
              <dt className="font-medium text-foreground">Phone</dt>
              <dd className="text-muted-foreground">[+1 555 000 0000]</dd>
            </dl>
            <p className="mt-3 text-xs">
              Bracketed details are placeholders — replace them with your
              registered agent's information. For maximum legal effect in the
              U.S., also file your designated agent with the U.S. Copyright
              Office at{" "}
              <a
                href="https://dmca.copyright.gov"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                dmca.copyright.gov
              </a>
              .
            </p>
          </Card>

          <Card
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Counter-notice & repeat infringers"
          >
            <p>
              If your content was removed and you believe it was a mistake or
              misidentification, you may submit a counter-notice that includes
              your contact information, identification of the removed material,
              a statement under penalty of perjury that the removal was a
              mistake, and consent to jurisdiction per 17 U.S.C. § 512(g).
              CareerSignal will, in appropriate circumstances, terminate
              accounts of users who are repeat infringers.
            </p>
          </Card>

          <DmcaForm />
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Last updated:{" "}
          {new Date().toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          . This policy may be updated; material changes will be reflected on
          this page. Have a general question?{" "}
          <Link to="/contact" className="text-primary hover:underline">
            Contact us
          </Link>
          .
        </p>
      </section>
    </MarketingShell>
  );
}

function DmcaForm() {
  const [submitted, setSubmitted] = useState<DmcaValues | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DmcaValues>({
    resolver: zodResolver(dmcaSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      address: "",
      rightsHolder: "",
      workDescription: "",
      infringingUrls: "",
      additionalInfo: "",
      goodFaith: false as unknown as true,
      accuracy: false as unknown as true,
      signature: "",
    },
  });

  const onSubmit = async (values: DmcaValues) => {
    await new Promise((r) => setTimeout(r, 700));
    setSubmitted(values);
    toast.success("DMCA notice received — our agent will review shortly.");
    reset();
  };

  if (submitted) {
    return (
      <article className="rounded-2xl border border-border bg-card p-6 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Notice received
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Thank you, {submitted.fullName.split(" ")[0]}. A copy has been
              logged for our DMCA agent. We'll reply to{" "}
              <span className="font-medium text-foreground">
                {submitted.email}
              </span>{" "}
              with next steps.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="mt-5"
          onClick={() => setSubmitted(null)}
        >
          Submit another notice
        </Button>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-6 sm:p-7">
      <div className="flex items-center gap-2 text-foreground">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Mail className="h-5 w-5" />
        </span>
        <h2 className="text-base font-semibold">DMCA takedown form</h2>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Submitting this form sends a notice to our designated agent. A complete
        notice under 17 U.S.C. § 512(c)(3) must include the items below.
        Knowingly materially misrepresenting that material is infringing may
        subject you to liability for damages under 17 U.S.C. § 512(f).
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 space-y-5"
        noValidate
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="fullName" label="Your full legal name" required error={errors.fullName?.message}>
            <Input id="fullName" autoComplete="name" {...register("fullName")} />
          </Field>
          <Field id="email" label="Email" required error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
          </Field>
          <Field id="phone" label="Phone (optional)" error={errors.phone?.message}>
            <Input id="phone" autoComplete="tel" {...register("phone")} />
          </Field>
          <Field
            id="rightsHolder"
            label="Copyright owner"
            required
            error={errors.rightsHolder?.message}
            hint="You, your company, or who you represent"
          >
            <Input id="rightsHolder" {...register("rightsHolder")} />
          </Field>
        </div>

        <Field id="address" label="Mailing address" required error={errors.address?.message}>
          <Textarea id="address" rows={2} autoComplete="street-address" {...register("address")} />
        </Field>

        <Field
          id="workDescription"
          label="Describe the copyrighted work"
          required
          error={errors.workDescription?.message}
          hint="Title, registration number if any, URL to the original, etc."
        >
          <Textarea id="workDescription" rows={4} maxLength={1000} {...register("workDescription")} />
        </Field>

        <Field
          id="infringingUrls"
          label="Location of the infringing material"
          required
          error={errors.infringingUrls?.message}
          hint="Paste the URL(s) on CareerSignal or describe where the material appears, one per line"
        >
          <Textarea
            id="infringingUrls"
            rows={4}
            maxLength={2000}
            placeholder={"https://careersignal.app/...\nhttps://careersignal.app/..."}
            {...register("infringingUrls")}
          />
        </Field>

        <Field
          id="additionalInfo"
          label="Additional information (optional)"
          error={errors.additionalInfo?.message}
        >
          <Textarea id="additionalInfo" rows={3} maxLength={2000} {...register("additionalInfo")} />
        </Field>

        <div className="space-y-3 rounded-lg border border-border bg-background p-4">
          <CheckboxRow
            id="goodFaith"
            checked={!!watch("goodFaith")}
            onChange={(v) => setValue("goodFaith", v as true, { shouldValidate: true })}
            error={errors.goodFaith?.message}
          >
            I have a good-faith belief that the use of the material described
            above is not authorized by the copyright owner, its agent, or the
            law.
          </CheckboxRow>
          <CheckboxRow
            id="accuracy"
            checked={!!watch("accuracy")}
            onChange={(v) => setValue("accuracy", v as true, { shouldValidate: true })}
            error={errors.accuracy?.message}
          >
            The information in this notice is accurate, and under penalty of
            perjury, I am the owner, or authorized to act on behalf of the
            owner, of an exclusive right that is allegedly infringed.
          </CheckboxRow>
        </div>

        <Field
          id="signature"
          label="Electronic signature"
          required
          error={errors.signature?.message}
          hint="Type your full name as your signature"
        >
          <Input id="signature" {...register("signature")} />
        </Field>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit DMCA notice
          </Button>
        </div>
      </form>
    </article>
  );
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
      <div className="flex items-center justify-between gap-3">
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

function CheckboxRow({
  id,
  checked,
  onChange,
  error,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(v) => onChange(v === true)}
          aria-invalid={!!error}
          className="mt-0.5"
        />
        <Label htmlFor={id} className="text-sm font-normal leading-relaxed text-foreground">
          {children}
        </Label>
      </div>
      {error && (
        <p role="alert" className="ml-7 mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-6 sm:p-7">
      <div className="flex items-center gap-2 text-foreground">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </article>
  );
}
