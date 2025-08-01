import { ActorStatus } from '@/types/actor';

const API_BASE = '/api';

export async function fetchActors(): Promise<ActorStatus[]> {
  const response = await fetch(`${API_BASE}/actors`);
  if (!response.ok) {
    throw new Error('Failed to fetch actors');
  }
  return response.json();
}

export async function fetchActor(name: string): Promise<ActorStatus> {
  const response = await fetch(`${API_BASE}/actors/${encodeURIComponent(name)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch actor ${name}`);
  }
  return response.json();
}

export async function setActorPosition(name: string, position: number): Promise<void> {
  const response = await fetch(`${API_BASE}/actors/${encodeURIComponent(name)}/position`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ position }),
  });
  if (!response.ok) {
    throw new Error(`Failed to set position for actor ${name}`);
  }
}

export async function tiltActor(name: string, position: number): Promise<void> {
  const response = await fetch(`${API_BASE}/actors/${encodeURIComponent(name)}/tilt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ position }),
  });
  if (!response.ok) {
    throw new Error(`Failed to tilt actor ${name}`);
  }
}

export async function tiltAllActors(position: number): Promise<void> {
  const response = await fetch(`${API_BASE}/actors/all/tilt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ position }),
  });
  if (!response.ok) {
    throw new Error('Failed to tilt all actors');
  }
}
