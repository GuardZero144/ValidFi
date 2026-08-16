import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { CredentialStatusEvent, StatusSubscription } from './dto/credential-status.dto';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/credentials',
})
export class CredentialStatusGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CredentialStatusGateway.name);
  private readonly connectedClients = new Map<string, Set<string>>();

  afterInit(server: Server) {
    this.logger.log('CredentialStatusGateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, new Set());
    client.emit('connected', { clientId: client.id, timestamp: new Date().toISOString() });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() subscription: StatusSubscription,
  ) {
    const subscriptions = this.connectedClients.get(client.id) || new Set();

    if (subscription.credentialId) {
      const room = `credential:${subscription.credentialId}`;
      client.join(room);
      subscriptions.add(room);
    }

    if (subscription.holder) {
      const room = `holder:${subscription.holder}`;
      client.join(room);
      subscriptions.add(room);
    }

    if (subscription.events) {
      for (const event of subscription.events) {
        const room = `event:${event}`;
        client.join(room);
        subscriptions.add(room);
      }
    }

    this.connectedClients.set(client.id, subscriptions);
    return { event: 'subscribed', data: { rooms: Array.from(subscriptions) } };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { credentialId?: string; holder?: string },
  ) {
    if (data.credentialId) {
      client.leave(`credential:${data.credentialId}`);
    }
    if (data.holder) {
      client.leave(`holder:${data.holder}`);
    }
    return { event: 'unsubscribed' };
  }

  broadcastStatusUpdate(update: import('./dto/credential-status.dto').CredentialStatusUpdate) {
    this.server.to(`credential:${update.credentialId}`).emit('statusUpdate', update);
    this.server.to(`event:${update.event}`).emit('statusUpdate', update);
    this.server.emit('statusUpdate', update);
    this.logger.log(`Broadcast status update: ${update.event} for ${update.credentialId}`);
  }

  getConnectedClientCount(): number {
    return this.connectedClients.size;
  }
}
