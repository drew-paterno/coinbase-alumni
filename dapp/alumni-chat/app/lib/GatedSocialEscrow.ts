import { type Address } from "viem";

export const gatedSocialEscrowAddress: Address =
  "0xa67345d88F8e02cF38aB60730280CB001047661E";

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
  author: Address;
  cid: string;
  createdAt: bigint;
  status: PostStatus;
}

export interface Group {
  membershipNft: Address;
  tokenId: bigint;
  name: string;
  isActive: boolean;
}

// Contract ABI
export const GatedSocialEscrowAbi = [
  {
    inputs: [
      { internalType: "address", name: "protocolRecipient_", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "membershipNft",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "string",
        name: "groupName",
        type: "string",
      },
    ],
    name: "GroupAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "membershipNft",
        type: "address",
      },
    ],
    name: "GroupRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "postId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "author",
        type: "address",
      },
      { indexed: false, internalType: "string", name: "cid", type: "string" },
      {
        indexed: false,
        internalType: "uint256",
        name: "createdAt",
        type: "uint256",
      },
    ],
    name: "PostCreated",
    type: "event",
  },
  {
    inputs: [
      { internalType: "string", name: "groupName", type: "string" },
      { internalType: "address", name: "membershipNft", type: "address" },
      { internalType: "uint256", name: "membershipTokenId_", type: "uint256" },
    ],
    name: "addGroup",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "cid", type: "string" },
      { internalType: "address", name: "membershipnft", type: "address" },
    ],
    name: "createPost",
    outputs: [{ internalType: "uint256", name: "postId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "offset", type: "uint256" },
      { internalType: "uint256", name: "limit", type: "uint256" },
    ],
    name: "getGroups",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "tokenId", type: "uint256" },
          { internalType: "string", name: "name", type: "string" },
          { internalType: "bool", name: "isActive", type: "bool" },
          { internalType: "address", name: "membershipNft", type: "address" },
        ],
        internalType: "struct GatedSocialEscrow.Group[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "membershipnft", type: "address" },
    ],
    name: "getPosts",
    outputs: [
      {
        components: [
          { internalType: "address", name: "author", type: "address" },
          { internalType: "string", name: "cid", type: "string" },
          { internalType: "uint64", name: "createdAt", type: "uint64" },
          {
            internalType: "enum GatedSocialEscrow.Status",
            name: "status",
            type: "uint8",
          },
        ],
        internalType: "struct GatedSocialEscrow.Post[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "groupAddresses",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "groups",
    outputs: [
      { internalType: "uint256", name: "tokenId", type: "uint256" },
      { internalType: "string", name: "name", type: "string" },
      { internalType: "bool", name: "isActive", type: "bool" },
      { internalType: "address", name: "membershipNft", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "membershipNft", type: "address" },
    ],
    name: "isMember",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    name: "posts",
    outputs: [
      { internalType: "address", name: "author", type: "address" },
      { internalType: "string", name: "cid", type: "string" },
      { internalType: "uint64", name: "createdAt", type: "uint64" },
      {
        internalType: "enum GatedSocialEscrow.Status",
        name: "status",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "protocolRecipient",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "membershipNft", type: "address" },
    ],
    name: "removeGroup",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
