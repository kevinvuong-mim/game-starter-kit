export const PANEL_INNER_PADDING = 20;
export const PANEL_WIDTH_RATIO = 0.72;

export interface PanelLayoutMetrics {
  width: number;
  height: number;
  centerX: number;
  panelWidth: number;
  innerWidth: number;
  innerPadding: number;
}

export function getPanelLayoutMetrics(camera: Phaser.Cameras.Scene2D.Camera): PanelLayoutMetrics {
  const { width, height } = camera;
  const panelWidth = width * PANEL_WIDTH_RATIO;

  return {
    width,
    height,
    panelWidth,
    centerX: width / 2,
    innerPadding: PANEL_INNER_PADDING,
    innerWidth: panelWidth - PANEL_INNER_PADDING * 2,
  };
}
