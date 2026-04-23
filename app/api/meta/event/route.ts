import { NextResponse } from "next/server";
import { sendMetaEvent, type MetaEventName } from "@/lib/meta-capi";

export async function POST(request: Request) {
  const { eventName, eventId, eventSourceUrl, customData } = await request.json();

  if (!eventName || !eventId) {
    return NextResponse.json({ error: "Missing eventName or eventId" }, { status: 400 });
  }

  const allowedEvents: MetaEventName[] = ["ViewContent", "CompleteRegistration", "Purchase"];
  if (!allowedEvents.includes(eventName)) {
    return NextResponse.json({ error: "Unsupported event" }, { status: 400 });
  }

  const result = await sendMetaEvent({
    request,
    eventName,
    eventId,
    eventSourceUrl,
    customData,
  });

  return NextResponse.json({ success: result.ok, skipped: result.skipped });
}
