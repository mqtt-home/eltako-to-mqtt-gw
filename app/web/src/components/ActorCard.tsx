import { useState, useEffect } from 'react';
import { ActorStatus } from '@/types/actor';
import { setActorPosition, tiltActor } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';

interface ActorCardProps {
  actor: ActorStatus;
  onRefresh?: () => void;
}

export function ActorCard({ actor, onRefresh }: ActorCardProps) {
  const [position, setPosition] = useState(actor.position);
  const [isLoading, setIsLoading] = useState(false);

  // Keep position in sync with actor prop
  useEffect(() => {
    setPosition(actor.position);
  }, [actor.position]);

  const handlePositionChange = async (newPosition: number) => {
    setIsLoading(true);
    try {
      await setActorPosition(actor.name, newPosition);
      setPosition(newPosition);
      // SSE will automatically update the UI, no need to manually refresh
    } catch (error) {
      console.error('Failed to set position:', error);
      alert('Failed to set position. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTilt = async (tiltPosition: number) => {
    setIsLoading(true);
    try {
      await tiltActor(actor.name, tiltPosition);
      // SSE will automatically update the UI, no need to manually refresh
    } catch (error) {
      console.error('Failed to tilt:', error);
      alert('Failed to tilt. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSliderChange = (values: number[]) => {
    setPosition(values[0]);
  };

  const handleSliderCommit = (values: number[]) => {
    handlePositionChange(values[0]);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {actor.displayName}
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          {actor.ip} {actor.serial && `(${actor.serial})`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Position: {actor.position}%</span>
            {actor.tilted && (
              <span className="text-blue-600 font-medium">
                Tilted at {actor.tiltPosition}%
              </span>
            )}
          </div>
          
          <Slider
            value={[position]}
            onValueChange={handleSliderChange}
            onValueCommit={handleSliderCommit}
            max={100}
            step={1}
            className="w-full"
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePositionChange(0)}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <ChevronDown className="h-4 w-4" />
            Close
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePositionChange(100)}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <ChevronUp className="h-4 w-4" />
            Open
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Tilt Operations</p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleTilt(0)}
              disabled={isLoading}
            >
              Closed
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleTilt(50)}
              disabled={isLoading}
            >
              Half
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleTilt(75)}
              disabled={isLoading}
            >
              Open
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
