# Echoes Development Plan

## 🎯 Implementation Strategy

This document outlines the detailed development phases for the Echoes tactical game. Each phase builds upon the previous one to create a complete, playable game.

## 📋 Phase Breakdown

### **Phase 1: Core Framework & Game State** ✅
**Goal**: Establish the foundation for all game systems

#### 1.1 Project Setup
- [x] Initialize React TypeScript project with Vite
- [x] Set up project structure (client, server, shared, docs)
- [x] Configure development environment
- [x] Set up basic routing and navigation

#### 1.2 Type Definitions & Constants
- [x] Define core game types (Position, Direction, PlayerId, etc.)
- [x] Create game constants (BOARD_SIZE, ACTION_POINTS, etc.)
- [x] Set up shared type definitions
- [x] Create utility functions for coordinate conversion

#### 1.3 Game State Management
- [x] Implement core game state structure
- [x] Create game state reducer/manager
- [x] Set up action dispatching system
- [x] Implement state persistence for local testing

#### 1.4 Board System
- [x] Create 8x8 grid with proper labeling (A-H, 1-8)
- [x] Implement tile highlighting system
- [x] Create coordinate conversion utilities
- [x] Set up board rendering with black background and white grid lines

### **Phase 2: Entity System & Rendering** ✅
**Goal**: Create visual representation of all game entities

#### 2.1 Entity Base Classes
- [x] Implement Entity interface and base classes
- [x] Create Echo, Projectile, Mine, and Shield classes
- [x] Set up entity lifecycle management
- [x] Implement entity state tracking

#### 2.2 Rendering System
- [x] Implement Canvas/SVG rendering for all entities
- [x] Echo rendering (large filled circles: red/blue)
- [x] Projectile/Mine rendering (small white circles)
- [x] Shield rendering (white half-circle outlines)
- [x] Grid and label rendering

#### 2.3 Entity Management
- [x] Entity creation and destruction
- [x] Position tracking and updates
- [x] Collision detection system
- [x] Entity lifecycle management

### **Phase 3: Action System** ✅
**Goal**: Implement all game actions and their mechanics

#### 3.1 Action Implementation
- [x] Walk action (1 AP, 1 tile movement)
- [x] Dash action (2 AP, 2 tiles orthogonal)
- [x] Fire action (2 AP, spawn projectile)
- [x] Mine action (2 AP, spawn stationary projectile)
- [x] Shield action (1 AP, directional protection)

#### 3.2 Action Validation
- [x] Valid move checking
- [x] Action point validation
- [x] Direction validation
- [x] Boundary checking

#### 3.3 Action Execution System
- [x] Tick-based action execution
- [x] Simultaneous action processing
- [x] Action queuing and management
- [x] Action point tracking

### **Phase 4: Input System & UI** ✅
**Goal**: Create intuitive user interface for game interaction

#### 4.1 Echo Selection Interface
- [x] New Echo vs Extend Echo choice
- [x] Valid tile highlighting for new echoes (home rows)
- [x] Existing echo highlighting for extension
- [x] Echo selection confirmation

#### 4.2 Action Selection Interface
- [x] 5 action buttons (Walk, Shield, Dash, Fire, Mine)
- [x] Action point display and tracking
- [x] Valid direction highlighting
- [x] Back button functionality

#### 4.3 Echo Preview System
- [x] Semi-transparent rendering of other echoes
- [x] Current board state display during input
- [x] Projectile trail visualization

#### 4.4 Turn Management
- [x] Input phase progression
- [x] Action point allocation tracking
- [x] Turn submission validation
- [x] Phase transition handling

### **Phase 5: Replay System** 🔄
**Goal**: Create smooth replay system for action execution

#### 5.1 Replay Engine
- [x] Tick-by-tick execution (3 seconds per tick)
- [x] Simultaneous action processing
- [x] Entity state updates
- [x] Collision detection and resolution

#### 5.2 Animation System
- [x] Smooth entity movement animations
- [x] Collision event animations
- [x] Shield activation/deactivation
- [x] Projectile movement trails
- [x] Shield block animations (green explosions at tile edges)

#### 5.3 Replay Phase Management
- [x] Automatic tick progression
- [x] Collision event handling
- [x] Entity destruction
- [x] Win condition checking

### **Phase 6: Game Logic & Rules** 🔄
**Goal**: Implement complete game rules and win conditions

#### 6.1 Collision System
- [x] Entity collision detection
- [x] Shield vs projectile interactions
- [x] Destruction logic
- [x] Collision event handling

