# Echoes - Complete Game Rules

## 🎯 Game Overview

Echoes is a tactical turn-based game played on an 8x8 grid where two players control entities called "Echoes." The board is labeled with columns A-H (left to right) and rows 1-8 (bottom to top, like chess notation). Players assign actions secretly during the Input Phase, then watch all actions execute simultaneously during the Replay Phase.

## 🏗️ Game Board

### Grid Layout
- **Size**: 8x8 square grid
- **Columns**: Labeled A-H (left to right)
- **Rows**: Labeled 1-8 (bottom to top, like chess)
- **Visual**: Black background with white grid lines and white labels

### Player Territories
- **Player 1 (Red)**: Home row is Row 1 (A1-H1, bottom row)
- **Player 2 (Blue)**: Home row is Row 8 (A8-H8, top row)

## 🎮 Game Entities

### Echoes
- **Appearance**: Large filled circles
- **Player 1**: Red echoes
- **Player 2**: Blue echoes
- **Spawn**: On home rows (A1-H1 for P1, A8-H8 for P2)
- **Limit**: Maximum 8 echoes per player (one per column)

### Projectiles
- **Appearance**: Small filled white circles
- **Movement**: Travel 1 tile per tick automatically
- **Lifetime**: Despawn when occupying same tile as another entity
- **Creation**: Via Fire action (2 action points)

### Mines
- **Appearance**: Small filled white circles (same as projectiles)
- **Movement**: Stationary
- **Lifetime**: Despawn when occupying same tile as another entity
- **Creation**: Via Mine action (2 action points)

### Shields
- **Appearance**: White half-circle outlines pointing in shield direction
- **Protection**: Prevents echo destruction from projectiles approaching from shield direction
- **Activation**: Via Shield action (1 action point)
- **Duration**: Remains active until blocking a projectile or turn ends

## ⏱️ Turn Structure

### Input Phase
1. **Echo Selection**: Choose to create new echo or extend existing echo
2. **Action Assignment**: Assign actions one tick at a time
3. **Action Point Management**: Use all available action points
4. **Turn Submission**: Submit complete turn when all points used

### Replay Phase
1. **Simultaneous Execution**: All echoes execute actions from tick 1
2. **Tick Progression**: Each tick displays for 3 seconds
3. **Collision Resolution**: Entities occupying same tile are destroyed
4. **Phase End**: Replay ends after longest active echo finishes

## 🎯 Actions

### Walk
- **Cost**: 1 action point
- **Effect**: Move echo 1 tile in any direction
- **Validation**: Must be within board boundaries

### Dash
- **Cost**: 2 action points
- **Effect**: Move echo 2 tiles in orthogonal directions
- **Validation**: Must be within board boundaries

### Fire
- **Cost**: 2 action points
- **Effect**: Spawn projectile that travels 1 tile per tick
- **Movement**: Projectile doesn't move the tick it's spawned
- **Direction**: Any direction from echo position

### Mine
- **Cost**: 2 action points
- **Effect**: Spawn stationary projectile
- **Behavior**: Remains in place until collision

### Shield
- **Cost**: 1 action point
- **Effect**: Face shield in orthogonal direction
- **Protection**: Prevents destruction from projectiles approaching from shield direction
- **Duration**: Until blocking projectile or turn ends
- **Limitation**: Doesn't protect against mines or echo collisions

## 🔄 Action Point System

### New Echoes
- **Action Points**: 5 points
- **Requirement**: Must use all points before turn submission
- **Timing**: Points used during current input phase

### Extended Echoes
- **Action Points**: 3 additional points
- **Starting Tick**: After previous instruction list ends
- **Example**: If echo had Dash, Fire, Shield (3 actions), new actions start on tick 4

## 💥 Collision System

### Basic Rules
- **Destruction**: Any 2 entities occupying same tile on same tick are both destroyed
- **Exceptions**: Shield mechanics can prevent echo destruction
- **Types**: Echo-Echo, Echo-Projectile, Echo-Mine, Projectile-Projectile, Projectile-Mine, Mine-Mine

### Shield Mechanics
- **Protection**: Shield prevents echo destruction from projectiles
- **Direction**: Only protects against projectiles approaching from shield direction
- **Detection**: Projectiles that were N, NW, or NE relative to echo on previous tick
- **Result**: Shielded projectile is destroyed, echo survives, shield disappears
- **Limitations**: Doesn't protect against mines or echo collisions

## 🏆 Win Conditions

### Primary Conditions
1. **Echo Count**: Reach 8 echoes (one in each column)
2. **Opponent Destruction**: Destroy all opponent echoes
3. **Point Victory**: Score 10 points

### Scoring System
- **Points**: 1 point per destroyed opponent echo
- **Persistence**: Points carry over between turns
- **Display**: Current score shown during game

## 🎨 Visual System

### Echo Preview During Input
- **Current Echo**: Fully opaque and interactive
- **Other Echoes**: Semi-transparent display
- **Projectile Trails**: Show planned paths during input phase
- **No Collisions**: Input phase shows preview only, no actual collisions

### Replay Phase
- **Tick Duration**: 3 seconds per tick
- **Animations**: Smooth movement and collision animations
- **Synchronization**: All players see same replay simultaneously

## 🔧 Game Flow

### Turn Progression
1. **Input Phase**: Both players assign actions secretly
2. **Turn Submission**: Both players must submit before replay
3. **Replay Phase**: Automatic tick-by-tick execution
4. **Win Check**: Check win conditions after replay
5. **Next Turn**: Repeat if no winner

### Echo Lifecycle
1. **Creation**: Spawn on home row during input phase
2. **Action Assignment**: Receive instruction list
3. **Execution**: Follow instructions during replay
4. **Destruction**: Removed if destroyed during replay
5. **Persistence**: Surviving echoes continue to next turn

## 🎮 Game Modes

### Local Testing
- **Hotseat**: 2 players on same device
- **AI Opponent**: Single player vs computer
- **Local Storage**: Game state persistence

### Multiplayer (Future)
- **Real-time**: 2 players on different devices
- **Synchronization**: WebSocket-based state sync
- **Room System**: Game room creation and joining

## 📊 Technical Specifications

### Performance
- **Animation Speed**: 3 seconds per tick (fixed)
- **State Updates**: Real-time during replay
- **Network**: WebSocket for multiplayer

### Data Persistence
- **Local Games**: Browser storage
- **Multiplayer**: Server-side state management
- **User Data**: Authentication and leaderboard system

## 🐛 Edge Cases & Clarifications

### Action Point Management
- **Unused Points**: Must use all available action points
- **Idle Echoes**: Echoes remain idle after using all points
- **Shield Persistence**: Final shield action remains active for rest of turn

### Entity Behavior
- **Projectile Movement**: Automatic 1 tile per tick during replay only
- **Mine Stationary**: Mines don't move after placement
- **Echo Movement**: Only via assigned actions

### Collision Timing
- **Same Tick**: Entities must occupy same tile on same tick for collision
- **Movement Through**: Echoes can move through projectiles/mines without collision
- **Shield Timing**: Shield protection based on projectile position on previous tick

### Win Condition Priority
- **Simultaneous**: Multiple win conditions can trigger simultaneously
- **Echo Count**: Reaching 8 echoes takes priority
- **Point Victory**: 10 points triggers win regardless of echo count 