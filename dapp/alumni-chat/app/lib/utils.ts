import { type Address } from 'viem'
import { type Post, type Group, PostStatus } from './GatedSocialEscrow'

// Parse raw post tuple from contract into typed object
export function parsePost(
  result?: readonly [Address, string, bigint, bigint, bigint, number, bigint, bigint, bigint]
): Post | null {
  if (!result) return null

  const [author, cid, createdAt, ackedAt, removedAt, status, escrowTotal, setupPaid, streamPaid] = result

  return {
    author,
    cid,
    createdAt,
    ackedAt,
    removedAt,
    status: status as PostStatus,
    escrowTotal,
    setupPaid,
    streamPaid,
  }
}

// Parse raw group tuple from contract into typed object
export function parseGroup(
  result?: readonly [bigint, string, boolean]
): Group | null {
  if (!result) return null

  const [tokenId, name, isActive] = result

  return {
    tokenId,
    name,
    isActive,
  }
}

// Get human-readable status string
export function getStatusLabel(status: PostStatus): string {
  switch (status) {
    case PostStatus.None:
      return 'None'
    case PostStatus.Pending:
      return 'Pending'
    case PostStatus.Active:
      return 'Active'
    case PostStatus.Removed:
      return 'Removed'
    case PostStatus.Refunded:
      return 'Refunded'
    case PostStatus.Completed:
      return 'Completed'
    default:
      return 'Unknown'
  }
}

// Format timestamp to readable date
export function formatTimestamp(timestamp: bigint): string {
  if (timestamp === 0n) return 'N/A'
  return new Date(Number(timestamp) * 1000).toLocaleString()
}

// Format wei to ETH with specified decimals
export function formatEth(wei: bigint, decimals = 4): string {
  const eth = Number(wei) / 1e18
  return eth.toFixed(decimals)
}
