import { NextRequest, NextResponse } from 'next/server';

// Mock data - replace with actual database queries
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

// In-memory store - replace with database
let pendingItems = { ...mockItems };

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'grants';

  const items = pendingItems[type] || [];
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, type } = body;

    if (!id || !action || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: id, action, type' },
        { status: 400 }
      );
    }

    const items = pendingItems[type] || [];
    const index = items.findIndex((item: any) => item.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Update the item status
    items[index].status = action === 'approve' ? 'approved' : 'rejected';
    pendingItems[type] = items;

    // In a real implementation, you would update the database here

    return NextResponse.json({
      success: true,
      message: `Item ${action}d successfully`,
      item: items[index],
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process moderation action' },
      { status: 500 }
    );
  }
}
