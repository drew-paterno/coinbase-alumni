'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAccount } from 'wagmi';
import {
  GatedSocialEscrowAbi,
  gatedSocialEscrowAddress,
  type Post,
} from '../../lib/GatedSocialEscrow';
import { formatTimestamp } from '../../lib/utils';
import { uploadToIPFS, fetchFromIPFS, type PostContent } from '../../lib/ipfs';

export default function FeedPage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useAccount();
  const membershipNft = params.membershipNft as `0x${string}`;

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch group info by membershipNft address
  const { data: group, isLoading: isLoadingGroup } = useReadContract({
    abi: GatedSocialEscrowAbi,
    address: gatedSocialEscrowAddress,
    functionName: 'groups',
    args: [membershipNft],
  });

  // Check if current user is a member
  const { data: isMember, isLoading: isLoadingMember } = useReadContract({
    abi: GatedSocialEscrowAbi,
    address: gatedSocialEscrowAddress,
    functionName: 'isMember',
    args: [membershipNft, address!],
    query: {
      enabled: !!address,
    },
  });

  // Fetch posts from the contract
  const { data: posts, isLoading: isLoadingPosts, refetch: refetchPosts } = useReadContract({
    abi: GatedSocialEscrowAbi,
    address: gatedSocialEscrowAddress,
    functionName: 'getPosts',
    args: [membershipNft],
  });

  const isLoading = isLoadingGroup || isLoadingPosts || isLoadingMember;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-white shadow-sm z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="flex-1">
            {isLoadingGroup ? (
              <div className="h-6 w-32 bg-gray-200 animate-pulse rounded" />
            ) : (
              <h1 className="text-xl font-bold text-gray-900">
                {group?.[1] || 'Group Feed'}
              </h1>
            )}
            <p className="text-sm text-gray-500">
              {posts?.length ?? 0} posts
            </p>
          </div>
        </div>
      </div>

      {/* Read-only banner for non-members */}
      {!isLoading && !isMember && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <svg
              className="w-5 h-5 text-amber-600 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <p className="text-sm text-amber-800">
              <span className="font-medium">Read-only mode.</span>{' '}
              You need to hold the membership NFT to post in this group.
            </p>
          </div>
        </div>
      )}

      {/* Posts Feed */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            <span className="ml-3 text-gray-600">Loading posts...</span>
          </div>
        )}

        {/* Posts list */}
        {!isLoading && posts && posts.length > 0 && (
          <div className="space-y-4">
            {posts.map((post, index) => (
              <PostCard key={`${post.cid}-${index}`} post={post} index={index} />
            ))}
          </div>
        )}

        {/* End of feed */}
        {!isLoading && posts && posts.length > 0 && (
          <div className="text-center py-8 text-gray-500">
            You&apos;ve reached the end of the feed
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!posts || posts.length === 0) && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-gray-600">No posts yet</p>
            <p className="text-gray-500 text-sm mt-1">
              Be the first to post in this group!
            </p>
          </div>
        )}
      </div>

      {/* Floating Action Button - only shown to members */}
      {isMember && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-20"
          aria-label="Create new post"
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      )}

      {isModalOpen && (
        <CreatePostModal
          onClose={() => setIsModalOpen(false)}
          membershipNft={membershipNft}
          onPostCreated={() => refetchPosts()}
        />
      )}
    </div>
  );
}

function PostCard({ post, index }: { post: Post; index: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      {/* Post Header */}
      <div className="flex items-center gap-3 mb-3">
        <div>
          <p className="font-medium text-gray-900">
            {post.author.slice(0, 6)}...{post.author.slice(-4)}
          </p>
          <p className="text-xs text-gray-500">
            {formatTimestamp(post.createdAt)}
          </p>
        </div>
      </div>

      {/* Post Content */}
      <IPFSContent cid={post.cid} />

      {/* Post Footer */}
      <div className="flex items-center justify-between text-sm text-gray-500 mt-3">
        <span>Post #{index + 1}</span>
      </div>
    </div>
  );
}

function IPFSContent({ cid }: { cid: string }) {
  const [content, setContent] = useState<PostContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadContent() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchFromIPFS(cid);
        if (!cancelled) {
          setContent(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load content');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadContent();

    return () => {
      cancelled = true;
    };
  }, [cid]);

  if (isLoading) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-gray-900 whitespace-pre-wrap">{content?.text}</p>
    </div>
  );
}

interface CreatePostModalProps {
  onClose: () => void;
  membershipNft: `0x${string}`;
  onPostCreated: () => void;
}

function CreatePostModal({ onClose, membershipNft, onPostCreated }: CreatePostModalProps) {
  const [postText, setPostText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedCid, setUploadedCid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const { address } = useAccount();

  // Smart contract write hook
  const { data: hash, writeContract, isPending: isWritePending, error: writeError } = useWriteContract();

  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Handle successful transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      setStatus('Post created successfully!');
      const timer = setTimeout(() => {
        setPostText('');
        setStatus('');
        setUploadedCid(null);
        onPostCreated();
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, onPostCreated, onClose]);

  // Handle write errors
  useEffect(() => {
    if (writeError) {
      setError(writeError.message);
      setStatus('');
      setIsUploading(false);
    }
  }, [writeError]);

  const isProcessing = isUploading || isWritePending || isConfirming;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim() || isProcessing) return;

    setIsUploading(true);
    setError(null);
    setUploadedCid(null);
    setStatus('Uploading to IPFS...');

    try {
      // Step 1: Upload to IPFS
      const postContent: PostContent = {
        text: postText.trim(),
        author: address,
        timestamp: Date.now(),
        version: '1.0.0',
      };

      console.log('Uploading to IPFS:', postContent);
      const { cid } = await uploadToIPFS(postContent);
      console.log('Uploaded to IPFS:', cid);

      setUploadedCid(cid);
      setStatus('Submitting to blockchain...');

      // Step 2: Call smart contract with CID
      writeContract({
        abi: GatedSocialEscrowAbi,
        address: gatedSocialEscrowAddress,
        functionName: 'createPost',
        args: [cid, membershipNft],
      });
    } catch (err) {
      console.error('Failed to upload:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload post');
      setStatus('');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Create Post</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full h-32 p-4 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              autoFocus
            />
            <p className="mt-2 text-sm text-gray-500">
              {postText.length} characters
            </p>

            {/* Error message */}
            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Status message */}
            {status && (
              <div className={`mt-3 p-3 rounded-lg ${isConfirmed ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
                <p className={`text-sm ${isConfirmed ? 'text-green-700' : 'text-blue-700'} flex items-center gap-2`}>
                  {!isConfirmed && (
                    <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                  )}
                  {status}
                </p>
                {uploadedCid && (
                  <p className="text-xs text-gray-500 mt-1 font-mono">CID: {uploadedCid}</p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!postText.trim() || isProcessing}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isUploading ? 'Uploading...' : isConfirming ? 'Confirming...' : 'Submitting...'}
                </>
              ) : (
                'Post'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
