import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
  } from '@nestjs/common';
  import { AuthService } from 'src/auth/auth.service';
  
  @Injectable()
  export class WsAuthGuard implements CanActivate {
    constructor(private readonly authService: AuthService) {}
  
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const client = context.switchToWs().getClient();
      const token = client.handshake?.headers?.authorization?.split(' ')[1];
  
      if (!token) {
          console.log('Token: Missing');
          client.emit('error', { message: 'No token provided' });
          client.disconnect();
          return false;
      }
  
      console.log('Token:', token);
  
      try {
          const user = await this.authService.verifyToken(token);
          console.log('Authenticated User:', user);
          client.user = user; // Attach user to the client
          console.log('Authenticated User:', user); // Log the authenticated user
          return true;
      } catch (err) {
          console.error('Token validation error:', err.message);
          client.emit('error', { message: 'Invalid or expired token' });
          client.disconnect();
          return false;
      }
  }
  
  
  }
  