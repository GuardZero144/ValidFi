import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

interface ReconnectionState {
  clientId: string;
  lastSeen: Date;
  reconnectAttempts: number;
  subscriptions: string[];
}

@Injectable()
export class CredentialReconnectionManager {
  private readonly logger = new Logger(CredentialReconnectionManager.name);
  private readonly reconnectState = new Map<string, ReconnectionState>();
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectWindowMs = 30000;
  private readonly cleanupIntervalMs = 60000;
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanupStaleConnections(), this.cleanupIntervalMs);
  }

  trackConnection(clientId: string, subscriptions: string[]): void {
    this.reconnectState.set(clientId, {
      clientId,
      lastSeen: new Date(),
      reconnectAttempts: 0,
      subscriptions,
    });
  }

  updateLastSeen(clientId: string): void {
    const state = this.reconnectState.get(clientId);
    if (state) {
      state.lastSeen = new Date();
      state.reconnectAttempts = 0;
    }
  }

  markDisconnected(clientId: string): string[] | null {
    const state = this.reconnectState.get(clientId);
    if (!state) return null;
    state.reconnectAttempts++;
    return state.subscriptions;
  }

  canReconnect(clientId: string): boolean {
    const state = this.reconnectState.get(clientId);
    if (!state) return false;
    return state.reconnectAttempts < this.maxReconnectAttempts;
  }

  getStoredSubscriptions(clientId: string): string[] {
    return this.reconnectState.get(clientId)?.subscriptions || [];
  }

  removeConnection(clientId: string): void {
    this.reconnectState.delete(clientId);
  }

  private cleanupStaleConnections(): void {
    const now = Date.now();
    for (const [clientId, state] of this.reconnectState) {
      if (now - state.lastSeen.getTime() > this.reconnectWindowMs && state.reconnectAttempts >= this.maxReconnectAttempts) {
        this.reconnectState.delete(clientId);
        this.logger.log(`Cleaned up stale connection: ${clientId}`);
      }
    }
  }

  getTrackedConnectionCount(): number {
    return this.reconnectState.size;
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupTimer);
  }
}
