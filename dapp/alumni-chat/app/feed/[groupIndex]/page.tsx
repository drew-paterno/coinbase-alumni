'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useReadContract } from 'wagmi';
import {
  GatedSocialEscrowAbi,
  gatedSocialEscrowAddress,
  type Post,
  type Group,
  PostStatus,
} from '../../lib/GatedSocialEscrow';
import { formatTimestamp } from '../../lib/utils';

const POSTS_PER_PAGE = 10;

// Stubbed post data for demonstration (until contract methods are available)
function generateStubbedPosts(groupIndex: number, offset: number, limit: number): Post[] {
  const posts: Post[] = [];
  for (let i = 0; i < limit; i++) {
    const postId = offset + i;
    posts.push({
      author: `0x${(postId + 1).toString(16).padStart(40, '0')}` as `0x${string}`,
      cid: `QmStubbed${groupIndex}Post${postId}CID${Math.random().toString(36).substring(7)}`,
      createdAt: BigInt(Date.now() / 1000 - postId * 3600), // Each post 1 hour apart
      ackedAt: BigInt(Date.now() / 1000 - postId * 3600 + 300),
      removedAt: BigInt(0),
      status: PostStatus.Active,
      escrowTotal: BigInt(1000000000000000), // 0.001 ETH
      setupPaid: BigInt(100000000000000),
      streamPaid: BigInt(50000000000000),
    });
  }
  return posts;
}

export default function FeedPage() {
  const params = useParams();
  const router = useRouter();
  const groupIndex = Number(params.groupIndex);

  const [posts, setPosts] = useState<Post[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Fetch group info
  const { data: groups, isLoading: isLoadingGroup } = useReadContract({
    abi: GatedSocialEscrowAbi,
    address: gatedSocialEscrowAddress,
    functionName: 'getGroups',
    args: [BigInt(groupIndex), BigInt(1)],
  });

  const group = groups?.[0];

  // Load posts (stubbed for now)
  const loadPosts = useCallback(async (currentOffset: number) => {
    setIsLoadingMore(true);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // TODO: Replace with actual contract call when getPosts method is available
    // For now, using stubbed data
    const newPosts = generateStubbedPosts(groupIndex, currentOffset, POSTS_PER_PAGE);

    // Simulate end of feed after 50 posts
    if (currentOffset >= 40) {
      setHasMore(false);
      setIsLoadingMore(false);
      return;
    }

    setPosts((prev) => [...prev, ...newPosts]);
    setOffset(currentOffset + POSTS_PER_PAGE);
    setIsLoadingMore(false);
  }, [groupIndex]);

  // Initial load
  useEffect(() => {
    loadPosts(0);
  }, [loadPosts]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadPosts(offset);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoadingMore, offset, loadPosts]);

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
                {group?.name || `Group #${groupIndex + 1}`}
              </h1>
            )}
            <p className="text-sm text-gray-500">
              {posts.length} posts loaded
            </p>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="space-y-4">
          {posts.map((post, index) => (
            <PostCard key={`${post.cid}-${index}`} post={post} index={offset - POSTS_PER_PAGE + index} />
          ))}
        </div>

        {/* Loading indicator */}
        {isLoadingMore && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            <span className="ml-3 text-gray-600">Loading more posts...</span>
          </div>
        )}

        {/* End of feed */}
        {!hasMore && posts.length > 0 && (
          <div className="text-center py-8 text-gray-500">
            You&apos;ve reached the end of the feed
          </div>
        )}

        {/* Empty state */}
        {!isLoadingMore && posts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-gray-600">No posts yet</p>
            <p className="text-gray-500 text-sm mt-1">
              Be the first to post in this group!
            </p>
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={observerTarget} className="h-10" />
      </div>

      {/* Floating Action Button */}
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

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        groupIndex={groupIndex}
      />
    </div>
  );
}

function PostCard({ post, index }: { post: Post; index: number }) {
  const statusColors = {
    [PostStatus.None]: 'bg-gray-100 text-gray-600',
    [PostStatus.Pending]: 'bg-yellow-100 text-yellow-800',
    [PostStatus.Active]: 'bg-green-100 text-green-800',
    [PostStatus.Removed]: 'bg-red-100 text-red-800',
    [PostStatus.Refunded]: 'bg-orange-100 text-orange-800',
    [PostStatus.Completed]: 'bg-blue-100 text-blue-800',
  };

  const statusLabels = {
    [PostStatus.None]: 'None',
    [PostStatus.Pending]: 'Pending',
    [PostStatus.Active]: 'Active',
    [PostStatus.Removed]: 'Removed',
    [PostStatus.Refunded]: 'Refunded',
    [PostStatus.Completed]: 'Completed',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
            {post.author.slice(2, 4).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {post.author.slice(0, 6)}...{post.author.slice(-4)}
            </p>
            <p className="text-xs text-gray-500">
              {formatTimestamp(post.createdAt)}
            </p>
          </div>
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[post.status]}`}
        >
          {statusLabels[post.status]}
        </span>
      </div>

      {/* Post Content (CID) */}
      <div className="bg-gray-50 rounded-lg p-4 mb-3">
        <p className="text-sm text-gray-600 break-all">
          <span className="font-medium text-gray-700">CID: </span>
          {post.cid}
        </p>
      </div>

      {/* Post Footer */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Post #{index + 1}</span>
        <div className="flex items-center gap-4">
          <span>
            Escrow: {(Number(post.escrowTotal) / 1e18).toFixed(4)} ETH
          </span>
        </div>
      </div>
    </div>
  );
}

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupIndex: number;
}

function CreatePostModal({ isOpen, onClose, groupIndex }: CreatePostModalProps) {
  const [postText, setPostText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim()) return;

    setIsSubmitting(true);

    // TODO: Add actual contract call here
    console.log('Submitting post:', { groupIndex, text: postText });

    // Simulate submission delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setPostText('');
    onClose();
  };

  if (!isOpen) return null;

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
              disabled={!postText.trim() || isSubmitting}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Posting...
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
