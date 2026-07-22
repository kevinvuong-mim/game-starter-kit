import Phaser from 'phaser';

import {
  PANEL_BG,
  TEXT_COLOR,
  PANEL_BORDER,
  PANEL_CORNER_RADIUS,
  PANEL_LIST_PADDING,
} from '../panel/panelTheme';
import { toast } from '../toast/ToastManager';
import { guest } from '@platform/modules/guest';
import { FREDOKA_FONT } from '@platform/ui/fonts';
import { drawRoundedRect } from '../panel/graphics';
import { createUIButton } from '../button/UIButton';
import { soundManager } from '@platform/ui/audio/SoundManager';
import { t, i18n } from '@platform/modules/i18n/i18n.service';
import { settings } from '@platform/modules/settings/settings.service';

const LANGUAGE_GLOBE_KEY = 'language-globe-icon';

const SECTION_TITLE_COLOR = '#1c1b18';
const LABEL_COLOR = '#3a372f';
const DIVIDER_COLOR = 0xb5974f;
const INPUT_BG = '#ffffff';
const INPUT_TEXT = '#1c1b18';
const INPUT_BORDER = '#d4c09a';

const TOGGLE_WIDTH = 72;
const TOGGLE_HEIGHT = 36;
const TOGGLE_KNOB = 14;
const TOGGLE_ON = 0x1f6b32;
const TOGGLE_OFF = 0x8a8a8a;

const MAX_NAME_LENGTH = 32;
const SAVE_BTN_WIDTH = 100;
const SAVE_BTN_HEIGHT = 66;
const INPUT_HEIGHT = 58;
const LEGAL_BTN_HEIGHT = 78;
const LEGAL_BTN_GAP = 12;
const ROW_ICON_SIZE = 36;
const DIVIDER_GAP = 30;

const LANGUAGES = [
  { code: 'en', labelKey: 'settings.languageEn' as const },
  { code: 'vi', labelKey: 'settings.languageVi' as const },
] as const;

/**
 * Settings UI — Shop-style beige panel matching the settings mock.
 */
export class SettingsPanel extends Phaser.GameObjects.Container {
  private readonly onBack: () => void;
  private readonly onNavigate: (sceneKey: string, data?: Record<string, unknown>) => void;

