import type { Graphics } from 'pixi.js';
import type { MapBoardView } from '../runtime/mapBoardView';

export function drawMapBoard(graphics: Graphics, mapBoardView: MapBoardView): void {
  mapBoardView.edges.forEach((edge) => {
    graphics.moveTo(edge.from.x, edge.from.y).lineTo(edge.to.x, edge.to.y).stroke({
      color: edge.color,
      width: edge.width,
      alpha: edge.alpha
    });
  });

  mapBoardView.nodes.forEach((node) => {
    if (node.goal) {
      graphics.circle(node.x, node.y, node.radius + 12).stroke({ color: '#f59e0b', width: 2.5, alpha: 0.55 });
    }
    if (node.glowRadius && node.glowColor) {
      graphics.circle(node.x, node.y, node.glowRadius).fill({ color: node.glowColor, alpha: node.current ? 0.2 : 0.16 });
    }
    if (node.outline) {
      graphics.circle(node.x, node.y, node.radius + 4).stroke({ color: '#0f172a', width: 2, alpha: 0.6 });
    }

    graphics.circle(node.x, node.y, node.radius).fill(node.fill);

    if (node.innerDot) {
      graphics.circle(node.x, node.y, Math.max(2, node.radius - 5)).fill('#f8fafc');
    }

    node.intelMarkers.forEach((marker) => {
      graphics
        .circle(node.x + marker.xOffset, node.y + marker.yOffset, marker.radius)
        .fill(marker.fill)
        .circle(node.x + marker.xOffset, node.y + marker.yOffset, marker.radius + 1.4)
        .stroke({ color: '#0f172a', width: 1.3, alpha: 0.55 });
    });

    if (node.starRadius) {
      graphics
        .moveTo(node.x, node.y - node.starRadius)
        .lineTo(node.x + 4, node.y - 2)
        .lineTo(node.x + node.starRadius, node.y)
        .lineTo(node.x + 4, node.y + 2)
        .lineTo(node.x, node.y + node.starRadius)
        .lineTo(node.x - 4, node.y + 2)
        .lineTo(node.x - node.starRadius, node.y)
        .lineTo(node.x - 4, node.y - 2)
        .closePath()
        .stroke({ color: '#fbbf24', width: 1.6, alpha: 0.65 });
    }
  });
}
