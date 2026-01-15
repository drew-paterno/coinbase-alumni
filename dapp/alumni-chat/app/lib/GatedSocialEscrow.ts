import { type Address } from 'viem'

// TODO: Update this after deploying your contract
export const gatedSocialEscrowAddress: Address = '0x0000000000000000000000000000000000000000'

// Post status enum matching the contract
export enum PostStatus {
  None = 0,
  Pending = 1,
  Active = 2,
  Removed = 3,
  Refunded = 4,
  Completed = 5,
}

// TypeScript types for contract data
export interface Post {
  author: Address
  cid: string
  createdAt: bigint
  ackedAt: bigint
  removedAt: bigint
  status: PostStatus
  escrowTotal: bigint
  setupPaid: bigint
  streamPaid: bigint
}

export interface Group {
  tokenId: bigint
  name: string
  isActive: boolean
}

// Contract ABI
export const GatedSocialEscrowAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'protocolRecipient_', type: 'address', internalType: 'address' },
      { name: 'submitter_', type: 'address', internalType: 'address' },
      { name: 'postFeeWei_', type: 'uint256', internalType: 'uint256' },
      { name: 'protocolBps_', type: 'uint16', internalType: 'uint16' },
      { name: 'setupBpsOfEscrow_', type: 'uint16', internalType: 'uint16' },
      { name: 'ackTimeoutSeconds_', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  { type: 'receive', stateMutability: 'payable' },
  {
    type: 'function',
    name: 'STREAM_DURATION',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'ackPinned',
    inputs: [{ name: 'postId', type: 'uint256', internalType: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'ackTimeout',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'addGroup',
    inputs: [
      { name: 'groupName', type: 'string', internalType: 'string' },
      { name: 'membershipNft', type: 'address', internalType: 'address' },
      { name: 'membershipTokenId_', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'createPost',
    inputs: [
      { name: 'cid', type: 'string', internalType: 'string' },
      { name: 'membershipnft', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: 'postId', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'getGroups',
    inputs: [
      { name: 'offset', type: 'uint256', internalType: 'uint256' },
      { name: 'limit', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        internalType: 'struct GatedSocialEscrow.Group[]',
        components: [
          { name: 'tokenId', type: 'uint256', internalType: 'uint256' },
          { name: 'name', type: 'string', internalType: 'string' },
          { name: 'isActive', type: 'bool', internalType: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'groupAddresses',
    inputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'groups',
    inputs: [{ name: '', type: 'address', internalType: 'address' }],
    outputs: [
      { name: 'tokenId', type: 'uint256', internalType: 'uint256' },
      { name: 'name', type: 'string', internalType: 'string' },
      { name: 'isActive', type: 'bool', internalType: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'membership',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'contract IERC1155' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'membershipTokenId',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'nextPostId',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'postFeeWei',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'posts',
    inputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      { name: 'author', type: 'address', internalType: 'address' },
      { name: 'cid', type: 'string', internalType: 'string' },
      { name: 'createdAt', type: 'uint64', internalType: 'uint64' },
      { name: 'ackedAt', type: 'uint64', internalType: 'uint64' },
      { name: 'removedAt', type: 'uint64', internalType: 'uint64' },
      { name: 'status', type: 'uint8', internalType: 'enum GatedSocialEscrow.Status' },
      { name: 'escrowTotal', type: 'uint256', internalType: 'uint256' },
      { name: 'setupPaid', type: 'uint256', internalType: 'uint256' },
      { name: 'streamPaid', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'protocolBps',
    inputs: [],
    outputs: [{ name: '', type: 'uint16', internalType: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'protocolRecipient',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'refundUnacked',
    inputs: [{ name: 'postId', type: 'uint256', internalType: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'removeGroup',
    inputs: [{ name: 'membershipNft', type: 'address', internalType: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'removePost',
    inputs: [{ name: 'postId', type: 'uint256', internalType: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setAckTimeout',
    inputs: [{ name: 'ackTimeoutSeconds_', type: 'uint256', internalType: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setEconomics',
    inputs: [
      { name: 'postFeeWei_', type: 'uint256', internalType: 'uint256' },
      { name: 'protocolBps_', type: 'uint16', internalType: 'uint16' },
      { name: 'setupBpsOfEscrow_', type: 'uint16', internalType: 'uint16' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setRecipients',
    inputs: [
      { name: 'protocolRecipient_', type: 'address', internalType: 'address' },
      { name: 'submitter_', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'settle',
    inputs: [{ name: 'postId', type: 'uint256', internalType: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setupBpsOfEscrow',
    inputs: [],
    outputs: [{ name: '', type: 'uint16', internalType: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'streamPayableNow',
    inputs: [{ name: 'postId', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'streamRemaining',
    inputs: [{ name: 'postId', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'submitter',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'GroupAdded',
    inputs: [
      { name: 'membershipNft', type: 'address', indexed: true, internalType: 'address' },
      { name: 'tokenId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'groupName', type: 'string', indexed: false, internalType: 'string' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'GroupRemoved',
    inputs: [{ name: 'membershipNft', type: 'address', indexed: true, internalType: 'address' }],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'PostAcked',
    inputs: [
      { name: 'postId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'submitter', type: 'address', indexed: true, internalType: 'address' },
      { name: 'setupPaid', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'ackedAt', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'PostCreated',
    inputs: [
      { name: 'postId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'author', type: 'address', indexed: true, internalType: 'address' },
      { name: 'cid', type: 'string', indexed: false, internalType: 'string' },
      { name: 'escrowTotal', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'createdAt', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'PostRefundedUnacked',
    inputs: [
      { name: 'postId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'author', type: 'address', indexed: true, internalType: 'address' },
      { name: 'refund', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'refundedAt', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'PostRemoved',
    inputs: [
      { name: 'postId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'author', type: 'address', indexed: true, internalType: 'address' },
      { name: 'refund', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'removedAt', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'PostSettled',
    inputs: [
      { name: 'postId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'submitter', type: 'address', indexed: true, internalType: 'address' },
      { name: 'paid', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'totalStreamPaid', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
] as const
