import { NextRequest, NextResponse } from 'next/server';

export interface PostContent {
  text: string;
  author?: string;
  timestamp: number;
  version: string;
}

export async function POST(request: NextRequest) {
  const pinataJwt = process.env.PINATA_JWT;

  if (!pinataJwt) {
    return NextResponse.json(
      { error: 'PINATA_JWT environment variable is not set' },
      { status: 500 }
    );
  }

  try {
    const content: PostContent = await request.json();

    const data = JSON.stringify({
      pinataContent: content,
      pinataMetadata: {
        name: `post-${content.timestamp}`,
      },
    });

    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pinataJwt}`,
      },
      body: data,
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Failed to upload to IPFS: ${error}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    const cid = result.IpfsHash;

    return NextResponse.json({
      cid,
      url: `https://gateway.pinata.cloud/ipfs/${cid}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