#### 6.2 Win Condition System
- [x] 8 echoes win condition
- [x] All opponent echoes destroyed
- [x] 10 points win condition
- [x] Game end detection and handling

#### 6.3 Scoring System
- [x] Point tracking for destroyed echoes
- [x] Score display
- [x] Point history

### **Phase 7: UI/UX & Polish** ⏳
**Goal:** Enhance user experience and presentation

- [ ] Add an intro screen before the title screen
- [ ] Implement a detailed rulebook in the Rules page
- [ ] Add sound effects for actions, events, and UI feedback

### **Phase 8: Multiplayer Foundation** ⏳
**Goal:** Bring Echoes online with peer-to-peer multiplayer, private game rooms, in-game chat, and basic user accounts/leaderboard. Host on narju.net.

#### 8.1 Server & Hosting Setup
- [ ] Set up a Node.js/Express backend server (for signaling, user accounts, and leaderboard)
- [ ] Integrate WebSocket (e.g., socket.io) for real-time communication and game state sync
- [ ] Prepare deployment pipeline for both frontend and backend
- [ ] Configure DNS and SSL for narju.net

#### 8.2 Peer-to-Peer Multiplayer
- [ ] Implement signaling server for peer-to-peer connection setup (WebRTC or similar)
- [ ] Allow users to create and join private game rooms (room code or invite link)
- [ ] Ensure game state is synchronized between peers (authoritative state can be agreed upon or one peer can be host)
- [ ] Handle reconnections and dropped peers gracefully

#### 8.3 In-Game Chat
- [ ] Add real-time chat to each game room (WebSocket or WebRTC data channel)
- [ ] Display chat messages in the game UI
- [ ] Basic moderation (profanity filter, message rate limit)

#### 8.4 User Accounts
- [ ] Implement simple registration and login (username + password, or email)
- [ ] Store user records (wins/losses) in backend database
- [ ] Session management (JWT or cookie-based)

#### 8.5 Leaderboard
- [ ] Create a leaderboard page listing users ranked by win/loss record
- [ ] Update leaderboard in real-time or on game end
- [ ] Display user's own rank and stats

#### 8.6 Deployment
- [ ] Deploy frontend (React/Vite) to narju.net (Vercel, Netlify, or custom VPS)
- [ ] Deploy backend (Node.js/Express) to same domain or subdomain (e.g., api.narju.net)
- [ ] Set up HTTPS for secure connections
- [ ] Monitor uptime and errors

#### 8.7 Stretch Goals (Optional for Later)
- [ ] Add support for spectators
- [ ] Implement friend system or persistent lobbies
- [ ] Add more advanced leaderboard features (ELO, match history)

### **Phase 9: AI Implementation** ⏳
**Goal**: Create AI opponent for single-player testing

#### 9.1 Basic AI Framework
- [ ] AI decision making system
- [ ] Action selection algorithms
- [ ] Strategic positioning
- [ ] Defensive behavior

#### 9.2 AI Difficulty Levels
- [ ] Easy: Basic movement and simple attacks
- [ ] Medium: Strategic positioning and defense
- [ ] Hard: Advanced tactics and prediction

#### 9.3 AI Testing
- [ ] AI vs AI testing
- [ ] Performance optimization
- [ ] Behavior validation

### **Phase 10: Local Testing & Polish** ⏳
**Goal**: Create polished local game experience

#### 10.1 Local Game Mode
- [ ] Single player vs AI
- [ ] Hotseat mode (2 players, same device)
- [ ] Game state persistence
- [ ] Local game history

#### 10.2 UI/UX Polish
- [ ] Responsive design
- [ ] Visual feedback improvements
- [ ] Error handling
- [ ] Loading states

#### 10.3 Performance Optimization
- [ ] Rendering optimization
- [ ] State management efficiency
- [ ] Memory management
- [ ] Animation performance

### **Phase 11: Advanced Features & Future Work** ⏳
**Goal:** Expand multiplayer and competitive features

#### 11.1 Spectator Support
- [ ] Allow users to watch live games

#### 11.2 Advanced Leaderboard & Matchmaking
- [ ] ELO or rating calculation
- [ ] Matchmaking system
- [ ] Game history tracking

#### 11.3 Social & Community Features
- [ ] Friend system
- [ ] Persistent lobbies
- [ ] In-game emotes or reactions

## 🚀 Development Approach

