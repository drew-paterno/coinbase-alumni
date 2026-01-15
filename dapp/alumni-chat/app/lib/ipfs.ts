// IPFS upload utilities

export interface PostContent {
  text: string;
  author?: string;
  timestamp: number;
  version: string;
}

export interface IPFSUploadResult {
  cid: string;
  url: string;
}

/**
 * Upload post content to IPFS via Pinata
 * Requires NEXT_PUBLIC_PINATA_JWT environment variable
 */
export async function uploadToIPFS(content: PostContent): Promise<IPFSUploadResult> {
  const pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT;

  if (!pinataJwt) {
    throw new Error('NEXT_PUBLIC_PINATA_JWT environment variable is not set');
  }

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
    throw new Error(`Failed to upload to IPFS: ${error}`);
  }

  const result = await response.json();
  const cid = result.IpfsHash;

  return {
    cid,
    url: `https://gateway.pinata.cloud/ipfs/${cid}`,
  };
}

/**
 * Fetch content from IPFS by CID
 */
export async function fetchFromIPFS(cid: string): Promise<PostContent> {
  const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
  }

  return response.json();
}
