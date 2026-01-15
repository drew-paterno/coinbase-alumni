'use client';

import { sdk } from '@farcaster/miniapp-sdk';
import { useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { useMiniApp } from './providers/miniAppProvider';
import { GatedSocialEscrowAbi, gatedSocialEscrowAddress, type Group } from './lib/GatedSocialEscrow';

export default function Home() {
  const { isInMiniApp, context } = useMiniApp();

  // Fetch groups from the contract
  const temp = useReadContract({
    abi: GatedSocialEscrowAbi,
    address: gatedSocialEscrowAddress,
    functionName: 'getGroups',
    args: [BigInt(0), BigInt(100)], // offset: 0, limit: 100
  });

  const { data: groups, isLoading, isError, error } = temp

  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Alumni Groups
            </h1>
            <p className="text-gray-600 mb-4">
              Browse NFT-gated social groups
            </p>

            {isInMiniApp && context?.user && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Welcome, @{context.user.username}!
              </div>
            )}
          </div>
        </div>

        {/* Groups List */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Available Groups
          </h2>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-gray-600">Loading groups...</span>
            </div>
          )}

          {isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 font-medium">Error loading groups</p>
              <p className="text-red-600 text-sm mt-1">
                {error?.message || 'Failed to fetch groups from contract'}
              </p>
              <p className="text-red-500 text-xs mt-2">
                Make sure the contract is deployed and the address is configured.
              </p>
            </div>
          )}

          {!isLoading && !isError && groups && groups.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-gray-600">No groups found</p>
              <p className="text-gray-500 text-sm mt-1">
                Groups will appear here once they are added to the contract.
              </p>
            </div>
          )}

          {!isLoading && !isError && groups && groups.length > 0 && (
            <div className="space-y-4">
              {groups.map((group, index) => (
                <GroupCard key={index} group={group} index={index} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>
            Contract: {gatedSocialEscrowAddress.slice(0, 6)}...{gatedSocialEscrowAddress.slice(-4)}
          </p>
        </div>
      </div>
    </div>
  );
}

function GroupCard({ group, index }: { group: Group; index: number }) {
  return (
    <div
      className={`border rounded-xl p-5 transition-all hover:shadow-md ${
        group.isActive
          ? 'border-green-200 bg-green-50 hover:border-green-300'
          : 'border-gray-200 bg-gray-50 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {group.name || `Group #${index + 1}`}
            </h3>
            {group.isActive ? (
              <span className="px-2 py-0.5 bg-green-200 text-green-800 text-xs font-medium rounded-full">
                Active
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-gray-300 text-gray-600 text-xs font-medium rounded-full">
                Inactive
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">
            Token ID: {group.tokenId.toString()}
          </p>
        </div>
        <button
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            group.isActive
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          disabled={!group.isActive}
        >
          View
        </button>
      </div>
    </div>
  );
}
