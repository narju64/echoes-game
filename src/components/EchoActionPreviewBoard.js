import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import Board from './Board';
const EchoActionPreviewBoard = ({ echoes, highlightedTiles, projectiles, previewEchoes, previewProjectiles, origin, onDirectionSelect, }) => {
    return (_jsx(Board, { echoes: echoes, highlightedTiles: highlightedTiles, projectiles: projectiles, previewEchoes: previewEchoes, previewProjectiles: previewProjectiles, origin: origin, onDirectionSelect: onDirectionSelect }));
};
export default EchoActionPreviewBoard;
