#  Product Specification

## [PRD-5] Introduction & Vision

This document outlines the requirements for a real-time, collaborative web application called Infinite Pixel Canvas. The core of the application is a shared, persistent digital canvas where anonymous visitors can draw individual pixels. The project serves as a technological demonstrator and research project to explore real-time web technologies like WebRTC and WebSockets, advanced frontend rendering with PixiJS, and a scalable backend architecture. The vision is to create a dynamic, interactive digital art space where users can co-create and observe the evolving canvas and each other's presence in real-time.

## [PRD-16] Target Audience & User Personas

The primary target audience consists of random, anonymous visitors to the website. There is no sign-up or login process. Users are individuals interested in casual, creative, and collaborative online experiences. They are not expected to have any specific technical skills.

## [PRD-54] User Stories / Use Cases

[PRD-28] As a new visitor, I want to be automatically assigned a unique, random username and session so I can immediately start interacting with the canvas without a registration process.

[PRD-48] As a user, I want to see an infinite-seeming canvas with a pixel grid, so I can explore the artwork and find a space to draw.

[PRD-59] As a user, I want to be able to smoothly zoom in and out and pan across the canvas, so I can see both the fine details and the larger picture.

[PRD-3] As a user, I want to click on a grid cell to place a pixel of a specific color, so I can contribute to the shared artwork.

[PRD-66] As a user, I want a color palette widget so I can select a color before placing a pixel.

[PRD-70] As a user, I want to be able to select an existing pixel and change its color, so I can edit contributions on the canvas.

[PRD-47] As a user, I want my placed pixels to be saved permanently, so my contributions persist over time.

[PRD-53] As a user, I want to see pixels drawn by other users appear on my screen in real-time, so I feel part of a live, collaborative environment.

[PRD-1] As a user, I want to see the cursors of other active users moving on the canvas, so I can feel their presence and see where they are interacting.

[PRD-45] As a user, I want to open an in-app group chat to communicate with other users who are currently online.

[PRD-52] As a user, I want to see a list of all currently active users, along with their assigned nicknames and a total user count, so I know who else is on the canvas.

[PRD-6] As a user, I want to receive distinct audio and visual feedback when I place a pixel versus when another user's pixel appears, so I can differentiate my actions from others'.

[PRD-44] As a user, I want to be able to collapse or hide UI widgets like the chat and user list, so I can have an unobstructed view of the canvas.

[PRD-39] As a user, I want a connection status widget that shows if the connection is live (based on a keepalive signal). If the signal is lost for more than 2 seconds, the application should automatically try to reconnect. I also want a button to manually trigger a reconnect.

[PRD-55] As a user, I want to be able to toggle between a light and dark theme for the application interface, so I can choose the mode that is most comfortable for my eyes.

## [PRD-60] Functional Requirements

[PRD-31] The system must automatically generate a unique user_id on the backend for each new visitor.

[PRD-7] Each user must be assigned a random, human-readable, two-word nickname.

[PRD-29] User sessions, identified by the user_id, must be persisted on the client-side using cookies or local storage.

[PRD-25] The application will feature a large, grid-based canvas with integer coordinates. The canvas is limited to 5000x5000 pixels.

[PRD-51] The canvas must display a togglable grid. Grid lines will have different shades (from light to dark) to represent 1, 10, 100, and 1000-pixel intervals. The visibility and rendering of these grid lines will be dynamically managed based on the zoom level and viewport size to ensure clarity and avoid visual clutter.

[PRD-4] Users must be able to place a pixel with a specific RGB color at a given coordinate.

[PRD-68] A color selection palette widget must be available in the UI, allowing users to choose their desired pixel color from a predefined set of options.

[PRD-69] Users can change the color of a pixel by selecting it and choosing a new color. This action is functionally equivalent to placing a new pixel at the same coordinates with the new color.

[PRD-11] Pixel data (coordinates, color, timestamp, user ID) must be stored permanently in a database using an append-only model. The current state of the canvas is determined by aggregating the most recent pixel entry for each unique (x, y) coordinate.

