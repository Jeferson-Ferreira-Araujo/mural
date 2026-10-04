/**
 * Preparar fotos e vídeos no próprio aparelho antes de enviar: as pessoas não têm noção do tamanho do que gravam
 * (um vídeo curto de celular em 4K passa de 100 MB). Aqui o arquivo é reduzido para um tamanho bom para o mural
 * (vídeo até 1280 px de lado, ~2,5 Mbps; foto até 1920 px) mantendo a qualidade visível.
 */

export const MAX_VIDEO_SEC = 60;
const MAX_SIDE = 1280;
const VIDEO_BPS = 2_500_000;
const AUDIO_BPS = 128_000;
/** vídeo menor que isso e já pequeno em resolução: vai como está */
const SMALL_VIDEO_BYTES = 12 * 1024 * 1024;

export type VideoInfo = { duration: number; width: number; height: number };

/** Lê duração e resolução do vídeo sem carregar tudo. */
export function probeVideo(file: File): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      resolve({ duration: v.duration, width: v.videoWidth, height: v.videoHeight });
      URL.revokeObjectURL(url);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler este vídeo."));
    };
    v.src = url;
  });
}

function pickMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const options = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return options.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

/** O navegador sabe reduzir vídeos? (precisa de gravação do canvas + captura de áudio) */
export function canCompressVideo(): boolean {
  return typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && typeof HTMLCanvasElement !== "undefined" && "captureStream" in HTMLCanvasElement.prototype && typeof AudioContext !== "undefined" && !!pickMime();
}

/** Precisa ser reduzido? (arquivo grande ou resolução acima de 720p) */
export function needsCompression(file: File, info: VideoInfo): boolean {
  return file.size > SMALL_VIDEO_BYTES || Math.max(info.width, info.height) > MAX_SIDE;
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/**
 * Reduz o vídeo tocando-o escondido e regravando em resolução menor (leva cerca da duração do vídeo; mostra o progresso).
 * Devolve o arquivo reduzido, ou o original se a redução não ajudar.
 */
export async function compressVideo(file: File, onProgress: (fraction: number) => void, signal?: AbortSignal): Promise<File> {
  const mime = pickMime();
  if (!mime) throw new Error("Este navegador não consegue reduzir o vídeo.");
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.playsInline = true;
  v.preload = "auto";
  v.src = url;
  const ac = new AudioContext();
  try {
    await new Promise<void>((ok, fail) => {
      v.onloadedmetadata = () => ok();
      v.onerror = () => fail(new Error("Não foi possível ler este vídeo."));
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(v.videoWidth, v.videoHeight));
    const w = even(v.videoWidth * scale);
    const h = even(v.videoHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível preparar o vídeo.");

    // imagem do canvas + som do vídeo (o som vai só para a gravação, não para o alto-falante)
    const stream = canvas.captureStream(30);
    try {
      await ac.resume();
      const dest = ac.createMediaStreamDestination();
      ac.createMediaElementSource(v).connect(dest);
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    } catch {
      /* sem áudio: segue só com a imagem */
    }

    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: VIDEO_BPS, audioBitsPerSecond: AUDIO_BPS });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise<void>((ok) => (rec.onstop = () => ok()));

    let alive = true;
    const draw = () => {
      if (!alive) return;
      ctx.drawImage(v, 0, 0, w, h);
      onProgress(Number.isFinite(v.duration) && v.duration > 0 ? Math.min(1, v.currentTime / v.duration) : 0);
    };
    // um temporizador (em vez de requestAnimationFrame) mantém a regravação andando mesmo se a aba perder o foco por instantes
    const ticker = window.setInterval(draw, 1000 / 30);

    const finished = new Promise<void>((ok, fail) => {
      v.onended = () => ok();
      v.onerror = () => fail(new Error("O vídeo parou de tocar."));
      signal?.addEventListener("abort", () => fail(new Error("Cancelado.")));
      // trava de segurança: se o vídeo não andar por 20 s, desiste
      let last = -1;
      const watch = window.setInterval(() => {
        if (!alive) return window.clearInterval(watch);
        if (v.currentTime === last) fail(new Error("O vídeo travou ao ser reduzido."));
        last = v.currentTime;
      }, 20_000);
    });

    rec.start(1000);
    await v.play();
    try {
      await finished;
    } finally {
      alive = false;
      window.clearInterval(ticker);
      if (rec.state !== "inactive") rec.stop();
    }
    await stopped;
    onProgress(1);
    const type = mime.split(";")[0];
    const out = new File(chunks, file.name.replace(/\.[^.]+$/, "") + (type === "video/mp4" ? ".mp4" : ".webm"), { type });
    return out.size > 0 && out.size < file.size ? out : file;
  } finally {
    v.pause();
    URL.revokeObjectURL(url);
    void ac.close().catch(() => undefined);
  }
}

/** Foto grande (câmera do celular): reduz para até 1920 px e comprime em JPEG. Se não der, devolve a original. */
export async function downscalePhoto(file: File): Promise<File> {
  if (file.size < 1.2 * 1024 * 1024 && file.type !== "image/heic") return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 1920 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.86));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
