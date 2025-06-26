# AI Testing & Game Balancing Plan

## 🎯 Overview

This document outlines the strategy for implementing AI testing and game balancing for Echoes. The goal is to create AI agents that can play against each other to test game balance, identify optimal strategies, and help refine game mechanics.

## 🤔 Architecture Decision: Hybrid Approach (Browser → Desktop)

### Recommendation: **Hybrid Approach**

**Phase 1: Browser Development**
- **Purpose**: Rapid prototyping, debugging, and proof of concept
- **Advantages**: 
  - Shared codebase with existing game
  - Visual feedback and immediate results
  - Easy debugging and iteration
  - No setup complexity
- **Limitations**: Browser performance constraints, memory limits

**Phase 2: Desktop Migration**
- **Purpose**: High-performance training and advanced AI development
- **Advantages**:
  - Full CPU/GPU access
  - Unlimited memory and processing time
  - Better ML libraries (TensorFlow, PyTorch)
  - Can train for days/weeks continuously
- **Implementation**: Extract core simulation to Python/Node.js

**Why this hybrid approach is optimal:**
1. **Risk mitigation**: Browser version works even if desktop migration fails
2. **Progressive complexity**: Start simple, scale up when needed
3. **Industry standard**: This is how most serious game AI is developed
4. **Resource optimization**: Use each environment for its strengths

## 🚀 **Deployment Strategy & Scope Clarification**

### **Development Phases**

#### **Phase A: Browser Development (Local)**
- **Location**: Your local development environment
- **Purpose**: AI framework development, basic agents, proof of concept
- **Includes**: All AI infrastructure, training tools, balance analysis
- **Performance**: Browser-constrained (100-1000 games/second)
- **Access**: Only you and collaborators

#### **Phase B: Desktop Training (Local)**
- **Location**: Your local desktop environment
- **Purpose**: High-performance training, advanced AI development
- **Includes**: Core simulation engine, AI agents, training infrastructure
- **Performance**: Full system resources (10,000+ games/second)
- **Access**: Only you and collaborators

#### **Production Version (Public)**
- **Location**: narju.net (your hosted site)
- **Purpose**: Human players playing the game
- **Includes**: Only the game itself + pre-trained AI models
- **Performance**: Optimized for browser, minimal resource usage
- **Access**: Public players

### **What Stays in Each Environment**

#### **Browser Development**
- AI framework and base classes
- Basic rule-based agents
- Tournament systems and balance analysis
- UI for AI training and visualization
- Proof of concept for RL algorithms

#### **Desktop Training**
- High-performance game simulation engine
- Advanced AI agents and training algorithms
- Neural network training infrastructure
- Long-running training processes
- Model export capabilities

#### **Production Deployment**
- Pre-trained AI models (as static files)
- AI vs Human play mode
- Game balance improvements
- No training infrastructure

### **Implementation Strategy**
```typescript
// Browser: Development and testing
if (process.env.NODE_ENV === 'development') {
  // Include all AI training code for development
  import { AITrainingPanel } from './ai/AITrainingPanel';
  import { BalanceAnalyzer } from './ai/BalanceAnalyzer';
}

// Desktop: High-performance training
// Separate Python/Node.js project with shared interfaces
class DesktopGameSimulator {
  // Optimized simulation engine
  runGame(agent1: AIAgent, agent2: AIAgent): GameResult;
  trainModel(agent: AIAgent, games: number): TrainedModel;
}

// Production: Only pre-trained models
if (process.env.NODE_ENV === 'production') {
  // Only include game and pre-trained models
  import { PreTrainedAIAgent } from './ai/PreTrainedAIAgent';
}
```

## 💻 **Performance Expectations by Environment**

### **Browser Capabilities**
- **Basic AI**: 1000+ games/second (rule-based agents)
- **RL Training**: 100-500 games/second (small networks)
- **Memory Limit**: ~4GB total
- **Training Time**: Hours (limited by browser stability)
- **Best For**: Development, debugging, basic balance testing

### **Desktop Capabilities**
- **Basic AI**: 10,000+ games/second (optimized simulation)
- **RL Training**: 1,000-5,000 games/second (full GPU)
- **Memory Limit**: System RAM (16GB+ typical)
- **Training Time**: Days/weeks (unlimited)
- **Best For**: Advanced training, large-scale balance testing

### **Comparison to AlphaZero Performance**

