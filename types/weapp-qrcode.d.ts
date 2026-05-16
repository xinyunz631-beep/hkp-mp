declare module 'weapp-qrcode' {
  interface DrawQrcodeOptions {
    width: number;
    height: number;
    canvasId: string;
    text: string;
    background?: string;
    foreground?: string;
    correctLevel?: number;
    callback?: (result: unknown) => void;
  }

  export default function drawQrcode(options: DrawQrcodeOptions): void;
}
