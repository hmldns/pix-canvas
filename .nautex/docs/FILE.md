Document: Files Tree [FILE]
  └── Files Tree
      ├── Makefile                                // Convenience script for development tasks, fulfilling requirement for easy workflow.
      ├── apps                                    // Directory for all runnable applications in the monorepo.
      │   ├── backend                             // Backend application for core logic, state, and WebSocket communication.
      │   │   ├── src                             // Main source code directory for the backend.
      │   │   │   ├── api                         // Handles all REST API routing and controller logic.
      │   │   │   │   ├── routes                  // Defines API endpoint paths.
      │   │   │   │   │   ├── user.routes.ts      // Defines routes for user creation and session management.
      │   │   │   │   │   └── pixel.routes.ts     // Defines routes for fetching canvas data.
      │   │   │   │   └── controllers             // Implements the logic for each API endpoint.
      │   │   │   │       ├── user.controller.ts     // Implements the POST /api/users endpoint.
      │   │   │   │       └── pixel.controller.ts     // Implements the GET /api/pixels endpoint.
      │   │   │   ├── ws                          // Manages WebSocket connections and message handling.
      │   │   │   │   ├── WebSocketService.ts     // Handles connection, disconnection, and message parsing.
      │   │   │   │   └── broadcast.ts            // Implements rate-limiting and message batching for performance.
      │   │   │   ├── models                      // Data models for users and pixels.
      │   │   │   │   ├── user.model.ts           // Defines the data structure for a user.
      │   │   │   │   └── pixel.model.ts          // Defines the data structure for a pixel.
      │   │   │   ├── services                    // Houses services like database and caching.
      │   │   │   │   ├── database.service.ts     // Handles database connection logic.
      │   │   │   │   └── cache.service.ts        // Caches pixel data to reduce database load.
      │   │   │   ├── config                      // Handles environment variables and configuration parameters.
      │   │   │   │   └── index.ts                // Central point for accessing configuration values.
      │   │   │   ├── app.ts                      // Sets up the Express server and its middleware.
      │   │   │   └── server.ts                   // Initializes and starts the backend HTTP and WebSocket server.
      │   │   ├── tests                           // Directory for backend tests, especially integration tests.
      │   │   │   └── integration                 // Contains integration tests for the entire backend stack, including API endpoints and WebSocket functionality.
      │   │   │       ├── websocket.test.ts       // Tests concurrent pixel drawing and state broadcasting.
      │   │   │       ├── user.api.test.ts        // Tests user creation and session management endpoint (`POST /api/users`).
      │   │   │       └── pixel.api.test.ts       // Tests fetching the initial canvas state via the REST API (`GET /api/pixels`).
      │   │   └── tsconfig.json                   // Defines compiler options for the backend TypeScript project.
      │   ├── frontend                            // Frontend React/PixiJS application for UI and canvas rendering.
      │   │   ├── src                             // Main source code directory for the frontend.
      │   │   │   ├── components                  // Contains all reusable React components.
      │   │   │   │   └── widgets                 // Directory for all overlay UI widgets.
      │   │   │   │       ├── ChatWidget.tsx      // Implements the chat interface and logic.
      │   │   │   │       ├── UserListWidget.tsx     // Displays the list of currently online users.
      │   │   │   │       ├── ConnectionStatusWidget.tsx     // Shows WebSocket connection status and provides a reconnect button.
      │   │   │   │       ├── ColorPaletteWidget.tsx     // Allows users to select a color for drawing.
      │   │   │   │       └── DebugPanel.tsx      // Provides debug controls, visible only in development mode.
      │   │   │   ├── canvas                      // Encapsulates canvas rendering, interaction, and animation.
      │   │   │   │   ├── rendering               // Handles the main PixiJS scene, camera, and layers.
      │   │   │   │   │   ├── CanvasRenderer.ts     // Sets up the main PixiJS rendering loop.
      │   │   │   │   │   ├── Grid.ts             // Implements Level-of-Detail grid rendering based on zoom.
      │   │   │   │   │   ├── PixelRenderer.ts     // Handles creation and updating of pixel graphics.
      │   │   │   │   │   └── CursorRenderer.ts     // Displays remote user cursors received via WebRTC.
      │   │   │   │   ├── animation               // Implements procedural animations for pixel drawing.
      │   │   │   │   │   └── effects.ts          // Creates and manages the 'dust' particle effect.
      │   │   │   │   ├── interaction             // Manages zoom, pan, and click events on the canvas.
      │   │   │   │   │   └── inputController.ts     // Manages mouse/touch events for zooming, panning, and drawing.
      │   │   │   │   └── state                   // Synchronizes React state with PixiJS and manages object pooling.
      │   │   │   │       ├── stateSync.ts        // Implements one-way data flow from React to PixiJS.
      │   │   │   │       └── objectPool.ts       // Optimizes performance by reusing graphics objects.
      │   │   │   ├── services                    // Handles communication with backend services.
      │   │   │   │   ├── api.ts                  // Client-side service for fetching user and pixel data.
      │   │   │   │   ├── websocket.ts            // Handles sending and receiving pixel data via WebSockets.
      │   │   │   │   └── webrtc.ts               // Handles signaling and data channels for cursors and chat.
      │   │   │   ├── hooks                       // Contains reusable stateful logic for components.
      │   │   │   ├── state                       // Manages application-wide state using React Context or a library.
      │   │   │   ├── assets                      // Contains assets like images and sounds.
      │   │   │   │   └── sounds                  // Contains audio files for UI feedback.
      │   │   │   │       ├── draw_self.mp3       // Audio feedback for the current user's drawing action.
      │   │   │   │       └── draw_other.mp3      // Audio feedback for remote users' drawing actions.
      │   │   │   ├── App.tsx                     // The root component of the React application tree.
      │   │   │   └── main.tsx                    // Initializes and renders the React application into the DOM.
      │   │   ├── public                          // Directory for public static assets.
      │   │   ├── index.html                      // The entry HTML page for the React app.
      │   │   ├── vite.config.ts                  // Configures the frontend build process, including path aliases.
      │   │   ├── tailwind.config.ts              // Defines styling, themes, and plugins for Tailwind CSS.
      │   │   └── tsconfig.json                   // Defines compiler options for the frontend TypeScript project.
      │   └── signaling                           // Signaling service to facilitate WebRTC peer discovery.
      │       ├── src                             // Main source code directory for the signaling service.
      │       │   ├── ws                          // Manages signaling messages for P2P connections.
      │       │   │   └── SignalingService.ts     // Core logic for relaying offers, answers, and candidates.
      │       │   ├── config                      // Manages environment variables and settings.
      │       │   │   └── index.ts                // Central point for accessing configuration values.
      │       │   ├── app.ts                      // Sets up the Express server for the signaling service.
      │       │   └── server.ts                   // Initializes and starts the signaling WebSocket server.
      │       └── tsconfig.json                   // Defines compiler options for the signaling TypeScript project.
      ├── libs                                    // Directory for shared libraries used across applications, fulfilling the monorepo design.
      │   ├── common-types                        // Shared data structures for API and WebSocket communication, fulfilling technical requirements for code sharing.
      │   │   └── src                             // Contains all TypeScript type definitions.
      │   │       ├── index.ts                    // Main export file for the library.
      │   │       ├── api.types.ts                // Defines request/response structures for the REST API, fulfilling API design requirements.
      │   │       ├── ws.types.ts                 // Defines message structures for the backend WebSocket service, as specified in API design requirements.
      │   │       ├── webrtc.types.ts             // Defines message structures for the WebRTC signaling service, as specified in API design requirements.
      │   │       └── state.types.ts              // Defines core data entity types (e.g., User, Pixel) used across services, reflecting the data model requirements.
      │   └── utils                               // Common utility functions for use across the monorepo, fulfilling the requirement for shared code.
      │       └── src                             // Contains all shared utility function definitions.
      │           ├── index.ts                    // Main export file for the utils library.
      │           └── nameGenerator.ts            // Generates random, human-readable names for new users, fulfilling a core functional requirement.
      └── docker                                  // Directory for containerization and orchestration configurations.
          ├── docker-compose.yaml                 // Orchestrates Docker containers for all services.
          ├── Caddyfile                           // Routes traffic to frontend, backend, and signaling services.
          ├── backend.Dockerfile                  // Build instructions for the backend Docker image.
          ├── frontend.Dockerfile                 // Build instructions for the frontend Docker image.
          └── signaling.Dockerfile                // Build instructions for the signaling Docker image.