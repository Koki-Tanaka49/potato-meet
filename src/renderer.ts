import { clamp } from "./geometry";
import type { OverlayPose, PotatoVariant } from "./types";

interface Assets {
  bodies: Record<PotatoVariant, HTMLImageElement>;
  sunglasses: HTMLImageElement;
  mouthClosed: HTMLImageElement;
  mouthOpen: HTMLImageElement;
}

const BODY_PATHS: Record<PotatoVariant, string> = {
  classic: "potato/potato-body.png",
  sweet: "potato/potato-body-sweet.png",
  purple: "potato/potato-body-purple.png"
};

function loadImage(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => reject(new Error(`素材を読み込めません: ${path}`)), { once: true });
    image.src = chrome.runtime.getURL(path);
  });
}

export class PotatoRenderer {
  private variant: PotatoVariant;
  private sunglassesEnabled: boolean;
  private renderCount = 0;

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly context: CanvasRenderingContext2D,
    private readonly assets: Assets,
    variant: PotatoVariant,
    sunglassesEnabled: boolean
  ) {
    this.variant = variant;
    this.sunglassesEnabled = sunglassesEnabled;
    this.canvas.dataset.potatoVariant = variant;
  }

  static async create(variant: PotatoVariant, sunglassesEnabled: boolean): Promise<PotatoRenderer> {
    document.getElementById("potato-meet-overlay")?.remove();
    const canvas = document.createElement("canvas");
    canvas.id = "potato-meet-overlay";
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      pointerEvents: "none",
      zIndex: "2147483646"
    });
    const context = canvas.getContext("2d");
    if (!context) throw new Error("描画用Canvasを作成できませんでした。");
    const [classic, sweet, purple, sunglasses, mouthClosed, mouthOpen] = await Promise.all([
      loadImage(BODY_PATHS.classic),
      loadImage(BODY_PATHS.sweet),
      loadImage(BODY_PATHS.purple),
      loadImage("potato/sunglasses.png"),
      loadImage("potato/mouth-closed.png"),
      loadImage("potato/mouth-open.png")
    ]);
    (document.body ?? document.documentElement).append(canvas);
    const renderer = new PotatoRenderer(
      canvas,
      context,
      { bodies: { classic, sweet, purple }, sunglasses, mouthClosed, mouthOpen },
      variant,
      sunglassesEnabled
    );
    renderer.resize();
    return renderer;
  }

  setVariant(variant: PotatoVariant): void {
    this.variant = variant;
    this.canvas.dataset.potatoVariant = variant;
  }

  setSunglassesEnabled(enabled: boolean): void {
    this.sunglassesEnabled = enabled;
  }

  resize(): void {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(innerWidth * ratio));
    const height = Math.max(1, Math.round(innerHeight * ratio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  draw(poses: OverlayPose[]): void {
    this.context.clearRect(0, 0, innerWidth, innerHeight);
    let staticCount = 0;
    let openMouthCount = 0;
    for (const pose of poses) {
      if (pose.isStatic) staticCount += 1;
      if (pose.mouthOpen) openMouthCount += 1;
    }
    this.renderCount += 1;
    this.canvas.dataset.potatoCount = String(poses.length);
    this.canvas.dataset.staticCount = String(staticCount);
    this.canvas.dataset.openMouthCount = String(openMouthCount);
    this.canvas.dataset.sunglassesCount = String(this.sunglassesEnabled ? poses.length : 0);
    this.canvas.dataset.renderCount = String(this.renderCount);
    for (const pose of poses) this.drawPotato(pose);
  }

  private drawPotato(pose: OverlayPose): void {
    const { context } = this;
    const visibleBottomPadding = Math.min(48, pose.tile.height * 0.18);
    const bottomSafeLeft = Math.min(140, pose.tile.width * 0.36);
    const bottomSafeRight = Math.min(80, pose.tile.width * 0.2);
    context.save();
    context.beginPath();
    context.rect(pose.tile.x, pose.tile.y, pose.tile.width, Math.max(0, pose.tile.height - visibleBottomPadding));
    context.rect(
      pose.tile.x + bottomSafeLeft,
      pose.tile.y + pose.tile.height - visibleBottomPadding,
      Math.max(0, pose.tile.width - bottomSafeLeft - bottomSafeRight),
      visibleBottomPadding
    );
    context.clip();
    context.translate(pose.x, pose.y);
    context.rotate((clamp(pose.roll, -25, 25) * Math.PI) / 180);

    const yawRatio = clamp(pose.yaw / 35, -1, 1);
    const pitchRatio = clamp(pose.pitch / 25, -1, 1);
    const bodyScaleX = 1 - Math.abs(yawRatio) * 0.1;
    context.save();
    context.scale(bodyScaleX, 1);
    context.drawImage(this.assets.bodies[this.variant], -pose.width / 2, -pose.height / 2, pose.width, pose.height);
    context.restore();

    const featureX = yawRatio * pose.width * 0.1;
    const featureY = pitchRatio * pose.height * 0.06;
    if (this.sunglassesEnabled) {
      const sunglassesWidth = pose.width * 0.68;
      const sunglassesAspect = this.assets.sunglasses.naturalHeight / Math.max(1, this.assets.sunglasses.naturalWidth);
      const sunglassesHeight = sunglassesWidth * sunglassesAspect;
      const sunglassesY = -pose.height * 0.13 + featureY * 0.75;
      context.save();
      context.scale(bodyScaleX, 1);
      context.drawImage(
        this.assets.sunglasses,
        featureX / bodyScaleX - sunglassesWidth / 2,
        sunglassesY - sunglassesHeight / 2,
        sunglassesWidth,
        sunglassesHeight
      );
      context.restore();
    }
    const mouth = pose.mouthOpen ? this.assets.mouthOpen : this.assets.mouthClosed;
    const mouthWidth = pose.width * (pose.mouthOpen ? 0.34 : 0.3);
    const aspect = mouth.naturalHeight / Math.max(1, mouth.naturalWidth);
    const mouthHeight = mouthWidth * aspect;
    const mouthY = pose.height * 0.2 + featureY;
    context.drawImage(
      mouth,
      featureX - mouthWidth / 2,
      mouthY - mouthHeight / 2,
      mouthWidth,
      mouthHeight
    );
    context.restore();
  }

  destroy(): void {
    this.context.clearRect(0, 0, innerWidth, innerHeight);
    this.canvas.remove();
  }
}
