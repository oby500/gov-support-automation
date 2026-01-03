export async function GET() {
  return new Response(null, { status: 204 });
}

export async function POST(req: Request) {
  const body = await req.json();

  const cloudRunUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const res = await fetch(`${cloudRunUrl}/api/proposal/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return Response.json(data);
}
