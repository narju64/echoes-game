import React from 'react';
import type { Echo, Direction } from '../types/gameTypes';
import Board from './Board';

interface ProjectilePreview {
  row: number;
  col: number;
  type: 'projectile' | 'mine';
  direction: Direction;
}

interface EchoActionPreviewBoardProps {
  echoes: Echo[];
  highlightedTiles: { row: number; col: number }[];
  projectiles: ProjectilePreview[];
  previewEchoes: Echo[];
  previewProjectiles: ProjectilePreview[];
  origin?: { row: number; col: number };
  onDirectionSelect?: (dir: Direction) => void;
}

const EchoActionPreviewBoard: React.FC<EchoActionPreviewBoardProps> = ({
  echoes,
  highlightedTiles,
  projectiles,
  previewEchoes,
  previewProjectiles,
  origin,
  onDirectionSelect,
}) => {
  return (
    <Board
      echoes={echoes}
      highlightedTiles={highlightedTiles}
      projectiles={projectiles}
      previewEchoes={previewEchoes}
      previewProjectiles={previewProjectiles}
      origin={origin}
      onDirectionSelect={onDirectionSelect}
    />
  );
};

export default EchoActionPreviewBoard; 