#### **AlphaZero Capabilities**
- **Hardware**: 5000+ TPUs, distributed training
- **Training Time**: Weeks to months
- **Games Played**: Millions per day
- **Model Size**: Massive neural networks
- **Performance**: Superhuman in many games

#### **Your Hybrid Approach Potential**
- **Browser**: 60-70% of AlphaZero potential (limited by constraints)
- **Desktop**: 80-90% of AlphaZero potential (full resources)
- **Combined**: 85-95% of AlphaZero potential (best of both worlds)

## 📋 Implementation Phases

### **Phase 0: Foundational Interface Setup**
**Goal**: Set up the game mode system and basic AI interface structure

#### 0.1 Game Mode System
- [ ] Add mode parameter handling to GamePage component
- [ ] Create ModeSelector component for switching between modes
- [ ] Update routing to handle mode query parameters
- [ ] Implement mode state management

#### 0.2 Menu Integration
- [ ] Update HomePage menu buttons to link to different game modes
- [ ] Add "AI Training" button to main menu
- [ ] Add "vs AI" button for single player mode
- [ ] Rename "Single Player" to "Hotseat" for clarity

#### 0.3 AI Training Panel Foundation
- [ ] Create AITrainingPanel component structure
- [ ] Add basic layout for AI training interface
- [ ] Implement mode-based rendering in GamePage
- [ ] Set up placeholder sections for future AI features

#### 0.4 URL Structure Implementation
- [ ] Implement URL parameter handling for modes
- [ ] Add bookmarkable URLs for each game mode
- [ ] Ensure browser navigation works correctly
- [ ] Test mode switching without page reloads

### **Phase 1: Browser AI Foundation** 
**Goal**: Create the basic AI framework and prove concepts work

#### 1.1 Game Interface Abstraction
- [ ] Create `GameInterface` class that abstracts game state access
- [ ] Implement methods for:
  - Getting current board state
  - Getting available actions for each echo
  - Getting game state (scores, turn, phase)
  - Getting win conditions
  - Getting valid moves for each action type
- [ ] Create `GameSimulator` class for running games without UI

#### 1.2 AI Agent Base Class
- [ ] Create `AIAgent` abstract base class
- [ ] Define interface for:
  - `getAction(gameState, echoId, availableActions)`
  - `onGameEnd(result, gameHistory)`
  - `reset()` for new games
- [ ] Implement basic random agent for testing

#### 1.3 Game Simulation Engine
- [ ] Create headless game runner that can execute games without UI
- [ ] Implement game state cloning for AI evaluation
- [ ] Add game result tracking and statistics
- [ ] Create batch game runner for multiple simulations

### **Phase 2: Browser Basic AI Agents**
**Goal**: Implement various AI strategies for baseline testing

#### 2.1 Rule-Based Agents
- [ ] **Random Agent**: Completely random actions
- [ ] **Greedy Agent**: Always chooses highest-scoring immediate action
- [ ] **Defensive Agent**: Prioritizes shield actions and staying alive
- [ ] **Aggressive Agent**: Prioritizes fire actions and destroying enemies
- [ ] **Position Agent**: Focuses on board positioning and column control

#### 2.2 Simple Heuristic Agents
- [ ] **Score-Based Agent**: Uses simple heuristics to evaluate board state
- [ ] **Distance-Based Agent**: Considers distance to enemies and objectives
- [ ] **Action-Point Agent**: Optimizes action point usage

#### 2.3 Agent Testing Framework
- [ ] Create agent tournament system
- [ ] Implement win-rate tracking
- [ ] Add performance metrics (average game length, score distribution)
- [ ] Create agent comparison tools

### **Phase 3: Browser RL Foundation**
**Goal**: Set up the infrastructure for RL-based AI in browser

#### 3.1 State Representation
- [ ] Design compact state representation for RL
- [ ] Implement state encoding/decoding
- [ ] Create feature extraction from game state
- [ ] Add state normalization

#### 3.2 Action Space
- [ ] Define action space for RL agents
- [ ] Implement action encoding/decoding
- [ ] Create action masking for invalid moves
- [ ] Add action validation

#### 3.3 Reward System
- [ ] Design reward function for different objectives:
  - Win/loss rewards
  - Echo destruction rewards
  - Position control rewards
  - Action efficiency rewards
- [ ] Implement reward shaping
- [ ] Add reward scaling and normalization

### **Phase 4: Browser RL Implementation**
**Goal**: Implement basic RL algorithms to prove concepts work

