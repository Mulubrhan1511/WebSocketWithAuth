import { OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer, ConnectedSocket } from "@nestjs/websockets";
import { Server } from "socket.io";
import { Message } from "src/entities/message.entity";
import { Repository } from "typeorm";
import { AuthService } from 'src/auth/auth.service';
import { User } from "src/entities/user.entity";

@WebSocketGateway({
    cors: {
        origin: 'http://localhost:3000',
    },
})
export class MyGateway implements OnModuleInit {
    @WebSocketServer()
    server: Server;

    private userSockets: Map<string, Set<string>> = new Map();

    constructor(
        @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        private readonly authService: AuthService,
    ) {}

    onModuleInit() {
        this.server.on('connection', (socket) => {
            const token = socket.handshake.headers.authorization?.split(' ')[1];
            console.log('Token:', token);

            if (token) {
                this.verifyToken(token, socket);
            } else {
                console.log('No token provided');
                socket.disconnect();
            }
        });
    }

    private async verifyToken(token: string, socket: any) {
        try {
            const user = await this.authService.verifyToken(token);
            socket.user = user;
            console.log('Authenticated User:', user);

            const userId = user.id.toString();
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId)?.add(socket.id);

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
    async onNewMessage(@MessageBody() body: { receiverId: string; content: string }, @ConnectedSocket() socket: any) {
    const senderId = socket.user?.id?.toString();
    if (!senderId) {
        console.log('User is not authenticated');
        return;
    }

    const sender = await this.userRepository.findOne({ where: { id: senderId } });

    // Convert receiverId from string to number
    const receiverId = parseInt(body.receiverId, 10);
    const receiver = await this.userRepository.findOne({ where: { id: receiverId } });

    if (!sender || !receiver) {
        console.log('Sender or receiver not found');
        return;
    }



    const newMessage = this.messageRepository.create({
        msg: 'This is a message from the server',
        content: body.content,
        sender: sender,
        receiver: receiver,
    });

    await this.messageRepository.save(newMessage);

    // Emit the new message to both sender and receiver
    const senderSockets = this.userSockets.get(senderId);
    const receiverSockets = this.userSockets.get(receiver.id.toString());

    // Debugging logs
    console.log('Sender Sockets:', senderSockets);
    console.log('Receiver Sockets:', receiverSockets);

    // Emit to sender
    senderSockets?.forEach(socketId => {
        this.server.to(socketId).emit('onMessage', {
            msg: newMessage.msg,
            content: body.content,
            senderId: senderId,
            receiverId: body.receiverId,
        });
    });

    // Emit to receiver
    if (receiverSockets) {
        console.log('Sending message to receiver:', receiver.id.toString());
        receiverSockets.forEach(socketId => {
            console.log(`Sending message to receiver socket ID: ${socketId}`);
            this.server.to(socketId).emit('onMessage', {
                msg: newMessage.msg,
                content: body.content,
                senderId: senderId,
                receiverId: body.receiverId,
            });
        });
    } else {
        console.log('No receiver sockets found for ID:', receiver.id.toString());
    }
}


    @SubscribeMessage('getMessages')
    async onGetAllMessages(@ConnectedSocket() socket: any) {
        const userId = socket.user?.id?.toString();
        if (!userId) {
            console.log('User is not authenticated');
            return;
        }

        const messages = await this.messageRepository.find({
            where: [{ sender: { id: userId } }, { receiver: { id: userId } }],
        });

        // Emit messages to the user
        this.userSockets.get(userId)?.forEach(socketId => {
            this.server.to(socketId).emit('onMessages', messages);
        });
    }
}
