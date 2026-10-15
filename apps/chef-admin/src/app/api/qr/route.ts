import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = request.nextUrl.origin || 'https://chef.ridendine.ca';
    const targetUrl = searchParams.get('url') || `${origin}/app`;
    const format = searchParams.get('format') || 'svg';
    const size = Math.min(Math.max(parseInt(searchParams.get('size') || '300', 10), 100), 1000);

    const qrOptions = {
      width: size,
      margin: 2,
      color: {
        dark: '#111827',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M' as const,
    };

    if (format === 'png') {
      const buffer = await QRCode.toBuffer(targetUrl, qrOptions);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      });
    }

    if (format === 'json') {
      const dataUrl = await QRCode.toDataURL(targetUrl, qrOptions);
      return NextResponse.json({
        success: true,
        data: {
          url: targetUrl,
          dataUrl,
        },
      });
    }

    // Default to SVG (sharp vector, highly scalable for print or responsive screens)
    const svg = await QRCode.toString(targetUrl, {
      ...qrOptions,
      type: 'svg',
    });

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error('QR code generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
