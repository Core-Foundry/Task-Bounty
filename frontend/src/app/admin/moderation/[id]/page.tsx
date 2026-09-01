'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

export default function ModerationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchItem();
  }, [params.id]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/moderation/item?id=${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setItem(data.item);
      }
    } catch (error) {
      console.error('Failed to fetch item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (action: 'approve' | 'reject') => {
    setProcessing(true);
    try {
      const res = await fetch('/api/admin/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: params.id, action, type: item?.type }),
      });
      if (res.ok) {
        router.push('/admin');
      }
    } catch (error) {
      console.error('Failed to moderate:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Item not found</p>
        <Button variant="outline" onClick={() => router.push('/admin')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Moderation Queue
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Button variant="ghost" onClick={() => router.push('/admin')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Queue
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>Submitted by {item.submittedBy} on {new Date(item.submittedAt).toLocaleString()}</CardDescription>
            </div>
            <Badge variant={item.status === 'pending' ? 'outline' : item.status === 'approved' ? 'default' : 'destructive'}>
              {item.status || 'Pending'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg p-4 bg-muted/50">
            <h4 className="font-medium mb-2">Details</h4>
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(item.details, null, 2)}
            </pre>
          </div>

          {item.status === 'pending' && (
            <div className="flex gap-4 pt-4 border-t">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => handleModerate('approve')}
                disabled={processing}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Approve
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleModerate('reject')}
                disabled={processing}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                Reject
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
