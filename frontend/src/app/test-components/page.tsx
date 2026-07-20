"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Search, Mail, Plus, Loader2 } from "lucide-react";

function InputField({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  const generatedId = React.useId();
  const errorId = `${generatedId}-error`;

  // Inject id and aria-describedby into the direct child so the <label htmlFor>
  // and the error message are both programmatically linked to the input.
  const enhancedChild =
    React.isValidElement(children)
      ? React.cloneElement(
          children as React.ReactElement<React.HTMLAttributes<HTMLElement> & { id?: string }>,
          {
            id: (children as React.ReactElement<{ id?: string }>).props.id ?? generatedId,
            ...(error
              ? { "aria-invalid": "true" as const, "aria-describedby": errorId }
              : {}),
          },
        )
      : children;

  return (
    <div className="space-y-2">
      <label htmlFor={generatedId} className="text-sm font-medium text-foreground">{label}</label>
      {enhancedChild}
      {error ? (
        <p id={errorId} className="text-xs text-destructive" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function ComponentTestPage() {
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState<boolean | "indeterminate">(false);

  const handleLoadingDemo = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <Toaster />
      <div className="max-w-6xl mx-auto space-y-12">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">UI Component Library</h1>
          <p className="text-muted-foreground">shadcn/ui components customized for Paymesh</p>
        </div>

        {/* Button Component */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">Button Component</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-3">Variants</h3>
              <div className="flex flex-wrap gap-3">
                <Button>Default Button</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="outline">Outline Button</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-foreground mb-3">Sizes</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="default">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-foreground mb-3">States</h3>
              <div className="flex flex-wrap gap-3">
                <Button disabled>Disabled</Button>
                <Button disabled={loading} onClick={handleLoadingDemo}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {loading ? "Loading..." : "Click to Load"}
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-foreground mb-3">With Icons</h3>
              <div className="flex flex-wrap gap-3">
                <Button>
                  <Plus className="h-4 w-4" />
                  Create New
                </Button>
                <Button>
                  Send Email
                  <Mail className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Input Component */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">Input Component</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
            <InputField label="Name">
              <Input placeholder="Enter your name" />
            </InputField>
            <InputField label="Email">
              <Input type="email" placeholder="your@email.com" />
            </InputField>
            <InputField label="Password">
              <Input type="password" placeholder="Enter password" />
            </InputField>
            <div className="space-y-2">
              <label htmlFor="demo-icon-input" className="text-sm font-medium text-foreground">With Icon</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="demo-icon-input" className="pl-9" placeholder="Search..." />
              </div>
            </div>
            <InputField label="Error State" error="This field is required">
              <Input aria-invalid placeholder="Invalid input" />
            </InputField>
            <InputField label="Disabled">
              <Input disabled placeholder="Disabled input" />
            </InputField>
          </div>
        </section>

        {/* Checkbox Component */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">Checkbox Component</h2>
          
          <div className="space-y-4 max-w-md">
            <Checkbox label="Accept terms and conditions" />
            <Checkbox checked={checked} onCheckedChange={setChecked} label="Controlled checkbox" />
            <Checkbox checked="indeterminate" label="Indeterminate state" />
            <Checkbox disabled label="Disabled checkbox" />
            <Checkbox error="You must accept to continue" label="With error" />
          </div>
        </section>

        {/* Tooltip Component */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">Tooltip Component</h2>
          
          <div className="flex flex-wrap gap-6">
            <Tooltip content="This appears on top" side="top">
              <Button variant="secondary">Top Tooltip</Button>
            </Tooltip>
            <Tooltip content="This appears on the right" side="right">
              <Button variant="secondary">Right Tooltip</Button>
            </Tooltip>
            <Tooltip content="This appears on the bottom" side="bottom">
              <Button variant="secondary">Bottom Tooltip</Button>
            </Tooltip>
            <Tooltip content="This appears on the left" side="left">
              <Button variant="secondary">Left Tooltip</Button>
            </Tooltip>
          </div>
        </section>

        {/* Toast Component */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">Toast Component</h2>
          
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() =>
                toast({
                  variant: "success",
                  title: "Success!",
                  description: "Your operation completed successfully.",
                })
              }
            >
              Show Success Toast
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast({
                  variant: "error",
                  title: "Error",
                  description: "Something went wrong. Please try again.",
                })
              }
            >
              Show Error Toast
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast({
                  variant: "warning",
                  title: "Warning",
                  description: "Please review your input before continuing.",
                })
              }
            >
              Show Warning Toast
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast({
                  variant: "info",
                  title: "Information",
                  description: "Did you know you can customize this component?",
                })
              }
            >
              Show Info Toast
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