#### 4.1 Q-Learning Agent
- [ ] Implement Q-learning with experience replay
- [ ] Add epsilon-greedy exploration
- [ ] Implement Q-table or small neural network approximation
- [ ] Add training loop and convergence tracking

#### 4.2 Basic DQN
- [ ] Design small neural network architecture for Q-value approximation
- [ ] Implement experience replay buffer
- [ ] Add target network for stable training
- [ ] Test with limited training (hours, not days)

### **Phase 5: Desktop Migration**
**Goal**: Extract core simulation to desktop for high-performance training

#### 5.1 Core Engine Extraction
- [ ] Create minimal game engine (no UI dependencies)
- [ ] Port game logic to Python/Node.js
- [ ] Implement high-performance simulation engine
- [ ] Create shared interfaces between browser and desktop

#### 5.2 AI Agent Porting
- [ ] Port AI agents to desktop environment
- [ ] Implement model serialization/deserialization
- [ ] Create training infrastructure
- [ ] Set up GPU acceleration

#### 5.3 Advanced Training Setup
- [ ] Implement full TensorFlow/PyTorch training
- [ ] Add distributed training capabilities
- [ ] Create model checkpointing and recovery
- [ ] Set up long-running training processes

### **Phase 6: Desktop Advanced AI**
**Goal**: Implement advanced AI techniques with full resources

#### 6.1 Advanced RL Algorithms
- [ ] Implement full DQN with large networks
- [ ] Add policy gradient methods
- [ ] Implement actor-critic algorithms
- [ ] Add advanced exploration strategies

#### 6.2 Monte Carlo Tree Search (MCTS)
- [ ] Implement basic MCTS algorithm
- [ ] Add UCT (Upper Confidence Bound for Trees) selection
- [ ] Implement simulation policy
- [ ] Add parallel MCTS for better performance

#### 6.3 AlphaZero-Style AI
- [ ] Combine MCTS with neural network evaluation
- [ ] Implement self-play training loop
- [ ] Add neural network for position evaluation
- [ ] Implement policy network for move selection

### **Phase 7: Model Integration**
**Goal**: Export trained models back to browser for production use

#### 7.1 Model Export System
- [ ] Create model serialization format
- [ ] Implement model compression for browser
- [ ] Add model versioning and compatibility
- [ ] Create model validation and testing

#### 7.2 Browser Integration
- [ ] Implement model loading in browser
- [ ] Create pre-trained AI agents
- [ ] Add AI vs Human play mode
- [ ] Optimize model inference for browser

### **Phase 8: Game Balance Analysis**
**Goal**: Use AI to analyze and improve game balance

#### 8.1 Balance Metrics
- [ ] **Win Rate Analysis**: Track win rates between different agent types
- [ ] **Game Length Analysis**: Analyze average game duration
- [ ] **Action Usage Analysis**: Track which actions are most/least used
- [ ] **Position Analysis**: Analyze board position patterns
- [ ] **Score Distribution**: Analyze final score distributions

#### 8.2 Balance Testing Framework
- [ ] Create automated balance testing suite
- [ ] Implement statistical significance testing
- [ ] Add regression testing for balance changes
- [ ] Create balance report generation

#### 8.3 Balance Improvement Process
- [ ] Identify balance issues through AI analysis
- [ ] Propose rule changes based on AI behavior
- [ ] Test proposed changes with AI
- [ ] Iterate until balance is achieved

## 🛠 Technical Implementation Details

### **File Structure (Browser)**
```
src/
├── ai/
│   ├── agents/
│   │   ├── base/
│   │   │   ├── AIAgent.ts
│   │   │   └── GameInterface.ts
│   │   ├── rule-based/
│   │   │   ├── RandomAgent.ts
│   │   │   ├── GreedyAgent.ts
│   │   │   └── HeuristicAgent.ts
│   │   ├── rl/
│   │   │   ├── QLearningAgent.ts
│   │   │   └── DQNAgent.ts
│   │   └── pretrained/
│   │       └── PreTrainedAgent.ts
│   ├── training/
│   │   ├── TrainingManager.ts
│   │   ├── ExperienceBuffer.ts
│   │   └── ModelManager.ts
│   ├── evaluation/
│   │   ├── BalanceAnalyzer.ts
│   │   ├── TournamentManager.ts
│   │   └── MetricsCollector.ts
│   └── utils/
│       ├── StateEncoder.ts
│       ├── ActionEncoder.ts
│       └── RewardCalculator.ts
├── simulation/
│   ├── GameSimulator.ts
│   ├── HeadlessGameRunner.ts
│   └── BatchSimulator.ts
└── ui/
    ├── AI/
    │   ├── AITrainingPanel.tsx
    │   ├── AgentComparison.tsx
    │   └── BalanceAnalysis.tsx
    └── components/
        └── AIGameViewer.tsx
```