### **Recommended Order**
1. **Phase 1** (Core Framework) - Foundation ✅
2. **Phase 2** (Entity System) - Visual representation ✅
3. **Phase 3** (Action System) - Game mechanics ✅
4. **Phase 4** (Input System) - Playable game 🔄
5. **Phase 5-6** (Replay & Rules) - Complete game loop 🔄
6. **Phase 7** (UI/UX & Polish) - Intro, rulebook, sound effects ⏳
7. **Phase 8** (Multiplayer Foundation) - Online play ⏳
8. **Phase 9** (AI) - Single player testing ⏳
9. **Phase 10** (Local Testing & Polish) ⏳
10. **Phase 11** (Advanced Features & Future Work) ⏳

### **Parallel Development**
- UI components can be developed alongside game logic
- Testing can begin as soon as basic systems are in place
- Documentation should be updated throughout development

### **Testing Strategy**
- **Unit Testing**: Game logic functions
- **Integration Testing**: Multiplayer functionality
- **User Testing**: UI/UX validation
- **Performance Testing**: Animation and state management

## 📊 Success Metrics

### **Phase 1-4**: Core Game 🔄
- [x] Playable local game with basic mechanics
- [x] All actions working correctly
- [x] Visual feedback for all interactions
- [x] Turn structure functioning

### **Phase 5-6**: Complete Game Loop 🔄
- [x] Full replay system working
- [x] All win conditions implemented
- [ ] AI opponent functional
- [ ] Game balance validated

### **Phase 7-9**: Polish & Multiplayer ⏳
- [ ] Smooth user experience
- [ ] Multiplayer functionality
- [ ] User authentication
- [ ] Leaderboard system

### **Phase 10-11**: Advanced Features & Future Work ⏳
- [ ] Spectator support
- [ ] Advanced leaderboard and matchmaking
- [ ] Social and community features

## 🎯 Current Status & Next Steps

### **Completed (Phases 1-6)** ✅
- **Core Framework**: React TypeScript with Vite, proper project structure
- **Game State**: Complete state management with reducer pattern
- **Entity System**: Echoes, projectiles, mines, and shields fully implemented
- **Action System**: All 5 actions (Walk, Dash, Fire, Mine, Shield) working
- **Input System**: Full action assignment interface with New Echo and Extend Echo functionality
- **Replay System**: Tick-by-tick execution, entity destruction, and win condition checking
- **Game Rules**: Collision detection, scoring, and win conditions fully implemented

### **Recently Fixed** ✅
1. **Entity Destruction**: Destroyed echoes now properly removed from future phases
2. **Action Misassignment**: Fixed bug where actions were incorrectly applied to wrong echoes after destruction
3. **Simulation Termination**: Fixed replay stopping early due to incorrect action calculation
4. **Echo Preview System**: Semi-transparent rendering of ally echoes during action assignment
5. **Shield Deactivation**: Fixed shield mechanics to properly deactivate after blocking a projectile
6. **Consecutive Shield Prevention**: Prevent shield action from appearing if last action was shield
7. **Shield Block Animation**: Green explosion animation positioned at tile edge where projectile hit shield
8. **Win conditions and scoring system fully implemented and tested**
9. **Projectile/mine collision animations restored**

### **Current Game Features** 🎮
- ✅ 8x8 tactical board with proper labeling
- ✅ Echo placement and action assignment (new echoes and extend echoes)
- ✅ All 5 action types with proper costs and validation
- ✅ Basic replay system with collision detection
- ✅ Shield mechanics and directional protection (fully balanced)
- ✅ Turn-based gameplay with phase transitions
- ✅ Extend Echo functionality with proper tick numbering
- ✅ Entity destruction and lifecycle management (recently fixed)
- ✅ Echo Preview System with semi-transparent ally rendering
- ✅ Shield block animations with edge positioning and green particles
- ✅ Win conditions (all types) implemented
- ✅ Scoring system (fully implemented)

### **Next Priority: Complete Echo Preview System** 🔧
1. **Projectile trail visualization** for ally previews ✅
2. **Potential collision indicators** to show dangerous areas

---

**Note:**
Movement is not restricted in the input phase based on previews, because the preview is only a prediction and may not reflect the actual board state (e.g., a projectile may be destroyed before a move). This allows for more strategic and flexible play.

This plan provides a clear roadmap for building Echoes from concept to completion! The core mechanics and input system are now fully functional, with extend echo feature working correctly. Entity destruction and action assignment have been fixed. Echo Preview System is implemented and working well. Next priorities are completing the Echo Preview System features and implementing game balance improvements, particularly shield mechanics rebalancing. 