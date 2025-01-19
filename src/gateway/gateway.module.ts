import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { Message } from 'src/entities/message.entity';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { WsAuthGuard } from 'src/auth/ws-auth.guard';
import { MyGateway } from './gateway';
import refreshJwtConfig from 'src/auth/config/refresh-jwt.config';
import { User } from 'src/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, User]),
    ConfigModule.forRoot({
      load: [refreshJwtConfig], // Register your configuration here
    }),
  ],
  providers: [MyGateway, AuthService, UserService, JwtService, WsAuthGuard],
})
export class GatewayModule {}
