// src/types/socket.d.ts
import { Socket } from "socket.io";

declare module "socket.io" {
    interface Socket {
        user?: {
            id: string; // Adjust the type as necessary based on your user object
            // Add any other user properties if needed
        };
    }
}
