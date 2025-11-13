import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'default-no-store';

export async function POST(req: NextRequest) {
	return new Response('Ingest endpoint not configured', { status: 501 });
}