  private saving = false;
  private languageOpen = false;
  private inputElement?: HTMLInputElement;
  private domElement?: Phaser.GameObjects.DOMElement;
  private languageMenu?: Phaser.GameObjects.Container;
  private languageLabel?: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    options: {
      onBack: () => void;
      onNavigate: (sceneKey: string, data?: Record<string, unknown>) => void;
    }
  ) {
    super(scene, 0, 0);
    this.onBack = options.onBack;
    this.onNavigate = options.onNavigate;
    scene.add.existing(this);
    this.build();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  destroy(fromScene?: boolean): void {
    this.cleanup();
    super.destroy(fromScene);
  }

  private cleanup(): void {
    this.domElement?.destroy();
    this.domElement = undefined;
    this.inputElement = undefined;
  }

  private build(): void {
    const { width, height } = this.scene.cameras.main;
    const panelWidth = Math.min(width * 0.94, 440);
    const panelTop = height * 0.22;
    const contentLeft = width / 2 - panelWidth / 2 + PANEL_LIST_PADDING + 8;
    const contentRight = width / 2 + panelWidth / 2 - PANEL_LIST_PADDING - 8;
    const contentWidth = contentRight - contentLeft;

    this.add(
      createUIButton({
        scene: this.scene,
        size: { width: 80, height: 80 },
        background: { key: 'back-icon' },
        onClick: this.onBack,
        position: { x: width * 0.18, y: height * 0.08 },
      })
    );

    this.buildBanner(width, height);
    const panelInsertIndex = this.length;

    let cursorY = panelTop + PANEL_LIST_PADDING + 8;

    cursorY = this.buildProfileSection(contentLeft, contentRight, contentWidth, cursorY);
    cursorY = this.addDivider(width / 2, cursorY + DIVIDER_GAP, contentWidth + 24) + DIVIDER_GAP;
    cursorY = this.buildAudioSection(contentLeft, contentRight, cursorY);
    cursorY = this.addDivider(width / 2, cursorY + DIVIDER_GAP, contentWidth + 24) + DIVIDER_GAP;
    cursorY = this.buildLanguageSection(contentLeft, contentRight, contentWidth, cursorY);
    cursorY = this.addDivider(width / 2, cursorY + DIVIDER_GAP, contentWidth + 24) + DIVIDER_GAP;
    cursorY = this.buildLegalSection(contentLeft, contentRight, contentWidth, cursorY);

    const panelHeight = cursorY - panelTop + PANEL_LIST_PADDING + 16;
    const panel = this.scene.add.graphics();
    drawRoundedRect(
      panel,
      width / 2 - panelWidth / 2,
      panelTop,
      panelWidth,
      panelHeight,
      PANEL_CORNER_RADIUS,
      PANEL_BG,
      PANEL_BORDER
    );
    this.addAt(panel, panelInsertIndex);
  }

  private buildBanner(width: number, height: number): void {
    const bannerY = height * 0.16;
    const banner = this.scene.add.image(width / 2, bannerY, 'shop-banner');
    const targetWidth = Math.min(width * 0.72, 360);
    const targetHeight = banner.height * (targetWidth / banner.width);
    banner.setDisplaySize(targetWidth, targetHeight);
    this.add(banner);

    this.add(
      this.scene.add
        .text(width / 2, bannerY - 14, t('settings.title').toUpperCase(), {
          fontSize: '42px',
          color: '#ffffff',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 5,
          fontFamily: FREDOKA_FONT,
        })
        .setOrigin(0.5)
    );
  }

  private buildProfileSection(
    left: number,
    right: number,
    contentWidth: number,
    startY: number
  ): number {
    let y = startY;

    this.add(
      this.scene.add
        .text(left, y, t('settings.profile').toUpperCase(), {
          fontSize: '22px',
          fontStyle: 'bold',
          color: SECTION_TITLE_COLOR,
          fontFamily: FREDOKA_FONT,
        })
        .setOrigin(0, 0)
    );
    y += 34;

    this.add(
      this.scene.add
        .text(left, y, t('settings.playerName'), {
          fontSize: '16px',
          color: LABEL_COLOR,
          fontFamily: FREDOKA_FONT,
        })
        .setOrigin(0, 0)
    );
    y += 28;

    const saveWidth = SAVE_BTN_WIDTH;
    const gap = 10;
    const inputWidth = Math.max(140, contentWidth - saveWidth - gap);
    const rowCenterY = y + INPUT_HEIGHT / 2;

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = MAX_NAME_LENGTH;
    input.placeholder = t('settings.playerNamePlaceholder');
    input.value = guest.getName() ?? '';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.style.cssText = [
      `width: ${inputWidth}px`,
      `height: ${INPUT_HEIGHT}px`,
      'padding: 0 14px',
      `border: 2px solid ${INPUT_BORDER}`,
      'border-radius: 12px',
      `background: ${INPUT_BG}`,
      `color: ${INPUT_TEXT}`,
      'font-size: 18px',
      'font-weight: 600',
      'font-family: Fredoka, sans-serif',
      'outline: none',
      'box-sizing: border-box',
      `caret-color: ${INPUT_TEXT}`,
      '-webkit-user-select: text',
      'user-select: text',
    ].join(';');
    this.inputElement = input;

    this.domElement = this.scene.add.dom(left + inputWidth / 2, rowCenterY, input);
    this.domElement.setOrigin(0.5);
    this.domElement.updateSize();

    this.add(
      createUIButton({
        scene: this.scene,
        position: { x: right - saveWidth / 2, y: rowCenterY },
        size: { width: saveWidth, height: SAVE_BTN_HEIGHT },
        background: { key: 'leaderboard-button-background' },
        text: {
          content: t('settings.playerNameSave').toUpperCase(),
          style: {
            fontSize: 22,
            fontStyle: 'bold',
            border: { width: 3, color: '#000000' },
          },
        },
        onClick: () => {
          void this.handleSave();
        },
      })
    );

    return y + INPUT_HEIGHT;
  }

  private buildAudioSection(left: number, right: number, startY: number): number {
    let y = startY;
    const current = settings.getSettings();

    this.add(
      this.scene.add
        .text(left, y, t('settings.sound').toUpperCase(), {
          fontSize: '22px',
          fontStyle: 'bold',
          color: SECTION_TITLE_COLOR,
          fontFamily: FREDOKA_FONT,
        })
        .setOrigin(0, 0)
    );
    y += 40;

    y = this.buildAudioRow(
      left,
      right,
      y,
      'musical-note-icon',
      t('settings.music'),
      current.musicEnabled,
      async (enabled) => {
        await settings.setMusicEnabled(enabled);
        soundManager.syncMusic();
      }
    );

    y = this.buildAudioRow(
      left,
      right,
      y,
      'speaker-icon',
      t('settings.soundEffects'),
      current.soundEnabled,
      async (enabled) => {
        await settings.setSoundEnabled(enabled);
      }
    );

    return y;
  }

  private buildAudioRow(
    left: number,
    right: number,
    y: number,
    iconKey: string,
    label: string,
    enabled: boolean,
    onToggle: (enabled: boolean) => void | Promise<void>
  ): number {
    const rowHeight = 48;
    const centerY = y + rowHeight / 2;

    const icon = this.scene.add.image(left + ROW_ICON_SIZE / 2, centerY, iconKey);
    icon.setDisplaySize(ROW_ICON_SIZE, ROW_ICON_SIZE);
    this.add(icon);

    this.add(
      this.scene.add
        .text(left + ROW_ICON_SIZE + 12, centerY, label, {
          fontSize: '20px',
          fontStyle: 'bold',
          color: TEXT_COLOR,
          fontFamily: FREDOKA_FONT,
        })
        .setOrigin(0, 0.5)
    );

    this.add(
      createToggle(this.scene, right - TOGGLE_WIDTH / 2, centerY, enabled, (next) => {
        void onToggle(next);
      })
    );

    return y + rowHeight + 8;
  }

  private buildLanguageSection(
    left: number,
    right: number,
    contentWidth: number,
    startY: number
  ): number {
    let y = startY;

    this.add(
      this.scene.add
        .text(left, y, t('settings.language').toUpperCase(), {
          fontSize: '22px',
          fontStyle: 'bold',
          color: SECTION_TITLE_COLOR,
          fontFamily: FREDOKA_FONT,
        })
        .setOrigin(0, 0)
    );
    y += 36;

    const dropdownHeight = 52;
    const centerX = (left + right) / 2;
    const centerY = y + dropdownHeight / 2;

    const bg = this.scene.add.graphics();
    drawRoundedRect(bg, left, y, contentWidth, dropdownHeight, 12, 0xffffff, DIVIDER_COLOR, 2);
    this.add(bg);

    const globe = this.scene.add.image(left + 28, centerY, LANGUAGE_GLOBE_KEY);
    globe.setDisplaySize(28, 28);
    this.add(globe);

    const currentCode = i18n.getCurrentLanguage();
    const currentLabel = t(
      LANGUAGES.find((lang) => lang.code === currentCode)?.labelKey ?? 'settings.languageEn'
    );

    this.languageLabel = this.scene.add
      .text(left + 56, centerY, currentLabel, {
        fontSize: '20px',
        fontStyle: 'bold',
        color: TEXT_COLOR,
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0, 0.5);
    this.add(this.languageLabel);

    const chevron = this.scene.add.graphics();
    chevron.fillStyle(0x1c1b18, 1);
    chevron.fillTriangle(right - 28, centerY - 4, right - 16, centerY - 4, right - 22, centerY + 6);
    this.add(chevron);

    const hit = this.scene.add
      .rectangle(centerX, centerY, contentWidth, dropdownHeight, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.toggleLanguageMenu(left, right, y + dropdownHeight + 4));
    this.add(hit);

    return y + dropdownHeight;
  }

  private buildLegalSection(
    left: number,
    right: number,
    contentWidth: number,
    startY: number
  ): number {
    let y = startY;

    this.add(
      this.scene.add
        .text(left, y, t('settings.termsPrivacy').toUpperCase(), {
          fontSize: '22px',
          fontStyle: 'bold',
          color: SECTION_TITLE_COLOR,
          fontFamily: FREDOKA_FONT,
        })
        .setOrigin(0, 0)
    );
    y += 36;

    const btnWidth = (contentWidth - LEGAL_BTN_GAP) / 2;
    const centerY = y + LEGAL_BTN_HEIGHT / 2;

    this.add(
      createUIButton({
        scene: this.scene,
        position: { x: left + btnWidth / 2, y: centerY },
        size: { width: btnWidth, height: LEGAL_BTN_HEIGHT },
        background: { key: 'leaderboard-button-background' },
        text: {
          content: t('settings.terms').toUpperCase(),
          style: {
            fontSize: 18,
            fontStyle: 'bold',
            border: { width: 3, color: '#000000' },
          },
        },
        onClick: () => this.onNavigate('Legal', { tab: 'terms' }),
      })
    );

    this.add(
      createUIButton({
        scene: this.scene,
        position: { x: right - btnWidth / 2, y: centerY },
        size: { width: btnWidth, height: LEGAL_BTN_HEIGHT },
        background: { key: 'leaderboard-button-background' },
        text: {
          content: t('settings.privacy').toUpperCase(),
          style: {
            fontSize: 18,
            fontStyle: 'bold',
            border: { width: 3, color: '#000000' },
          },
        },
        onClick: () => this.onNavigate('Legal', { tab: 'privacy' }),
      })
    );

    return y + LEGAL_BTN_HEIGHT;
  }

  private toggleLanguageMenu(left: number, right: number, top: number): void {
    if (this.languageOpen) {
      this.closeLanguageMenu();
      return;
    }

    this.languageOpen = true;
    const menuWidth = right - left;
    const rowHeight = 48;
    const menuHeight = LANGUAGES.length * rowHeight;
    const menu = this.scene.add.container(0, 0).setDepth(20);

    const bg = this.scene.add.graphics();
    drawRoundedRect(bg, left, top, menuWidth, menuHeight, 12, 0xffffff, DIVIDER_COLOR, 2);
    menu.add(bg);

    LANGUAGES.forEach((lang, index) => {
      const rowY = top + rowHeight * index + rowHeight / 2;
      const active = i18n.getCurrentLanguage() === lang.code;
      const label = t(lang.labelKey);

      const rowHit = this.scene.add
        .rectangle(left + menuWidth / 2, rowY, menuWidth, rowHeight, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      menu.add(rowHit);

      menu.add(
        this.scene.add
          .text(left + 20, rowY, active ? `${label} ✓` : label, {
            fontSize: '18px',
            fontStyle: 'bold',
            color: TEXT_COLOR,
            fontFamily: FREDOKA_FONT,
          })
          .setOrigin(0, 0.5)
      );

      rowHit.on('pointerdown', async () => {
        this.closeLanguageMenu();
        if (active) return;
        await settings.setLanguage(lang.code);
        toast.show({ message: label, type: 'success', duration: 1500 });
        this.scene.scene.restart();
      });
    });

    this.languageMenu = menu;
    this.add(menu);
  }

  private closeLanguageMenu(): void {
    this.languageMenu?.destroy(true);
    this.languageMenu = undefined;
    this.languageOpen = false;
  }

  private addDivider(centerX: number, y: number, width: number): number {
    this.add(this.scene.add.rectangle(centerX, y, width * 0.92, 2, DIVIDER_COLOR, 0.45));
    return y;
  }

  private async handleSave(): Promise<void> {
    if (this.saving) return;

    const name = this.inputElement?.value.trim() ?? '';
    if (!name) {
      toast.show({ message: t('settings.playerNameRequired'), type: 'warning' });
      return;
    }

    if (guest.getStatus() !== 'ready') {
      toast.show({ message: t('settings.playerNameOffline'), type: 'warning' });
      return;
    }

    this.saving = true;
    try {
      const result = await guest.updateName(name);
      toast.show({
        message: result.synced
          ? t('settings.playerNameUpdated')
          : t('settings.playerNameSavedLocally'),
        type: 'success',
      });
    } catch {
      toast.show({ message: t('settings.playerNameFailed'), type: 'error' });
    } finally {
      this.saving = false;
    }
  }
}

function createToggle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  initial: boolean,
  onChange: (enabled: boolean) => void
): Phaser.GameObjects.Container {
  let enabled = initial;
  const container = scene.add.container(x, y);
  const track = scene.add.graphics();
  const knob = scene.add.circle(0, 0, TOGGLE_KNOB, 0xffffff);
  knob.setStrokeStyle(2, 0xdfe8df);

  const draw = (): void => {
    track.clear();
    track.fillStyle(enabled ? TOGGLE_ON : TOGGLE_OFF, 1);
    track.fillRoundedRect(
      -TOGGLE_WIDTH / 2,
      -TOGGLE_HEIGHT / 2,
      TOGGLE_WIDTH,
      TOGGLE_HEIGHT,
      TOGGLE_HEIGHT / 2
    );
    track.lineStyle(2, enabled ? 0x145024 : 0x6e6e6e, 1);
    track.strokeRoundedRect(
      -TOGGLE_WIDTH / 2,
      -TOGGLE_HEIGHT / 2,
      TOGGLE_WIDTH,
      TOGGLE_HEIGHT,
      TOGGLE_HEIGHT / 2
    );

    const knobX = enabled
      ? TOGGLE_WIDTH / 2 - TOGGLE_KNOB - 4
      : -TOGGLE_WIDTH / 2 + TOGGLE_KNOB + 4;
    knob.setPosition(knobX, 0);
  };

  draw();
  container.add([track, knob]);

  const hit = scene.add
    .rectangle(0, 0, TOGGLE_WIDTH + 8, TOGGLE_HEIGHT + 8, 0x000000, 0)
    .setInteractive({ useHandCursor: true });
  hit.on('pointerdown', () => {
    enabled = !enabled;
    draw();
    soundManager.playPop();
    onChange(enabled);
  });
  container.add(hit);

  return container;
}
