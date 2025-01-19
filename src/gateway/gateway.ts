import { OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer, ConnectedSocket } from "@nestjs/websockets";
import { Server } from "socket.io";
import { Message } from "src/entities/message.entity";
import { Repository } from "typeorm";
import { AuthService } from 'src/auth/auth.service'; // Import your AuthService
import { User } from "src/entities/user.entity";

@WebSocketGateway({
    cors: {
        origin: 'http://localhost:3000',
    },
})
export class MyGateway implements OnModuleInit {
    @WebSocketServer()
    server: Server;

    // Store connected sockets by userId (converted to string)
    private userSockets: Map<string, Set<string>> = new Map();

    constructor(
        @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        private readonly authService: AuthService, // Inject AuthService
    ) {}

    onModuleInit() {
        this.server.on('connection', (socket) => {
            const token = socket.handshake.headers.authorization?.split(' ')[1]; // Access token from headers
            console.log('Token:', token);

            if (token) {
                // Verify the token here
                this.verifyToken(token, socket);
            } else {
                console.log('No token provided');
                socket.disconnect();
            }
        });
    }

    private async verifyToken(token: string, socket: any) {
        try {
            const user = await this.authService.verifyToken(token); // Verify the token
            socket.user = user; // Attach user to socket
            console.log('Authenticated User:', user);

            // Convert userId to string
            const userId = user.id.toString();
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId)?.add(socket.id);

            // Handle socket disconnection
            socket.on('disconnect', () => {
                this.userSockets.get(userId)?.delete(socket.id);
                if (this.userSockets.get(userId)?.size === 0) {
                    this.userSockets.delete(userId);
                }
            });
        } catch (err) {
            console.error('Authentication error:', err);
            socket.disconnect();
        }
    }

    @SubscribeMessage('newMessage')
    async onNewMessage(@MessageBody() body: any, @ConnectedSocket() socket: any) {
        const userId = socket.user?.id?.toString(); // Convert to string
        if (!userId) {
            console.log('User is not authenticated');
            return;
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            console.log('User not found');
            return;
        }

        const newMessage = this.messageRepository.create({
            msg: 'This is a message from the server',
            content: body,
            user,
        });

        await this.messageRepository.save(newMessage);

        // Emit the new message to all sockets for the user
        this.userSockets.get(userId)?.forEach(socketId => {
            this.server.to(socketId).emit('onMessage', {
                msg: 'This is a message from the server',
                content: body,
            });
        });
    }

    @SubscribeMessage('getMessages')
    async onGetAllMessages(@ConnectedSocket() socket: any) {
        const userId = socket.user?.id?.toString(); // Convert to string
        if (!userId) {
            console.log('User is not authenticated');
            return;
        }

        const messages = await this.messageRepository.find({
            where: { user: { id: userId } },
        });

        // Emit messages to the user
        this.userSockets.get(userId)?.forEach(socketId => {
            this.server.to(socketId).emit('onMessages', messages);
        });
    }
}
