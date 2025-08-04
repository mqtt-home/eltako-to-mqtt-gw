import { useEffect, useState } from 'react';
import { ActorStatus } from '@/types/actor';
import { fetchActors, tiltAllActors } from '@/lib/api';
import { useSSE } from '@/hooks/useSSE';
import { ActorCard } from '@/components/ActorCard';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Home } from 'lucide-react';

export function App() {
  const [actors, setActors] = useState<ActorStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use SSE for real-time updates
  const { data: sseData, isConnected, error: sseError, reconnect } = useSSE('/api/events');

  // Update actors when SSE data changes
  useEffect(() => {
    if (sseData.length > 0) {
      setActors(sseData);
      setIsLoading(false);
      setError(null);
    }
  }, [sseData]);

  // Handle SSE connection errors
  useEffect(() => {
    if (sseError) {
      setError(sseError);
    }
  }, [sseError]);

  const loadActors = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchActors();
      setActors(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load actors');
      console.error('Error loading actors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback: load actors initially if SSE is not connected
  useEffect(() => {
    if (!isConnected && actors.length === 0) {
      loadActors();
    }
  }, [isConnected, actors.length]);

  const handleTiltAll = async (position: number) => {
    try {
      await tiltAllActors(position);
      // SSE will automatically update the UI, no need to manually refresh
    } catch (error) {
      console.error('Failed to tilt all actors:', error);
      alert('Failed to tilt all actors. Please try again.');
    }
  };

  if (isLoading && actors.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading actors...</p>
        </div>
      </div>
    );
  }

  if (error && actors.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadActors} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Home className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Eltako Control Panel</h1>
                <p className="text-muted-foreground">
                  Manage your smart blinds and shutters
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {!isConnected && (
                <Button
                  variant="outline"
                  onClick={reconnect}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Reconnect
                </Button>
              )}
            </div>
          </div>

          {actors.length > 1 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Global Controls</CardTitle>
                <CardDescription>
                  Control all actors at once
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="secondary"
                    onClick={() => handleTiltAll(0)}
                    className="flex-1 min-w-0"
                  >
                    Tilt All Closed
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleTiltAll(50)}
                    className="flex-1 min-w-0"
                  >
                    Tilt All Half
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleTiltAll(75)}
                    className="flex-1 min-w-0"
                  >
                    Tilt All Open
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {actors.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No actors found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Make sure your Eltako devices are configured and connected.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {actors.sort((a, b) => a.name.localeCompare(b.name)).map((actor) => (
              <ActorCard
                key={actor.name}
                actor={actor}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
