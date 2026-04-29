import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { canManageWorkspace } from "@/lib/rbac";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!canManageWorkspace(session.role)) {
    return NextResponse.json({ message: "Only admins can test Photoroom image generation." }, { status: 403 });
  }

  const apiKey = process.env.PHOTOROOM_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ message: "PHOTOROOM_API_KEY is missing in the preview server environment." }, { status: 400 });
  }

  const url = new URL("https://image-api.photoroom.com/v2/edit");
  url.searchParams.set("imageFromPrompt.prompt", "A folded cotton kids t-shirt on a plain white ecommerce studio background");
  url.searchParams.set("imageFromPrompt.size", "SQUARE_HD");
  url.searchParams.set("background.color", "FFFFFF");
  url.searchParams.set("outputSize", "1024x1024");
  url.searchParams.set("export.format", "png");

  const response = await fetch(url, {
    headers: {
      "x-api-key": apiKey,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    await prisma.integrationConnection.update({
      where: { provider: "photoroom" },
      data: {
        status: "error",
        lastTestStatus: `Photoroom image generation failed: ${message.slice(0, 300)}`,
        lastTestedAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Photoroom image generation failed.", detail: message.slice(0, 500) }, { status: 502 });
  }

  const bytes = Buffer.from(await response.arrayBuffer());

  await prisma.integrationConnection.update({
    where: { provider: "photoroom" },
    data: {
      status: "connected",
      missingEnvKeys: [],
      lastTestStatus: "Photoroom image generation test succeeded.",
      lastTestedAt: new Date(),
    },
  });

  return new Response(bytes, {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "image/png",
      "Cache-Control": "no-store",
    },
  });
}
