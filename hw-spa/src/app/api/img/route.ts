export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id || !/^[\w-]+$/.test(id)) {
    return new Response('Bad Request', { status: 400 });
  }

  const driveUrl = `https://drive.google.com/uc?export=view&id=${id}`;
  const res = await fetch(driveUrl, { redirect: 'follow' });

  if (!res.ok) {
    return new Response('Not Found', { status: 404 });
  }

  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  const buffer = await res.arrayBuffer();

  return new Response(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
