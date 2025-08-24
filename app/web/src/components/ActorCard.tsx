import { useState, useEffect, useRef } from 'react';
import { ActorStatus } from '@/types/actor';
import { setActorPosition, tiltActor } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ChevronUp, ChevronDown, RotateCcw, Lock } from 'lucide-react';

interface ActorCardProps {
    actor: ActorStatus;
    onRefresh?: () => void;
}

// Function to detect mobile devices
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (window.innerWidth <= 768);
};

export function ActorCard({ actor, onRefresh }: ActorCardProps) {
    const [position, setPosition] = useState(actor.position);
    const [isLoading, setIsLoading] = useState(false);
    const [safeModeEnabled, setSafeModeEnabled] = useState(isMobileDevice());
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [pendingTimeout, setPendingTimeout] = useState<NodeJS.Timeout | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const executingActionRef = useRef(false);

    // Keep position in sync with actor prop only when not loading and not executing an action
    useEffect(() => {
        if (!isLoading && !executingActionRef.current) {
            setPosition(actor.position);
            setIsDragging(false); // Reset dragging state when position updates from server
        }
    }, [actor.position, isLoading]);

    // Auto-enable safe mode on mobile device detection changes
    useEffect(() => {
        const handleResize = () => {
            const isMobile = isMobileDevice();
            if (isMobile && !safeModeEnabled) {
                setSafeModeEnabled(true);
            }
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, [safeModeEnabled]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (pendingTimeout) {
                clearTimeout(pendingTimeout);
            }
        };
    }, [pendingTimeout]);

    const handlePositionChange = async (newPosition: number) => {
        setIsLoading(true);
        executingActionRef.current = true;
        try {
            await setActorPosition(actor.name, newPosition);
            setPosition(newPosition);
            // SSE will automatically update the UI, no need to manually refresh
        } catch (error) {
            console.error('Failed to set position:', error);
            alert('Failed to set position. Please try again.');
        } finally {
            setIsLoading(false);
            executingActionRef.current = false;
        }
    };

    const handleTilt = async (tiltPosition: number) => {
        setIsLoading(true);
        executingActionRef.current = true;
        try {
            await tiltActor(actor.name, tiltPosition);
            // SSE will automatically update the UI, no need to manually refresh
        } catch (error) {
            console.error('Failed to tilt:', error);
            alert('Failed to tilt. Please try again.');
        } finally {
            setIsLoading(false);
            executingActionRef.current = false;
        }
    };

    const handleButtonAction = async (action: () => Promise<void>, actionName: string) => {
        if (safeModeEnabled) {
            if (pendingAction === actionName) {
                // Execute the action if it's the second tap
                clearPendingAction();
                await action();
            } else {
                // First tap - set pending action
                setPendingAction(actionName);
                // Clear any existing timeout
                if (pendingTimeout) {
                    clearTimeout(pendingTimeout);
                }
                // Set new timeout to clear pending action after 3 seconds
                const timeoutId = setTimeout(() => {
                    setPendingAction(null);
                    setPendingTimeout(null);
                }, 3000);
                setPendingTimeout(timeoutId);
            }
        } else {
            // Direct execution when safe mode is disabled
            await action();
        }
    };

    const clearPendingAction = () => {
        setPendingAction(null);
        if (pendingTimeout) {
            clearTimeout(pendingTimeout);
            setPendingTimeout(null);
        }
    };

    const toggleSafeMode = () => {
        setSafeModeEnabled(!safeModeEnabled);
        clearPendingAction();
    };

    const handleSliderChange = (values: number[]) => {
        // Only update the visual preview, don't execute the command
        setPosition(values[0]);
        setIsDragging(true);
    };

    const handleSliderCommit = (values: number[]) => {
        // Clear any pending actions when user manually uses slider
        clearPendingAction();
        setIsDragging(false);
        // Execute the actual REST command only on mouse/touch up
        handlePositionChange(values[0]);
    };

    return (
        <Card className="w-full max-w-md touch-manipulation">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{actor.displayName}</span>
                    <div className="flex items-center gap-1 ml-2">
                        <Button
                            variant={safeModeEnabled ? "default" : "ghost"}
                            size="icon"
                            onClick={toggleSafeMode}
                            className="h-8 w-8 shrink-0"
                            title={safeModeEnabled ? "Safe mode ON - Double tap to execute" : "Safe mode OFF - Single tap to execute"}
                        >
                            <Lock className="h-4 w-4" />
                        </Button>
                        {onRefresh && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onRefresh}
                                disabled={isLoading}
                                className="h-8 w-8 shrink-0"
                            >
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </CardTitle>
                <CardDescription>
                    {actor.ip} {actor.serial && `(${actor.serial})`}
                    {safeModeEnabled && (
                        <div className="text-xs text-blue-600 mt-1">
                            Safe Mode: Double tap buttons to execute
                            {isMobileDevice() && (
                                <span className="text-xs text-muted-foreground block">
                  (Auto-enabled on mobile)
                </span>
                            )}
                        </div>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
            <span className={isDragging ? "text-blue-600 font-medium" : ""}>
              Position: {position}%
                {isDragging && <span className="text-xs ml-1">(preview)</span>}
            </span>
                        {actor.tilted && (
                            <span className="text-blue-600 font-medium">
                Tilted at {actor.tiltPosition}%
              </span>
                        )}
                    </div>

                    <div className="w-full touch-manipulation">
                        <Slider
                            value={[position]}
                            onValueChange={handleSliderChange}
                            onValueCommit={handleSliderCommit}
                            max={100}
                            step={1}
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Button
                        variant={pendingAction === 'close' ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => handleButtonAction(() => handlePositionChange(0), 'close')}
                        disabled={isLoading}
                        className="flex items-center gap-2 min-h-[44px] touch-manipulation"
                    >
                        <ChevronDown className="h-4 w-4" />
                        {pendingAction === 'close' ? 'Tap again' : 'Close'}
                    </Button>
                    <Button
                        variant={pendingAction === 'open' ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => handleButtonAction(() => handlePositionChange(100), 'open')}
                        disabled={isLoading}
                        className="flex items-center gap-2 min-h-[44px] touch-manipulation"
                    >
                        <ChevronUp className="h-4 w-4" />
                        {pendingAction === 'open' ? 'Tap again' : 'Open'}
                    </Button>
                </div>

                <div className="space-y-2">
                    <p className="text-sm font-medium">Tilt Operations</p>
                    <div className="grid grid-cols-3 gap-3">
                        <Button
                            variant={pendingAction === 'tilt-closed' ? "destructive" : "secondary"}
                            size="sm"
                            onClick={() => handleButtonAction(() => handleTilt(0), 'tilt-closed')}
                            disabled={isLoading}
                            className="min-h-[44px] touch-manipulation text-xs px-2"
                        >
                            {pendingAction === 'tilt-closed' ? 'Tap again' : 'Closed'}
                        </Button>
                        <Button
                            variant={pendingAction === 'tilt-half' ? "destructive" : "secondary"}
                            size="sm"
                            onClick={() => handleButtonAction(() => handleTilt(50), 'tilt-half')}
                            disabled={isLoading}
                            className="min-h-[44px] touch-manipulation text-xs px-2"
                        >
                            {pendingAction === 'tilt-half' ? 'Tap again' : 'Half'}
                        </Button>
                        <Button
                            variant={pendingAction === 'tilt-open' ? "destructive" : "secondary"}
                            size="sm"
                            onClick={() => handleButtonAction(() => handleTilt(75), 'tilt-open')}
                            disabled={isLoading}
                            className="min-h-[44px] touch-manipulation text-xs px-2"
                        >
                            {pendingAction === 'tilt-open' ? 'Tap again' : 'Open'}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
