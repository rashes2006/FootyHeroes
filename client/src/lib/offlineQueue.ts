import { api } from './api';

export interface QueuedEvent {
  id: string;
  matchId: string;
  type: 'EVENT' | 'CLOCK' | 'START';
  payload: any;
  timestamp: number;
  retryCount: number;
}

const QUEUE_KEY = 'footyheroes_offline_queue';

export class OfflineQueueManager {
  private static listeners: Array<(queue: QueuedEvent[], isOnline: boolean) => void> = [];

  static isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  static getQueue(): QueuedEvent[] {
    try {
      const data = localStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveQueue(queue: QueuedEvent[]): void {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      this.notify();
    } catch (err) {
      console.error('Failed to save offline queue:', err);
    }
  }

  static enqueue(matchId: string, type: 'EVENT' | 'CLOCK' | 'START', payload: any): QueuedEvent {
    const queue = this.getQueue();
    const item: QueuedEvent = {
      id: 'offline_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      matchId,
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    };
    queue.push(item);
    this.saveQueue(queue);
    return item;
  }

  static remove(id: string): void {
    const queue = this.getQueue().filter(q => q.id !== id);
    this.saveQueue(queue);
  }

  static clear(): void {
    this.saveQueue([]);
  }

  static subscribe(callback: (queue: QueuedEvent[], isOnline: boolean) => void): () => void {
    this.listeners.push(callback);
    callback(this.getQueue(), this.isOnline());

    const handleOnline = () => {
      this.notify();
      this.flush();
    };
    const handleOffline = () => this.notify();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  private static notify(): void {
    const queue = this.getQueue();
    const online = this.isOnline();
    this.listeners.forEach(cb => cb(queue, online));
  }

  static async flush(): Promise<{ processed: number; failed: number }> {
    if (!this.isOnline()) return { processed: 0, failed: 0 };
    const queue = this.getQueue();
    if (queue.length === 0) return { processed: 0, failed: 0 };

    let processed = 0;
    let failed = 0;
    const remaining: QueuedEvent[] = [];

    // Process FIFO sequentially to maintain timeline order
    for (const item of queue) {
      try {
        if (item.type === 'EVENT') {
          await api.recordEvent(item.matchId, item.payload);
        } else if (item.type === 'CLOCK') {
          await api.controlClock(item.matchId, item.payload.action, item.payload.seconds);
        } else if (item.type === 'START') {
          await api.startMatch(item.matchId);
        }
        processed++;
      } catch (err) {
        console.warn('Failed to replay offline action:', item, err);
        item.retryCount = (item.retryCount || 0) + 1;
        if (item.retryCount < 5) {
          remaining.push(item);
        }
        failed++;
      }
    }

    this.saveQueue(remaining);
    return { processed, failed };
  }
}
