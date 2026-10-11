"use client";
import { useState } from "react";
import { Button, Card, Field, Badge, Tabs, RatingMeter, SignalPill, Skeleton } from "@/components/ui";

export default function DesignPage() {
  const [tab, setTab] = useState("a");
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-6">
      <h1 className="text-2xl font-bold">Design system</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm">sm</Button>
          <Button size="md">md</Button>
          <Button size="lg">lg</Button>
        </div>
      </section>

      <section className="flex max-w-sm flex-col gap-3">
        <h2 className="text-lg font-semibold">Fields</h2>
        <Field label="Email" placeholder="you@example.com" />
        <Field label="Password" type="password" error="At least 8 characters." />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Badges &amp; signals</h2>
        <div className="flex gap-2"><Badge>muted</Badge><Badge tone="accent">accent</Badge><SignalPill signal="buy" /><SignalPill signal="sell" /><SignalPill signal="hold" /></div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Rating meter</h2>
        <RatingMeter rating={82} golden />
        <RatingMeter rating={34} />
        <RatingMeter rating={-57} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Tabs</h2>
        <Tabs tabs={[{ id: "a", label: "Bullish" }, { id: "b", label: "Bearish" }]} value={tab} onChange={setTab} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Skeleton</h2>
        <Skeleton className="h-6 w-full" />
        <Card className="p-4">Card surface</Card>
      </section>
    </div>
  );
}