[PRD-33] Pixel updates must be broadcast to all connected clients in real-time using WebSockets.

[PRD-65] The WebSocket communication protocol must include a command that instructs the client to perform a full refetch of the canvas state from the backend. This is for recovery and synchronization purposes.

[PRD-26] The system must implement a rate-limiting mechanism for WebSocket notifications, with a maximum frequency of 10Hz. When update rates are high, notifications for multiple pixel changes should be batched into a single message.

[PRD-49] The system must show the real-time cursor positions of other users via WebRTC.

[PRD-8] An in-app, ephemeral group chat must be available for all active users. Chat messages will be transmitted peer-to-peer via reliable WebRTC data channels to ensure guaranteed delivery and will not be stored on the server.

[PRD-43] The UI must include a list of active users, displaying their nickname, an avatar, and the total number of connected users.

[PRD-2] User avatars will be generated from the first letters of their two-word nickname. Each user will be assigned a distinct color.

[PRD-38] A visual animation (a "dust" or "stamps-like" particle effect) will play when a pixel appears. The animation will last 0.5 seconds.

[PRD-40] A sound effect will play when a pixel is drawn. A different sound will play for the user's own action versus receiving an update about another user's action.

[PRD-42] The UI will feature a connection viability widget. This widget will monitor a WebSocket keepalive signal. It will display the time elapsed since the last signal was received and indicate connection status (e.g., green for good, orange for signal loss, red for broken). After 2 seconds without a keepalive signal, the client must automatically attempt to reconnect. A manual reconnect button must also be provided.

[PRD-35] All UI elements (chat, user list, etc.) must be implemented as floating, collapsible/expandable widgets that overlay the canvas.

[PRD-46] The application must support a dark and light theme, switchable via a button in the UI.

## [PRD-32] Non-Functional Requirements

[PRD-56] The canvas rendering and user interactions (zooming, panning) should feel smooth, targeting 60 frames per second (FPS) on both desktop and modern mobile browsers.

[PRD-22] The application interface must be responsive and adapted for mobile layouts.

[PRD-36] The system should handle user reconnections gracefully, restoring their session using the stored cookie/local storage.

[PRD-17] The development process should be convenient, with tools (like make targets) for easily launching, testing, and debugging individual components.

[PRD-27] The final product should be a high-quality "technological demonstrator" showcasing the specified technologies.

[PRD-15] WebRTC latency for cursor updates should be as low as possible, accepting the inherent performance of the technology without requiring additional optimization. For chat messages, guaranteed delivery is prioritized over absolute minimum latency.

[PRD-67] All significant backend transactions (e.g., pixel placement, user connection) must be logged to the console, even in the production environment, for observability.

## [PRD-12] Scope

### [PRD-19] In Scope

[PRD-41] All functional and non-functional requirements listed above.

[PRD-18] Core features: infinite canvas drawing, WebSocket pixel updates, WebRTC cursors, and WebRTC chat.

[PRD-24] User management: Anonymous, auto-generated users with session persistence.

[PRD-62] UI: Collapsible widgets, user list, connection status, theme switching.

[PRD-9] Effects: Sound and animation for pixel drawing.

[PRD-30] Deployment: Dockerized services (frontend, backend, signaling) orchestrated with docker-compose and fronted by a Caddy reverse proxy.

[PRD-20] Development tooling: Monorepo structure, make targets for convenience, and a debug UI for tweaking animations.

[PRD-34] Observability: Sentry integration for error tracking.

### [PRD-14] Out of Scope

[PRD-61] User registration, authentication, and profiles.

[PRD-50] Any form of moderation tools or spam prevention for the canvas or chat.

[PRD-23] Permanent storage of chat messages.

[PRD-37] Advanced features like drawing shapes, using different brush sizes, or pixel editing history.

## [PRD-21] Success Metrics

[PRD-13] Successful implementation of all specified features, serving as a personal learning project and a technical proof-of-concept.

[PRD-57] The application runs stably and meets the 60 FPS performance target on desktop and mobile.

[PRD-10] The backend architecture is modular and demonstrates horizontal scalability principles.
