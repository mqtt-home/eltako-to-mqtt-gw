import { useEffect, useState, useRef } from 'react';
import { ActorStatus } from '@/types/actor';
import { fetchActors, tiltAllActors } from '@/lib/api';
import { useSSE } from '@/hooks/useSSE';
import { ActorCard } from '@/components/ActorCard';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Home, Shield } from 'lucide-react';

// Function to detect mobile devices
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (window.innerWidth <= 768);
};

export function App() {
  const [actors, setActors] = useState<ActorStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [globalSafeMode, setGlobalSafeMode] = useState(isMobileDevice());
  const [pendingGlobalAction, setPendingGlobalAction] = useState<string | null>(null);
  const [globalPendingTimeout, setGlobalPendingTimeout] = useState<NodeJS.Timeout | null>(null);
  const executingGlobalActionRef = useRef(false);
  
  // Use SSE for real-time updates
  const { data: sseData, isConnected, error: sseError, reconnect } = useSSE('/api/events');

  // Update actors when SSE data changes
  useEffect(() => {
    if (sseData.length > 0 && !executingGlobalActionRef.current) {
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

  // Cleanup global timeout on unmount
  useEffect(() => {
    return () => {
      if (globalPendingTimeout) {
        clearTimeout(globalPendingTimeout);
      }
    };
  }, [globalPendingTimeout]);

  // Auto-enable global safe mode on mobile device detection changes
  useEffect(() => {
    const handleResize = () => {
      const isMobile = isMobileDevice();
      if (isMobile && !globalSafeMode) {
        setGlobalSafeMode(true);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [globalSafeMode]);

  const handleTiltAll = async (position: number) => {
    try {
      await tiltAllActors(position);
      // SSE will automatically update the UI, no need to manually refresh
    } catch (error) {
      console.error('Failed to tilt all actors:', error);
      alert('Failed to tilt all actors. Please try again.');
    }
  };

  const handleGlobalAction = async (action: () => Promise<void>, actionName: string) => {
    if (globalSafeMode) {
      if (pendingGlobalAction === actionName) {
        // Execute the action if it's the second tap
        clearGlobalPendingAction();
        executingGlobalActionRef.current = true;
        await action();
        executingGlobalActionRef.current = false;
      } else {
        // First tap - set pending action
        setPendingGlobalAction(actionName);
        // Clear any existing timeout
        if (globalPendingTimeout) {
          clearTimeout(globalPendingTimeout);
        }
        // Set new timeout to clear pending action after 3 seconds
        const timeoutId = setTimeout(() => {
          setPendingGlobalAction(null);
          setGlobalPendingTimeout(null);
        }, 3000);
        setGlobalPendingTimeout(timeoutId);
      }
    } else {
      // Direct execution when safe mode is disabled
      executingGlobalActionRef.current = true;
      await action();
      executingGlobalActionRef.current = false;
    }
  };

  const clearGlobalPendingAction = () => {
    setPendingGlobalAction(null);
    if (globalPendingTimeout) {
      clearTimeout(globalPendingTimeout);
      setGlobalPendingTimeout(null);
    }
  };

  const toggleGlobalSafeMode = () => {
    setGlobalSafeMode(!globalSafeMode);
    clearGlobalPendingAction();
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
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="container mx-auto p-4 sm:p-6">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-primary rounded-lg shrink-0">
                <Home className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold truncate">Eltako Control Panel</h1>
                <p className="text-muted-foreground text-sm sm:text-base hidden sm:block">
                  Manage your smart blinds and shutters
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant={globalSafeMode ? "default" : "ghost"}
                size="icon"
                onClick={toggleGlobalSafeMode}
                className="h-9 w-9"
                title={globalSafeMode ? "Global Safe Mode ON" : "Global Safe Mode OFF"}
              >
                <Shield className="h-4 w-4" />
              </Button>
              <ThemeToggle />
              {!isConnected && (
                <Button
                  variant="outline"
                  onClick={reconnect}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Reconnect</span>
                </Button>
              )}
            </div>
          </div>

          {actors.length > 1 && (
            <Card className="mb-4 sm:mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Global Controls</span>
                  {globalSafeMode && (
                    <span className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                      Safe Mode ON
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  Control all actors at once
                  {globalSafeMode && (
                    <span className="block text-xs text-blue-600 mt-1">
                      Double tap buttons to execute
                      {isMobileDevice() && (
                        <span className="text-xs text-muted-foreground block">
                          (Auto-enabled on mobile)
                        </span>
                      )}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 flex-wrap">
                  <Button
                    variant={pendingGlobalAction === 'tilt-all-closed' ? "destructive" : "secondary"}
                    onClick={() => handleGlobalAction(() => handleTiltAll(0), 'tilt-all-closed')}
                    className="flex-1 min-w-0 min-h-[44px] touch-manipulation"
                  >
                    {pendingGlobalAction === 'tilt-all-closed' ? 'Tap again' : 'Tilt All Closed'}
                  </Button>
                  <Button
                    variant={pendingGlobalAction === 'tilt-all-half' ? "destructive" : "secondary"}
                    onClick={() => handleGlobalAction(() => handleTiltAll(50), 'tilt-all-half')}
                    className="flex-1 min-w-0 min-h-[44px] touch-manipulation"
                  >
                    {pendingGlobalAction === 'tilt-all-half' ? 'Tap again' : 'Tilt All Half'}
                  </Button>
                  <Button
                    variant={pendingGlobalAction === 'tilt-all-open' ? "destructive" : "secondary"}
                    onClick={() => handleGlobalAction(() => handleTiltAll(75), 'tilt-all-open')}
                    className="flex-1 min-w-0 min-h-[44px] touch-manipulation"
                  >
                    {pendingGlobalAction === 'tilt-all-open' ? 'Tap again' : 'Tilt All Open'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
