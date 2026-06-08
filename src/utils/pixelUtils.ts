export function generatePixelAvatar(seed: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const colors = ['#ff2d95', '#00d4ff', '#39ff14', '#ffdd00', '#ff6b35', '#9b59b6'];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  const pixelSize = 8;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 4; x++) {
      const colorIndex = Math.abs((hash >> (y * 3 + x)) % colors.length);
      ctx.fillStyle = colors[colorIndex];
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      ctx.fillRect((7 - x) * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }
  }

  return canvas.toDataURL();
}

export function createEmptyGrid(size: number) {
  const grid = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      row.push({
        x,
        y,
        color: null,
        teamId: null,
        painterId: null,
        lastPainted: 0,
      });
    }
    grid.push(row);
  }
  return grid;
}

export function findConnectedAreas(
  grid: any[][],
  teamId: string,
  minSize: number = 25
) {
  const size = grid.length;
  const visited = new Set<string>();
  const areas: any[] = [];

  const directions = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const key = `${x},${y}`;
      if (visited.has(key) || grid[y][x].teamId !== teamId) continue;

      const queue = [{ x, y }];
      const cells = [];
      visited.add(key);

      while (queue.length > 0) {
        const cell = queue.shift()!;
        cells.push({ x: cell.x, y: cell.y });

        for (const [dx, dy] of directions) {
          const nx = cell.x + dx;
          const ny = cell.y + dy;
          const nkey = `${nx},${ny}`;
          if (
            nx >= 0 &&
            nx < size &&
            ny >= 0 &&
            ny < size &&
            !visited.has(nkey) &&
            grid[ny][nx].teamId === teamId
          ) {
            visited.add(nkey);
            queue.push({ x: nx, y: ny });
          }
        }
      }

      if (cells.length >= minSize) {
        areas.push({
          id: `area_${Date.now()}_${Math.random()}`,
          teamId,
          cells,
          bonus: Math.min(50, Math.floor(cells.length / minSize) * 20),
          createdAt: Date.now(),
        });
      }
    }
  }

  return areas;
}

export function calculateScores(grid: any[][], teams: any[]) {
  const total = grid.length * grid.length;
  const counts: { [key: string]: number } = {};

  teams.forEach((t) => (counts[t.id] = 0));

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      if (grid[y][x].teamId) {
        counts[grid[y][x].teamId]++;
      }
    }
  }

  return teams.map((t) => ({
    ...t,
    score: counts[t.id],
    percent: Math.round((counts[t.id] / total) * 100),
  }));
}

export function gridToImage(grid: any[][], cellSize: number = 10): string {
  const size = grid.length;
  const canvas = document.createElement('canvas');
  canvas.width = size * cellSize;
  canvas.height = size * cellSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = grid[y][x].color || '#1a0a2e';
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  return canvas.toDataURL('image/png');
}

export function downloadImage(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function getCooldownPercent(lastUsed: number, cooldown: number): number {
  const elapsed = Date.now() - lastUsed;
  return Math.min(100, (elapsed / cooldown) * 100);
}
