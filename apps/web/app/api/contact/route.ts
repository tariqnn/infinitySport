import { NextResponse } from "next/server";
import { submitContactRequest } from "@infinity/mock-api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, message } = body ?? {};

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const submission = submitContactRequest({ name, email, message });
    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error("Contact form error", error);
    return NextResponse.json({ error: "Unable to send your request right now." }, { status: 500 });
  }
}

