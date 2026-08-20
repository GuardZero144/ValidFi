import { CredentialReconnectionManager } from './credential-reconnection.manager';

describe('CredentialReconnectionManager', () => {
  let manager: CredentialReconnectionManager;

  beforeEach(() => {
    manager = new CredentialReconnectionManager();
  });

  afterEach(() => {
    manager.onModuleDestroy();
  });

  it('should track a new connection', () => {
    manager.trackConnection('client-1', ['room-a', 'room-b']);
    expect(manager.getTrackedConnectionCount()).toBe(1);
  });

  it('should return stored subscriptions', () => {
    manager.trackConnection('client-1', ['room-a', 'room-b']);
    expect(manager.getStoredSubscriptions('client-1')).toEqual(['room-a', 'room-b']);
  });

  it('should return empty array for unknown client', () => {
    expect(manager.getStoredSubscriptions('unknown')).toEqual([]);
  });

  it('should allow reconnection within max attempts', () => {
    manager.trackConnection('client-1', []);
    manager.markDisconnected('client-1');
    expect(manager.canReconnect('client-1')).toBe(true);
  });

  it('should deny reconnection after max attempts', () => {
    manager.trackConnection('client-1', []);
    for (let i = 0; i < 5; i++) {
      manager.markDisconnected('client-1');
    }
    expect(manager.canReconnect('client-1')).toBe(false);
  });

  it('should reset attempts on updateLastSeen', () => {
    manager.trackConnection('client-1', []);
    manager.markDisconnected('client-1');
    manager.markDisconnected('client-1');
    manager.updateLastSeen('client-1');
    expect(manager.canReconnect('client-1')).toBe(true);
  });

  it('should remove connection', () => {
    manager.trackConnection('client-1', []);
    manager.removeConnection('client-1');
    expect(manager.getTrackedConnectionCount()).toBe(0);
  });
});
