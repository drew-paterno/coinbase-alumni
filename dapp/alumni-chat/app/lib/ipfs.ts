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
 * Upload post content to IPFS via server-side API route
 * This keeps the Pinata JWT secure on the server
 */
export async function uploadToIPFS(content: PostContent): Promise<IPFSUploadResult> {
  const response = await fetch('/api/ipfs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(content),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload to IPFS');
  }

  return response.json();
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
