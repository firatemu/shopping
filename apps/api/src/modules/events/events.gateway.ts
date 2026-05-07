import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * SoftShopping WebSocket Gateway
 *
 * Provides real-time events to web and mobile clients.
 * Authentication via JWT in the `authorization` handshake header.
 * After auth, the socket joins a room named after the tenantId for tenant-scoped broadcasts.
 *
 * Events emitted by the server:
 *  - stock:updated      → { variantId, tenantId, newQty }
 *  - order:created      → { orderId, tenantId, orderNumber }
 *  - campaign:updated   → { tenantId }
 *  - notification:new   → { tenantId, userId, notification }
 *
 * Clients send:
 *  - join:tenant         → join tenant-scoped room
 *  - ping                → keepalive pong response
 */

@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  namespace: '/ws',
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  afterInit(_server: Server): void {
    this.logger.log('WebSocket Gateway initialised on /ws');
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        client.emit('error', { message: 'No token provided' });
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      if (!payload?.tenantId) {
        client.emit('error', { message: 'Invalid token: missing tenantId' });
        client.disconnect();
        return;
      }

      // Attach tenantId and userId to the socket for later use
      (client as Socket & { tenantId?: string; userId?: string }).tenantId = payload.tenantId;
      (client as Socket & { tenantId?: string; userId?: string }).userId =
        payload.sub || payload.userId;

      // Auto-join tenant room
      client.join(`tenant:${payload.tenantId}`);

      this.logger.log(
        `Client connected: ${client.id} (tenant=${payload.tenantId}, user=${payload.sub || payload.userId})`,
      );

      client.emit('authenticated', { tenantId: payload.tenantId });
    } catch {
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const tenantId = (client as Socket & { tenantId?: string }).tenantId;
    this.logger.log(`Client disconnected: ${client.id} (tenant=${tenantId})`);
  }

  /**
   * Emit a stock update event to all clients in a tenant room.
   */
  emitStockUpdate(tenantId: string, variantId: string, newQty: number): void {
    this.server.to(`tenant:${tenantId}`).emit('stock:updated', {
      variantId,
      tenantId,
      newQty,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Emit a new order event to all clients in a tenant room.
   */
  emitOrderCreated(tenantId: string, orderId: string, orderNumber: string): void {
    this.server.to(`tenant:${tenantId}`).emit('order:created', {
      orderId,
      tenantId,
      orderNumber,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Emit a campaign update event to all clients in a tenant room.
   */
  emitCampaignUpdate(tenantId: string): void {
    this.server.to(`tenant:${tenantId}`).emit('campaign:updated', {
      tenantId,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Emit a real-time notification to a specific user within a tenant.
   */
  emitNotification(tenantId: string, userId: string, notification: object): void {
    this.server.to(`tenant:${tenantId}`).emit('notification:new', {
      userId,
      tenantId,
      notification,
    });
  }
}
