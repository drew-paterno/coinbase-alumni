// Format timestamp to readable date
export function formatTimestamp(timestamp: bigint): string {
  if (timestamp === 0n) return 'N/A'
  return new Date(Number(timestamp) * 1000).toLocaleString()
}
