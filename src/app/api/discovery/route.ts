import { NextRequest, NextResponse } from "next/server";
import { DiscoveryService } from "@/lib/discovery/service";
import { MockSearchProvider } from "@/lib/discovery/providers/mock";
import { SerperSearchProvider } from "@/lib/discovery/providers/serper";
import { requireOrgAccess } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const { org } = await requireOrgAccess("analyst");
    const body = await req.json();

    const {
      companyName,
      domain,
      country,
      industry,
      aliases,
      locations,
      companyProfileId,
      providerType = "mock",
    } = body;

    if (!companyName) {
      return NextResponse.json(
        { error: "companyName is required for discovery" },
        { status: 400 }
      );
    }

    const provider =
      providerType === "serper"
        ? new SerperSearchProvider()
        : new MockSearchProvider();

    const discoveryService = new DiscoveryService(provider);

    const result = await discoveryService.runDiscovery(
      companyProfileId || "temp-id",
      {
        companyName,
        domain,
        country,
        industry,
        aliases,
        locations,
      },
      {
        persist: Boolean(companyProfileId),
        orgId: org.id,
      }
    );

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
