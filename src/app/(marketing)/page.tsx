import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Lock,
  Radar,
  Radio,
  Server,
  ShieldCheck,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col gap-16 py-12 md:py-20">
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <div className="flex flex-col items-center">
          <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1 text-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Phase 2: App Router Architecture Ready
          </Badge>

          <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-6xl dark:text-zinc-50">
            Transform Scattered Customer Reviews Into{" "}
            <span className="bg-gradient-to-r from-zinc-900 via-zinc-600 to-zinc-400 bg-clip-text text-transparent dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-500">
              Actionable Intelligence
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            Ethical multi-channel web scraping powered by Crawl4AI meets OmniRoute LLM intelligence. Continuously discover feedback sources, synthesize customer sentiment, and alert teams on critical product friction.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="gap-2 px-6">
                <span>Explore Live Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/api/health">
              <Button variant="outline" size="lg" className="gap-2">
                <Server className="h-4 w-4" />
                <span>Check API Health</span>
              </Button>
            </Link>
          </div>

          {/* Social Proof / Capability Badges */}
          <div className="mt-12 flex flex-wrap justify-center items-center gap-6 text-xs text-zinc-500 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Multi-Tenant Architecture
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              OmniRoute AI Integration
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              React 19 Server Components
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Strict TypeScript & RLS Ready
            </span>
          </div>
        </div>
      </section>

      {/* Product Workflow / Pillars */}
      <section id="features" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            End-to-End Pipeline
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            How Digital Intelligence Operates
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
                <Radar className="h-5 w-5" />
              </div>
              <CardTitle>1. Continuous Discovery</CardTitle>
              <CardDescription>
                Automated detection of verified company profile pages across public platforms without breaking terms or auth walls.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
              <p>• Google Maps & Places verification</p>
              <p>• Trustpilot, G2, & Capterra monitoring</p>
              <p>• Reddit subreddit community mentions</p>
              <p>• iOS App Store & Google Play reviews</p>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <CardTitle>2. OmniRoute AI Synthesis</CardTitle>
              <CardDescription>
                High-throughput sentiment analysis, thematic clustering, and feature request extraction using OmniRoute.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
              <p>• Schema-validated JSON extraction</p>
              <p>• Root-cause friction identification</p>
              <p>• Competitor comparison benchmarking</p>
              <p>• Trend emergence anomaly detection</p>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
                <Radio className="h-5 w-5" />
              </div>
              <CardTitle>3. Actionable Alerting</CardTitle>
              <CardDescription>
                Real-time trigger system alerting product and engineering teams when review sentiment dips or bugs spike.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
              <p>• Immediate anomaly email/webhook notifications</p>
              <p>• Executive weekly digest generation</p>
              <p>• Direct issue tracking integration</p>
              <p>• Historical sentiment trajectory tracking</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Architecture Showcase: NutriScan Comparison */}
      <section id="architecture" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-900/50 lg:p-12">
          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-4">
              Architectural Standard
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
              Next.js App Router Architecture vs. Single-User Apps
            </h2>
            <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Unlike personal tracking applications (such as NutriScan) where data is single-user and client-driven, CXPulse is an enterprise Multi-Tenant SaaS. In this system:
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2 rounded-lg bg-white p-5 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800">
              <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                <Server className="h-4 w-4 text-indigo-500" />
                <span>Zero-Bundle Server Components</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Data fetching happens close to the database and scraping queues on the server. Zero sensitive API tokens reach the browser.
              </p>
            </div>

            <div className="space-y-2 rounded-lg bg-white p-5 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800">
              <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                <Lock className="h-4 w-4 text-emerald-500" />
                <span>Isolated Route Groups</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                <code>(marketing)</code> and <code>(app)</code> maintain distinct layout boundaries, preventing heavy dashboard scripts from slowing down marketing pages.
              </p>
            </div>

            <div className="space-y-2 rounded-lg bg-white p-5 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800">
              <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                <ShieldCheck className="h-4 w-4 text-blue-500" />
                <span>Tenant Isolation Boundary</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                All requests validate tenant context server-side prior to executing queries or OmniRoute completions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-zinc-900 py-12 px-6 text-white dark:bg-zinc-100 dark:text-zinc-900 sm:py-16 sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to inspect the dashboard shell?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-zinc-300 dark:text-zinc-600 sm:text-base">
            The App Router dashboard structure is loaded with sample metrics, active monitoring channels, and automated alert streams.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" variant="secondary" className="gap-2 font-semibold">
                <span>Open Dashboard View</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
