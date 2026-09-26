import { handle } from "hono/vercel";
import { createApp } from "../server/app.ts";

// Vercel entry: every /api/* request goes to the same Hono app the local server runs.
const handler = handle(createApp());

export const GET = handler;
export const POST = handler;
export const OPTIONS = handler;
