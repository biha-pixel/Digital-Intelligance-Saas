import { SearchQuery, SourceType } from "./types";
import { ProfileMatchingContext } from "./utils";

export function generateDiscoveryQueries(context: ProfileMatchingContext): SearchQuery[] {
  const queries: SearchQuery[] = [];
  const name = context.companyName;
  const domain = context.domain;

  // 1. Direct Website / Brand Query
  queries.push({
    term: `"${name}" official website`,
    platform: "generic_web",
  });

  // 2. Trustpilot Queries
  queries.push({
    term: `site:trustpilot.com/review "${name}"`,
    platform: "trustpilot",
  });
  if (domain) {
    queries.push({
      term: `site:trustpilot.com/review "${domain}"`,
      platform: "trustpilot",
    });
  }

  // 3. G2 / Software Review Queries (especially for tech/SaaS)
  if (!context.industry || context.industry.toLowerCase().includes("software") || context.industry.toLowerCase().includes("saas") || context.industry.toLowerCase().includes("tech")) {
    queries.push({
      term: `site:g2.com/products "${name}" reviews`,
      platform: "g2",
    });
    queries.push({
      term: `site:capterra.com "${name}" reviews`,
      platform: "capterra",
    });
  }

  // 4. Google Maps / Local Reviews (especially if locations exist)
  if (context.locations && context.locations.length > 0) {
    for (const loc of context.locations.slice(0, 3)) { // Top 3 locations to avoid explosion
      queries.push({
        term: `"${name}" "${loc.city}" reviews site:maps.google.com OR site:google.com/maps`,
        platform: "google_maps",
      });
      queries.push({
        term: `site:yelp.com/biz "${name}" "${loc.city}"`,
        platform: "yelp",
      });
    }
  } else {
    queries.push({
      term: `"${name}" reviews site:maps.google.com OR site:google.com/maps`,
      platform: "google_maps",
    });
  }

  // 5. Reddit / Community Discussions
  queries.push({
    term: `site:reddit.com "${name}" review OR complaints OR experience`,
    platform: "reddit",
  });

  // 6. Mobile App Stores (if tech/consumer/finance)
  queries.push({
    term: `site:apps.apple.com "${name}"`,
    platform: "app_store",
  });
  queries.push({
    term: `site:play.google.com/store/apps "${name}"`,
    platform: "play_store",
  });

  return queries;
}
