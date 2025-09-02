declare module 'vue-img-viewr' {
  interface ShowImagesOptions {
    urls: string[];
    index?: number;
    toolbar?: boolean;
    navbar?: boolean;
    title?: boolean;
    keyboard?: boolean;
    movable?: boolean;
    zoomable?: boolean;
    rotatable?: boolean;
    scalable?: boolean;
    transition?: boolean;
    fullscreen?: boolean;
    zIndex?: number;
    onSwitch?: (index: number) => void;
    onClose?: () => void;
    onShow?: (isShow: boolean) => void;
  }

  export function showImages(options: ShowImagesOptions): void;
}
