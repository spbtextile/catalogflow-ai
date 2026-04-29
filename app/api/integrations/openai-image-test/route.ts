import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { canManageWorkspace } from "@/lib/rbac";
import { getSession } from "@/lib/session";

function configRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, string>;
}

function configValue(config: Record<string, string>, key: string, fallback = "") {
  const value = config[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!canManageWorkspace(session.role)) {
    return NextResponse.json({ message: "Only admins can test image generation." }, { status: 403 });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ message: "OPENAI_API_KEY is missing in the preview server environment." }, { status: 400 });
  }

  const connection = await prisma.integrationConnection.findUnique({
    where: { provider: "openai" },
  });
  const config = configRecord(connection?.publicConfig);
  const model = process.env.OPENAI_IMAGE_MODEL ?? configValue(config, "imageModel", "gpt-image-1.5");
  const endpoint = configValue(config, "imageEndpoint", "/v1/images/generations");
  const response = await fetch(`https://api.openai.com${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(process.env.OPENAI_PROJECT_ID ? { "OpenAI-Project": process.env.OPENAI_PROJECT_ID } : {}),
    },
    body: JSON.stringify({
      model,
      prompt: "Clean ecommerce catalog test image for SPB Textile: a folded cotton t-shirt on a plain white background, studio lighting, no text.",
      n: 1,
      size: "1024x1024",
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    await prisma.integrationConnection.update({
      where: { provider: "openai" },
      data: {
        status: "error",
        lastTestStatus: `OpenAI image generation failed: ${message.slice(0, 300)}`,
        lastTestedAt: new Date(),
      },
    });

    return NextResponse.json({ message: "OpenAI image generation failed.", detail: message.slice(0, 500) }, { status: 502 });
  }

  const payload = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  const image = payload.data?.[0];

  await prisma.integrationConnection.update({
    where: { provider: "openai" },
    data: {
      status: "connected",
      missingEnvKeys: [],
      lastTestStatus: "OpenAI image generation test succeeded.",
      lastTestedAt: new Date(),
    },
  });

  if (image?.url) {
    return NextResponse.redirect(image.url);
  }

  if (!image?.b64_json) {
    return NextResponse.json({ message: "OpenAI response did not include image data." }, { status: 502 });
  }

  const bytes = Buffer.from(image.b64_json, "base64");

  return new Response(bytes, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
