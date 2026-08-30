import { NextRequest, NextResponse } from 'next/server';

// Reuse the same mock data as the main moderation route
const mockItems: Record<string, any[]> = {
  grants: [
    { id: '1', type: 'grant', title: 'Open Source Sustainability Grant', submittedBy: '0x123...abc', submittedAt: new Date().toISOString(), status: 'pending', details: { amount: '$5,000', category: 'Infrastructure' } },
    { id: '2', type: 'grant', title: 'Community Education Program', submittedBy: '0x456...def', submittedAt: new Date(Date.now() - 86400000).toISOString(), status: 'pending', details: { amount: '$3,000', category: 'Education' } },
  ],
  updates: [
    { id: '3', type: 'update', title: 'Q3 Progress Update', submittedBy: '0x789...ghi', submittedAt: new Date(Date.now() - 172800000).toISOString(), status: 'pending', details: { project: 'Eco Initiative' } },
  ],
  reports: [
    { id: '4', type: 'report', title: 'User Report: Inappropriate Content', submittedBy: '0xabc...jkl', submittedAt: new Date(Date.now() - 259200000).toISOString(), status: 'pending', details: { reason: 'Spam' } },
  ],
};

let pendingItems = { ...mockItems };

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Missing id parameter' },
      { status: 400 }
    );
  }

  // Search all types
  for (const type of ['grants', 'updates', 'reports']) {
    const items = pendingItems[type] || [];
    const item = items.find((i: any) => i.id === id);
    if (item) {
      return NextResponse.json({ item });
    }
  }

  return NextResponse.json(
    { error: 'Item not found' },
    { status: 404 }
  );
}
