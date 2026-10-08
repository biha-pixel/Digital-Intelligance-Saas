import {
  MessageSquare,
  Search,
  Filter,
  Star,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MOCK_FEEDBACK = [
  {
    id: "fb_1",
    author: "Elena Rostova",
    source: "Trustpilot",
    rating: 5,
    sentiment: "very_positive",
    sentimentScore: 0.94,
    date: "2 hours ago",
    title: "Outstanding integration speed and customer intelligence",
    content:
      "We hooked CXPulse into our multi-region product stack in under 15 minutes. The automated domain entity mapping instantly identified 300+ legacy Reddit mentions and reviews we had no idea existed.",
    topics: ["Onboarding", "Speed", "Discovery"],
  },
  {
    id: "fb_2",
    author: "Marcus Chen",
    source: "Google Maps (London HQ)",
    rating: 4,
    sentiment: "positive",
    sentimentScore: 0.72,
    date: "5 hours ago",
    title: "Great office location, swift technical support",
    content:
      "Met the engineering team at their Shoreditch hub for a quarterly review. Excellent roadmap insights, though I'd love more granular webhook filters for Slack notifications.",
    topics: ["Support", "Locations", "Alerts"],
  },
  {
    id: "fb_3",
    author: "u/devops_ninja99",
    source: "Reddit (r/SaaS)",
    rating: 2,
    sentiment: "negative",
    sentimentScore: 0.28,
    date: "1 day ago",
    title: "Billing tier confusion on high volume crawls",
    content:
      "The product is solid, but we bumped against the rate limit without clear email warnings beforehand. Had to manually pause our G2 crawler target until the next cycle.",
    topics: ["Billing", "Rate Limits", "Crawling"],
  },
  {
    id: "fb_4",
    author: "Sarah Jenkins",
    source: "G2 Software Reviews",
    rating: 5,
    sentiment: "very_positive",
    sentimentScore: 0.98,
    date: "2 days ago",
    title: "The single source of truth for our executive team",
    content:
      "Executive reporting saves us 6 hours of manual spreadsheet compilation every Monday. The AI sentiment summaries pinpoint exactly why NPS shifted week over week.",
    topics: ["Reports", "Executive", "AI Insights"],
  },
];

const SENTIMENT_CONFIG = {
  very_positive: {
    label: "Very Positive",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  positive: {
    label: "Positive",
    badge: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  },
  neutral: {
    label: "Neutral",
    badge: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
  },
  negative: {
    label: "Negative",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  very_negative: {
    label: "Critical / Negative",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
};

export default function FeedbackPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Unified Feedback Stream
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time feed of multi-channel customer reviews, ratings, and sentiment scores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Cluster Analysis</span>
          </Button>
          <Button size="sm" className="gap-1.5 text-xs bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
            <Filter className="h-3.5 w-3.5" />
            <span>Export Feed</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Ingested Items</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">2,406</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>+14% vs last week</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Average CSAT / Rating</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1 flex items-baseline gap-1">
            <span>4.6</span>
            <span className="text-xs font-normal text-zinc-400">/ 5.0</span>
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Across 4 review channels</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Positive Sentiment Ratio</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">88.4%</div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">OmniRoute NLP classified</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Unresolved Pain Points</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">5 items</div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Flagged for team triage</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="search"
            placeholder="Search keywords, topics, or authors..."
            className="h-9 w-full rounded-md border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-xs outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>

        <div className="flex items-center gap-2">
          <select className="h-9 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 text-xs outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
            <option value="all">All Sources</option>
            <option value="trustpilot">Trustpilot</option>
            <option value="google">Google Maps</option>
            <option value="reddit">Reddit</option>
            <option value="g2">G2 Crowd</option>
          </select>

          <select className="h-9 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 text-xs outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
            <option value="all">All Sentiments</option>
            <option value="positive">Positive (4-5★)</option>
            <option value="neutral">Neutral (3★)</option>
            <option value="negative">Negative (1-2★)</option>
          </select>
        </div>
      </div>

      {/* Feed List */}
      <div className="space-y-3">
        {MOCK_FEEDBACK.map((item) => {
          const sentimentStyle =
            SENTIMENT_CONFIG[item.sentiment as keyof typeof SENTIMENT_CONFIG] ||
            SENTIMENT_CONFIG.neutral;

          return (
            <div
              key={item.id}
              className="p-5 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {item.author.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.author}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Via <span className="font-medium text-zinc-600 dark:text-zinc-300">{item.source}</span> · {item.date}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Rating Stars */}
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < item.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-zinc-200 dark:text-zinc-800"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Sentiment Badge */}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${sentimentStyle.badge}`}
                  >
                    {sentimentStyle.label} ({(item.sentimentScore * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="mt-3">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {item.title}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  {item.content}
                </p>
              </div>

              {/* Footer Topics */}
              <div className="mt-4 flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                    Tags:
                  </span>
                  {item.topics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400"
                    >
                      #{topic}
                    </span>
                  ))}
                </div>

                <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-500 hover:text-zinc-900">
                  View Full Thread
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