### **File Structure (Desktop)**
```
desktop-ai/
├── core/
│   ├── game_engine.py
│   ├── simulation.py
│   └── interfaces.py
├── agents/
│   ├── base_agent.py
│   ├── rule_based/
│   ├── rl/
│   └── mcts/
├── training/
│   ├── trainer.py
│   ├── models.py
│   └── utils.py
├── models/
│   └── trained_models/
└── export/
    └── browser_models/
```

### **Key Interfaces (Shared)**
```typescript
// Shared between browser and desktop
interface GameInterface {
  getCurrentState(): GameState;
  getAvailableActions(echoId: string): Action[];
  isValidAction(echoId: string, action: Action): boolean;
  executeAction(echoId: string, action: Action): GameState;
  isGameOver(): boolean;
  getWinner(): PlayerId | null;
  getReward(playerId: PlayerId): number;
}

interface AIAgent {
  getAction(gameState: GameState, echoId: string, availableActions: Action[]): Action;
  onGameEnd(result: GameResult, history: GameHistory): void;
  reset(): void;
  getName(): string;
  getDescription(): string;
  // For desktop training
  train(episodes: number): void;
  saveModel(path: string): void;
  loadModel(path: string): void;
}
```

## 📊 Success Metrics

### **Phase 0 Metrics (Interface Setup)**
- Game mode system working with URL parameters
- Menu buttons correctly linking to different modes
- AI training panel structure in place
- Mode switching working without page reloads
- **Timeline**: 1 week

### **Browser Phase Metrics**
- Basic AI agents working and playing games
- Tournament system functional
- Basic balance analysis working
- RL agents training and improving
- **Timeline**: 2-3 weeks

### **Desktop Phase Metrics**
- 10,000+ games/second simulation speed
- Advanced AI agents achieving strong performance
- Models exportable to browser
- Comprehensive balance testing
- **Timeline**: 3-4 weeks

### **Final Metrics**
- AI performance: 85-95% of AlphaZero potential
- Balance testing: Complete analysis in <1 hour
- Production ready: Pre-trained models in browser
- **Total Timeline**: 7-12 weeks

## 🚀 Getting Started

### **Immediate Next Steps**
1. Set up game mode system and URL parameter handling
2. Create ModeSelector component
3. Update HomePage menu buttons
4. Create AITrainingPanel component structure
5. Test mode switching functionality

### **First Milestone (Interface Setup)**
- Game modes accessible via menu and URL
- AI training panel structure in place
- Mode switching working smoothly
- Foundation ready for AI development

### **Second Milestone (Browser AI)**
- Have 3-5 different AI agents that can play complete games
- Run 1000+ games between different agent combinations
- Generate basic balance report
- Identify obvious balance issues

### **Third Milestone (Desktop Migration)**
- Extract core simulation to desktop
- Achieve 10x performance improvement
- Train advanced AI models
- Export models back to browser

### **Timeline Estimate**
- **Phase 0**: 1 week (interface setup)
- **Phase 1-2**: 1-2 weeks (browser basic AI)
- **Phase 3-4**: 1-2 weeks (browser RL proof of concept)
- **Phase 5**: 1-2 weeks (desktop migration)
- **Phase 6**: 2-3 weeks (desktop advanced AI)
- **Phase 7-8**: 1-2 weeks (integration and balance analysis)

**Total**: 7-12 weeks for complete implementation

## 🎮 Integration with Existing Game

### **UI Integration**
- Add AI training panel to the main game (browser)
- Create agent vs agent game viewer
- Add balance analysis dashboard
- Implement AI vs human play mode (with pre-trained models)

### **Development Workflow**
1. Develop and test AI concepts in browser
2. Migrate to desktop for serious training
3. Export trained models back to browser
4. Use AI for balance testing and improvement
5. Deploy improved game to production

### **Production Considerations**
- Only pre-trained models included in production build
- AI training code excluded via tree-shaking
- Models can be updated without code changes
- Training progress can be monitored and visualized

This hybrid approach provides the best balance of development speed, performance, and risk mitigation while leveraging the strengths of both browser and desktop environments. 